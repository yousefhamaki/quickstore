import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppCreditAccount extends Document {
    storeId: mongoose.Types.ObjectId;
    balance: number;          // total available (planBalance + purchasedBalance)
    planBalance: number;      // plan allowance remaining, refreshed on a rolling 30-day cycle
    purchasedBalance: number; // purchased add-on balance remaining, never expires
    reserved: number;
    lastRefreshedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * A deliberate, near-exact duplicate of EmailAccount — kept separate
 * rather than adding a `channel` discriminator to the email version,
 * because EmailAccount.storeId carries a live production unique index that
 * would need a careful migration to become a compound {storeId,channel}
 * index for zero functional gain right now. Unifying the two is a
 * reasonable future refactor once WhatsApp is proven, not before.
 */
const WhatsAppCreditAccountSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
        balance: { type: Number, default: 0 },
        planBalance: { type: Number, default: 0 },
        purchasedBalance: { type: Number, default: 0 },
        reserved: { type: Number, default: 0 },
        lastRefreshedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

WhatsAppCreditAccountSchema.index({ storeId: 1 }, { unique: true });

export default mongoose.model<IWhatsAppCreditAccount>('WhatsAppCreditAccount', WhatsAppCreditAccountSchema);
