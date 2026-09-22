import mongoose, { Schema, Document } from 'mongoose';

/**
 * WalletLedger — CANONICAL single source of truth for every wallet balance
 * movement in the platform (signup gift, plan payment/upgrade, wallet
 * recharge, order fee, email add-on purchase, admin adjustment, ...).
 *
 * Every write MUST include the balance-after snapshot so the ledger can be
 * reconciled/audited without replaying history. `reason` is intentionally a
 * free string (not a Mongoose enum) so a new reason can never crash a write
 * the way the old WalletTransaction enum did — but every writer should use
 * one of the canonical values in `constants/walletLedgerReasons.ts` so the
 * admin/merchant UI can filter and label entries consistently. Free-text
 * detail (e.g. an admin's manual-adjustment note) belongs in `note`, not in
 * `reason`.
 *
 * NOTE: `WalletTransaction` is deprecated in favor of this model — see that
 * file for details. Do not add new writes/reads against WalletTransaction.
 */
export interface IWalletLedger extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'credit' | 'debit';
    amount: number;
    reason: string; // canonical category, see constants/walletLedgerReasons.ts
    note?: string; // optional free-text human detail (e.g. admin's adjustment note)
    referenceId?: mongoose.Types.ObjectId; // e.g. OrderId, ReceiptId, SubscriptionId
    balanceAfter: number;
    createdAt: Date;
}

const WalletLedgerSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    // min 0 (not 0.01) specifically to allow a single deliberate exception:
    // services/platformConfigService.ts's markSignupGiftNotApplicable writes
    // a reason:'gift', amount:0 row to mark an account (created via staff
    // invite, not an independent signup) as ineligible for the real signup
    // gift, reusing this model's own {userId, reason:'gift'} uniqueness
    // guard below instead of adding a new field elsewhere. Every other
    // writer still writes a real positive amount.
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, index: true },
    note: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    balanceAfter: { type: Number, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

// --- Signup-gift idempotency guard -----------------------------------------
// Structural (DB-level) guarantee that a user can never receive the signup
// gift ledger credit twice, mirroring how Wallet.userId's unique index blocks
// duplicate wallets. Partial so it only applies to reason: 'gift' entries —
// every other reason may legitimately recur per user (recharges, order fees,
// plan payments, ...). See services/platformConfigService.ts.
WalletLedgerSchema.index(
    { userId: 1, reason: 1 },
    { unique: true, partialFilterExpression: { reason: 'gift' } }
);

export default mongoose.model<IWalletLedger>('WalletLedger', WalletLedgerSchema);
