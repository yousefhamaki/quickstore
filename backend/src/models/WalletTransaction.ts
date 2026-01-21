import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletTransaction extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'credit' | 'debit';
    amount: number;
    reason: 'order_fee' | 'plan_payment' | 'recharge';
    referenceId?: mongoose.Types.ObjectId; // Might refer to Order, Subscription, or Payment
    createdAt: Date;
}

const WalletTransactionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, enum: ['order_fee', 'plan_payment', 'recharge'], required: true },
    referenceId: { type: Schema.Types.ObjectId }
}, { timestamps: true });

export default mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);
