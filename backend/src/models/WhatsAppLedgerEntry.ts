import mongoose, { Schema, Document } from 'mongoose';

export type WhatsAppLedgerEntryType = 'monthly_grant' | 'purchase' | 'transactional_debit' | 'correction' | 'expired';

export interface IWhatsAppLedgerEntry extends Document {
    storeId: mongoose.Types.ObjectId;
    type: WhatsAppLedgerEntryType;
    amount: number;
    referenceId?: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * A deliberate duplicate of EmailLedgerEntry (see WhatsAppCreditAccount's
 * doc comment for why) — same immutability guarantees, same shape, one
 * fewer type for now (no campaign/marketing debit type yet — Phase 1 only
 * ever sends transactional order notifications over this channel).
 */
const WhatsAppLedgerEntrySchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        type: {
            type: String,
            enum: ['monthly_grant', 'purchase', 'transactional_debit', 'correction', 'expired'],
            required: true
        },
        amount: { type: Number, required: true },
        referenceId: { type: String },
        description: { type: String, required: true }
    },
    { timestamps: true }
);

// Prevent updates/deletions at Mongoose middleware level to enforce ledger immutability — same billing-compliance lock as EmailLedgerEntry.
const preventMutation = function (this: any) {
    throw new Error('Cannot mutate or delete ledger transaction entries (Billing compliance lock)');
};

WhatsAppLedgerEntrySchema.pre('updateOne', preventMutation);
WhatsAppLedgerEntrySchema.pre('updateMany', preventMutation);
WhatsAppLedgerEntrySchema.pre('findOneAndUpdate', preventMutation);
WhatsAppLedgerEntrySchema.pre('deleteOne', preventMutation);
WhatsAppLedgerEntrySchema.pre('deleteMany', preventMutation);
WhatsAppLedgerEntrySchema.pre('findOneAndDelete', preventMutation);
WhatsAppLedgerEntrySchema.pre('save', function (this: any) {
    if (!this.isNew) {
        throw new Error('Cannot modify existing ledger transaction records');
    }
});

WhatsAppLedgerEntrySchema.index({ storeId: 1, createdAt: -1 });

export default mongoose.model<IWhatsAppLedgerEntry>('WhatsAppLedgerEntry', WhatsAppLedgerEntrySchema);
