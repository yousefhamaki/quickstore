import mongoose, { Schema, Document } from 'mongoose';

export interface IBillingProfile extends Document {
    userId: mongoose.Types.ObjectId;
    customerName: string;
    billingEmail: string;
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    taxId?: string;
    paymentMethods: {
        type: 'card' | 'bank_transfer' | 'manual';
        last4?: string;
        brand?: string;
        isDefault: boolean;
    }[];
}

const BillingProfileSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    customerName: { type: String, required: true },
    billingEmail: { type: String, required: true },
    address: {
        line1: { type: String },
        line2: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String, default: 'Egypt' }
    },
    taxId: { type: String },
    paymentMethods: [{
        type: { type: String, enum: ['card', 'bank_transfer', 'manual'], default: 'manual' },
        last4: { type: String },
        brand: { type: String },
        isDefault: { type: Boolean, default: false }
    }]
}, { timestamps: true });

export default mongoose.model<IBillingProfile>('BillingProfile', BillingProfileSchema);
