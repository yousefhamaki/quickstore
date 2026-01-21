import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
    name: string;
    type: 'free' | 'paid';
    monthlyPrice: number;
    storeLimit: number;
    productLimit: number;
    orderFee: number;
    features: {
        dropshipping: boolean;
        customDomain: boolean;
    };
    isActive: boolean;
}

const PlanSchema: Schema = new Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['free', 'paid'], required: true },
    monthlyPrice: { type: Number, default: 0 },
    storeLimit: { type: Number, required: true }, // -1 for unlimited
    productLimit: { type: Number, required: true }, // -1 for unlimited
    orderFee: { type: Number, default: 0.5 },
    features: {
        dropshipping: { type: Boolean, default: false },
        customDomain: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<IPlan>('Plan', PlanSchema);
