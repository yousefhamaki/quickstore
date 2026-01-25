import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
    name_en: string;
    name_ar: string;
    description_en: string;
    description_ar: string;
    price: number;
    currency: string;
    features_en: string[];
    features_ar: string[];
    duration: number; // in days
    maxStores: number; // Maximum stores allowed
    productLimit: number; // Per store
    isActive: boolean;
    type: 'free' | 'paid';
}

const SubscriptionPlanSchema: Schema = new Schema({
    name_en: { type: String, required: true },
    name_ar: { type: String, required: true },
    description_en: { type: String },
    description_ar: { type: String },
    price: { type: Number, required: true },
    currency: { type: String, default: 'EGP' },
    features_en: [{ type: String }],
    features_ar: [{ type: String }],
    duration: { type: Number, required: true, default: 30 },
    maxStores: { type: Number, required: true, default: 1 },
    productLimit: { type: Number, required: true }, // -1 for unlimited
    isActive: { type: Boolean, default: true },
    type: { type: String, enum: ['free', 'paid'], required: true, default: 'paid' },
}, { timestamps: true });

export default mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
