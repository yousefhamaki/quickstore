import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletLedger extends Document {
    merchantId: mongoose.Types.ObjectId;
    type: 'credit' | 'debit';
    amount: number;
    reason: string; // e.g. 'order_commission', 'manual_adjustment', 'subscription_purchase'
    referenceId?: mongoose.Types.ObjectId; // e.g. OrderId, ReceiptId, SubscriptionId
    balanceAfter: number;
    createdAt: Date;
}

const WalletLedgerSchema = new Schema({
    merchantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: true },
    referenceId: { type: Schema.Types.ObjectId },
    balanceAfter: { type: Number, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model<IWalletLedger>('WalletLedger', WalletLedgerSchema);
