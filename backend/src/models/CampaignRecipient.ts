import mongoose, { Schema, Document } from 'mongoose';

export type RecipientStatus = 'pending' | 'sent' | 'failed';

export interface ICampaignRecipient extends Document {
    storeId: mongoose.Types.ObjectId;
    campaignRunId: mongoose.Types.ObjectId;
    contactId: mongoose.Types.ObjectId;
    email: string;
    status: RecipientStatus;
    errorMessage?: string;
    providerMessageId?: string;
    sentAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CampaignRecipientSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        campaignRunId: { type: Schema.Types.ObjectId, ref: 'CampaignRun', required: true },
        contactId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        status: { 
            type: String, 
            enum: ['pending', 'sent', 'failed'], 
            default: 'pending' 
        },
        errorMessage: { type: String },
        providerMessageId: { type: String },
        sentAt: { type: Date }
    },
    { timestamps: true }
);

// Indexes
CampaignRecipientSchema.index({ campaignRunId: 1, contactId: 1 }, { unique: true });
CampaignRecipientSchema.index({ campaignRunId: 1, status: 1 });
CampaignRecipientSchema.index({ storeId: 1, campaignRunId: 1 });

export default mongoose.model<ICampaignRecipient>('CampaignRecipient', CampaignRecipientSchema);
