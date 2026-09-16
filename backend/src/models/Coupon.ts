import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
    storeId: mongoose.Types.ObjectId;
    code: string;
    type: 'percentage' | 'fixed' | 'free_shipping';
    value: number;
    maxUsage: number;
    usageCount: number;
    minOrderAmount?: number;
    expiresAt?: Date;
    isActive: boolean;
    /**
     * When true, this coupon is a candidate for automatic application at
     * checkout (no code entry required) once its own eligibility checks
     * (isActive/expiresAt/maxUsage/minOrderAmount/restrictedToCustomerEmail)
     * are met — see utils/couponPricing.ts's findBestAutoApplyCoupon, used by
     * both publicController.getAutoApplyCoupon (storefront display) and
     * publicOrderController.createPublicOrder (authoritative re-check).
     * Never stacked with another auto-apply coupon — only the single best
     * one (by resulting discount) is ever chosen.
     */
    autoApply: boolean;
    /**
     * When set, only an order whose customer email matches (case-insensitive)
     * may use this coupon — how a post-delivery personal voucher (see
     * Store.settings.postPurchaseVoucher and orderController.updateOrderStatus)
     * is scoped to the one customer it was issued to. Undefined/absent for a
     * normal, store-wide coupon a merchant creates by hand.
     */
    restrictedToCustomerEmail?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CouponSchema: Schema = new Schema({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percentage', 'fixed', 'free_shipping'], required: true },
    value: { type: Number, default: 0 },
    maxUsage: { type: Number, default: -1 }, // -1 for unlimited
    usageCount: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    autoApply: { type: Boolean, default: false },
    restrictedToCustomerEmail: { type: String, lowercase: true, trim: true }
}, { timestamps: true });

// Ensure unique coupon code per store
CouponSchema.index({ storeId: 1, code: 1 }, { unique: true });

export default mongoose.model<ICoupon>('Coupon', CouponSchema);
