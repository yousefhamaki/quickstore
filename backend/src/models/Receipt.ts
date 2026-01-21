import mongoose, { Schema, Document } from 'mongoose';

export interface IReceipt extends Document {
    userId: mongoose.Types.ObjectId;
    referenceId: mongoose.Types.ObjectId; // Link to the actual entity (Order or Transaction)
    type: 'order' | 'wallet_recharge';
    amount: number;
    currency: string;
    issuedAt: Date;
}

const ReceiptSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['order', 'wallet_recharge'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'EGP' },
    issuedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IReceipt>('Receipt', ReceiptSchema);
