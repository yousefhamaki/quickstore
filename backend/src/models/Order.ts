import mongoose, { Schema, Document } from 'mongoose';
import type { OfferType } from './OfferCampaign';

export interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    variantId?: mongoose.Types.ObjectId;
    name: string;
    variant?: string;
    quantity: number;
    price: number;
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
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod: string;
    transactionId?: string;
    shippingProvider?: string;
    trackingNumber?: string;
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
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        paymentMethod: { type: String, required: true },
        transactionId: { type: String },
        shippingProvider: { type: String },
        trackingNumber: { type: String },
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
    },
    { timestamps: true }
);

OrderSchema.index({ storeId: 1, customerId: 1 });
OrderSchema.index({ storeId: 1, status: 1, paymentStatus: 1 });
OrderSchema.index({ storeId: 1, createdAt: -1 });
OrderSchema.index({ storeId: 1, orderNumber: 1 }, { unique: true });

export default mongoose.model<IOrder>('Order', OrderSchema);
