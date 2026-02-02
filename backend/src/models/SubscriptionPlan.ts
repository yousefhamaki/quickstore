import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
    name: string;
    name_en: string;
    name_ar: string;
    description_en: string;
    description_ar: string;
    price: number;
    monthlyPrice?: number; // Alias for price
    currency: string;
    features_en: string[]; // List of feature descriptions for UI
    features_ar: string[]; // List of feature descriptions for UI
    features?: {
        dropshipping: boolean;
        customDomain: boolean;
    }; // Logic-based features
    duration: number; // in days
    maxStores: number;
    storeLimit?: number; // Alias for maxStores
    productLimit: number; // Per store, -1 for unlimited
    orderFee: number; // Transaction fee per order
    isActive: boolean;
    type: 'free' | 'paid';
}

const SubscriptionPlanSchema: Schema = new Schema({
    name: { type: String, required: true },
    name_en: { type: String },
    name_ar: { type: String },
    description_en: { type: String },
    description_ar: { type: String },
    price: { type: Number },
    monthlyPrice: { type: Number },
    currency: { type: String, default: 'EGP' },
    features_en: [{ type: String }],
    features_ar: [{ type: String }],
    features: {
        dropshipping: { type: Boolean, default: false },
        customDomain: { type: Boolean, default: false }
    },
    duration: { type: Number, required: true, default: 30 },
    maxStores: { type: Number, default: 1 },
    storeLimit: { type: Number },
    productLimit: { type: Number, required: true }, // -1 for unlimited
    orderFee: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    type: { type: String, enum: ['free', 'paid'], required: true, default: 'paid' },
}, { timestamps: true });

// Sync aliases
SubscriptionPlanSchema.pre<ISubscriptionPlan>('save', function () {
    if (this.price !== undefined && this.monthlyPrice === undefined) this.monthlyPrice = this.price;
    if (this.monthlyPrice !== undefined && this.price === undefined) this.price = this.monthlyPrice;

    if (this.maxStores !== undefined && this.storeLimit === undefined) this.storeLimit = this.maxStores;
    if (this.storeLimit !== undefined && this.maxStores === undefined) this.maxStores = this.storeLimit;
});

export default mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
