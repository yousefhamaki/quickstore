import mongoose, { Schema, Document } from 'mongoose';
import type { OfferType } from './OfferCampaign';

export interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    variantId?: mongoose.Types.ObjectId;
    name: string;
    variant?: string;
    quantity: number;
    price: number;
    /**
     * Snapshot of the product's costPerItem at the moment this order was
     * placed (see publicOrderController.createPublicOrder) — mirrors how
     * `price` is already snapshotted, so a merchant editing costPerItem
     * later can't silently rewrite historical profit numbers. Only one cost
     * field exists at the product level (not per-variant), so this applies
     * regardless of which variant was ordered. Undefined/null on orders
     * placed before this field existed, or when the product had no
     * costPerItem set — see analyticsController.ts for how that's handled.
     */
    costAtPurchase?: number;
    /**
     * Snapshot of the optional paid add-ons (Product.extras) selected for
     * this line, by name + authoritative price at purchase time — same
     * validate-then-snapshot treatment as `price` (see
     * publicOrderController.createPublicOrder): a client can request an
     * extra by _id, but never dictate its price. Their prices are folded
     * into `price` above (so existing quantity*price revenue math — cart
     * totals, analytics — picks them up automatically); this array is only
     * a breakdown/audit trail of what was actually included. Extras have no
     * cost concept, so they never affect costAtPurchase/profit — pure
     * add-on revenue.
     */
    extras?: { name: string; price: number }[];
    image?: string;
}

/**
 * Attribution record written when a shopper accepts a UCD offer.
 * Append-only — one entry per accepted campaign on this order.
 * Powers per-campaign revenue and ROI analytics without needing
 * to join back to the OfferImpression collection at query time.
 */

export interface IOfferAttribution {
    campaignId: mongoose.Types.ObjectId;
    impressionId?: mongoose.Types.ObjectId;
    offerType: OfferType;
    revenueAdded: number;
    savedAmount: number;
    acceptedAt: Date;
    campaignRevenue: number;
    discountAmount: number;
    revenueSource?: 'order' | 'upsell' | 'bogo' | 'threshold' | 'bundle';
    analyticsReversed?: boolean;
    attributionVersion: number;
    placement?: 'product_page' | 'cart' | 'checkout' | 'post_purchase' | 'standalone';
    campaignName?: string;
    tierQuantity?: number;
    tierPrice?: number;
    productId?: mongoose.Types.ObjectId;
    productName?: string;
    productSKU?: string;
    variantId?: mongoose.Types.ObjectId;
    variantName?: string;
    shippingFee?: number;
    orderSource?: 'storefront_checkout' | 'offer_page';
}

export interface IOrderTimeline {
    status: string;
    timestamp: Date;
    note?: string;
}

/**
 * One refund event. An order can accumulate several — e.g. a partial
 * goodwill refund (see issuePartialRefund) followed later by a full
 * cancellation (see updateOrderStatus) — so these live in an array
 * (IOrder.refunds) rather than a single slot. `sum(refunds[].amount)`
 * always equals `IOrder.refundedAmount`.
 */
export interface IOrderRefund {
    amount: number;
    reason: string;
    refundedAt: Date;
    refundedBy: mongoose.Types.ObjectId;
}

export interface IOrderAddress {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

export interface IOrder extends Document {
    storeId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    orderNumber: string;
    items: IOrderItem[];
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'partially_refunded' | 'refunded';
    paymentMethod: string;
    transactionId?: string;
    shippingProvider?: string;
    trackingNumber?: string;
    trackingUrl?: string; // Customer-facing carrier tracking page — set automatically for API-integrated providers, or pasted in manually by the merchant for local/self-managed shipping
    waybillUrl?: string; // Automatically populated AWB PDF location
    shippingStatus?: 'pending' | 'ready_for_pickup' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';
    shippingAddress: IOrderAddress;
    billingAddress: IOrderAddress;
    customerNote?: string;
    merchantNote?: string;
    couponCode?: string;
    transactionFee: number;
    timeline: IOrderTimeline[];
    /**
     * UCD offer attribution records. Each entry represents one accepted
     * offer campaign. Written atomically alongside the order item mutation
     * in offerController.accept. Max ~10 entries per order in practice.
     */
    offerAttribution?: IOfferAttribution[];
    /** History of every refund event on this order — see IOrderRefund. */
    refunds: IOrderRefund[];
    /** Running total of all refunds[].amount — never exceeds `total`. */
    refundedAmount: number;
    /**
     * Running total of the platform order-fee already reversed back to the
     * merchant's wallet, across BOTH a partial refund (issuePartialRefund)
     * and the full cancel/refund transition (updateOrderStatus) — without
     * this shared counter, an order that got a partial refund and was
     * later fully cancelled would have its fee reversed twice.
     */
    feeReversedAmount: number;
    /**
     * Set the first time this order transitions into 'cancelled' OR
     * 'refunded', whichever comes first — guards the coupon-usage reversal,
     * inventory release, campaign-analytics reversal, and store.stats
     * reversal so they only ever fire once per order (e.g. pending ->
     * cancelled -> refunded must not release inventory twice). Fee and
     * revenue reversal amounts are separately guarded by feeReversedAmount
     * and refundedAmount so a prior partial refund is correctly accounted
     * for even though those are shared with this same transition.
     */
    refundSideEffectsApplied?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        orderNumber: { type: String, required: true },
        items: [
            {
                productId: { type: Schema.Types.ObjectId, ref: 'Product' },
                variantId: { type: Schema.Types.ObjectId },
                name: { type: String, required: true },
                variant: { type: String },
                quantity: { type: Number, required: true },
                price: { type: Number, required: true },
                costAtPurchase: { type: Number },
                extras: [
                    {
                        _id: false,
                        name: { type: String },
                        price: { type: Number },
                    },
                ],
                image: { type: String },
            },
        ],
        subtotal: { type: Number, required: true },
        shipping: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, required: true },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
            default: 'pending',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'partially_refunded', 'refunded'],
            default: 'pending',
        },
        paymentMethod: { type: String, required: true },
        transactionId: { type: String },
        shippingProvider: { type: String },
        trackingNumber: { type: String },
        trackingUrl: { type: String },
        waybillUrl: { type: String },
        shippingStatus: {
            type: String,
            enum: ['pending', 'ready_for_pickup', 'picked_up', 'in_transit', 'delivered', 'returned'],
            default: 'pending',
        },
        shippingAddress: {
            fullName: { type: String },
            phone: { type: String },
            address: { type: String },
            city: { type: String },
            state: { type: String },
            postalCode: { type: String },
            country: { type: String },
        },
        billingAddress: {
            fullName: { type: String },
            phone: { type: String },
            address: { type: String },
            city: { type: String },
            state: { type: String },
            postalCode: { type: String },
            country: { type: String },
        },
        customerNote: { type: String },
        merchantNote: { type: String },
        couponCode: { type: String },
        transactionFee: { type: Number, default: 0 },
        timeline: [
            {
                status: { type: String },
                timestamp: { type: Date, default: Date.now },
                note: { type: String },
            }
        ],
        offerAttribution: [
            {
                campaignId: {
                    type: Schema.Types.ObjectId,
                    ref: 'OfferCampaign',
                    required: true,
                },
                impressionId: {
                    type: Schema.Types.ObjectId,
                    ref: 'OfferImpression',
                    required: false,
                },
                offerType: {
                    type: String,
                    enum: ['upsell', 'cross_sell', 'down_sell', 'offer_page', 'volume_discount', 'bogo', 'cart_threshold'],
                    required: true,
                },
                revenueAdded: { type: Number, required: true, min: 0 },
                savedAmount: { type: Number, default: 0, min: 0 },
                campaignRevenue: { type: Number, required: true, default: 0 },
                discountAmount: { type: Number, required: true, default: 0 },
                revenueSource: { type: String, enum: ['order', 'upsell', 'bogo', 'threshold', 'bundle'] },
                analyticsReversed: { type: Boolean, default: false },
                attributionVersion: { type: Number, default: 1 },
                placement: { type: String, enum: ['product_page', 'cart', 'checkout', 'post_purchase', 'standalone'] },
                acceptedAt: { type: Date, default: Date.now },
                campaignName: { type: String },
                tierQuantity: { type: Number },
                tierPrice: { type: Number },
                productId: { type: Schema.Types.ObjectId, ref: 'Product' },
                productName: { type: String },
                productSKU: { type: String },
                variantId: { type: Schema.Types.ObjectId },
                variantName: { type: String },
                shippingFee: { type: Number },
                orderSource: { type: String, enum: ['storefront_checkout', 'offer_page'] },
            },
        ],
        refunds: [{
            amount: { type: Number, required: true },
            reason: { type: String, required: true },
            refundedAt: { type: Date, default: Date.now },
            refundedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        }],
        refundedAmount: { type: Number, default: 0 },
        feeReversedAmount: { type: Number, default: 0 },
        refundSideEffectsApplied: { type: Boolean, default: false },
    },
    { timestamps: true }
);

OrderSchema.index({ storeId: 1, customerId: 1 });
OrderSchema.index({ storeId: 1, status: 1, paymentStatus: 1 });
OrderSchema.index({ storeId: 1, createdAt: -1 });
OrderSchema.index({ storeId: 1, orderNumber: 1 }, { unique: true });

export default mongoose.model<IOrder>('Order', OrderSchema);
