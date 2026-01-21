import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
    name: string;
    price: number;
    features: string[];
    duration: number; // in days
    maxStores: number; // NEW: Maximum stores allowed
    productLimit: number; // Per store
}

const SubscriptionPlanSchema: Schema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    features: [{ type: String }],
    duration: { type: Number, required: true, default: 30 },
    maxStores: { type: Number, required: true, default: 1 },
    productLimit: { type: Number, required: true },
});

export default mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
