import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
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
    name_en: { type: String, required: true },
    name_ar: { type: String, required: true },
    description_en: { type: String },
    description_ar: { type: String },
    price: { type: Number, required: true },
    monthlyPrice: { type: Number }, // To be synced with price in pre-save or just used directly
    currency: { type: String, default: 'EGP' },
    features_en: [{ type: String }],
    features_ar: [{ type: String }],
    features: {
        dropshipping: { type: Boolean, default: false },
        customDomain: { type: Boolean, default: false }
    },
    duration: { type: Number, required: true, default: 30 },
    maxStores: { type: Number, required: true, default: 1 },
    storeLimit: { type: Number }, // To be synced with maxStores
    productLimit: { type: Number, required: true }, // -1 for unlimited
    orderFee: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    type: { type: String, enum: ['free', 'paid'], required: true, default: 'paid' },
}, { timestamps: true });

// Sync aliases
SubscriptionPlanSchema.pre<ISubscriptionPlan>('save', function () {
    if (this.price !== undefined) (this as any).monthlyPrice = this.price;
    if (this.maxStores !== undefined) (this as any).storeLimit = this.maxStores;
});

export default mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
