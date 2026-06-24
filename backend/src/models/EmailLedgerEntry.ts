import mongoose, { Schema, Document } from 'mongoose';

export type LedgerEntryType = 'monthly_grant' | 'purchase' | 'campaign_debit' | 'bounce_refund' | 'correction';

export interface IEmailLedgerEntry extends Document {
    storeId: mongoose.Types.ObjectId;
    type: LedgerEntryType;
    amount: number;
    referenceId?: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

const EmailLedgerEntrySchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        type: { 
            type: String, 
            enum: ['monthly_grant', 'purchase', 'campaign_debit', 'bounce_refund', 'correction'], 
            required: true 
        },
        amount: { type: Number, required: true },
        referenceId: { type: String },
        description: { type: String, required: true }
    },
    { timestamps: true }
);

// Prevent updates/deletions at Mongoose middleware level to enforce ledger immutability
const preventMutation = function (this: any) {
    throw new Error('Cannot mutate or delete ledger transaction entries (Billing compliance lock)');
};

EmailLedgerEntrySchema.pre('updateOne', preventMutation);
EmailLedgerEntrySchema.pre('updateMany', preventMutation);
EmailLedgerEntrySchema.pre('findOneAndUpdate', preventMutation);
EmailLedgerEntrySchema.pre('deleteOne', preventMutation);
EmailLedgerEntrySchema.pre('deleteMany', preventMutation);
EmailLedgerEntrySchema.pre('findOneAndDelete', preventMutation);
EmailLedgerEntrySchema.pre('save', function (this: any) {
    if (!this.isNew) {
        throw new Error('Cannot modify existing ledger transaction records');
    }
});

// Indexes for high scale queries
EmailLedgerEntrySchema.index({ storeId: 1, createdAt: -1 });

export default mongoose.model<IEmailLedgerEntry>('EmailLedgerEntry', EmailLedgerEntrySchema);
