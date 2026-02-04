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
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure unique coupon code per store
CouponSchema.index({ storeId: 1, code: 1 }, { unique: true });

export default mongoose.model<ICoupon>('Coupon', CouponSchema);
