import mongoose, { Schema, Document } from 'mongoose';

/**
 * @deprecated Superseded by `WalletLedger` (see models/WalletLedger.ts),
 * which is now the single source of truth for wallet money movements. This
 * model is kept ONLY so historical documents already written before the
 * consolidation remain readable/auditable — do not create new documents
 * against it and do not query it for new features. Its `reason` enum below
 * is also known to be incomplete (it does not include every reason that was
 * historically written, e.g. 'addon_purchase'), which is part of why it was
 * replaced.
 */
export interface IWalletTransaction extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'credit' | 'debit';
    amount: number;
    reason: 'order_fee' | 'plan_payment' | 'recharge' | 'gift' | 'admin_adjustment';
    referenceId?: mongoose.Types.ObjectId; // Might refer to Order, Subscription, or Payment
    createdAt: Date;
}

const WalletTransactionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, enum: ['order_fee', 'plan_payment', 'recharge', 'gift', 'admin_adjustment'], required: true },
    referenceId: { type: Schema.Types.ObjectId }
}, { timestamps: true });

export default mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);
