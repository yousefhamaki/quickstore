import mongoose, { Schema, Document } from 'mongoose';

export type RunStatus = 'scheduled' | 'quota_reserved' | 'preparing_recipients' | 'queued' | 'sending' | 'completed' | 'failed' | 'cancelled';

export interface ICampaignRun extends Document {
    campaignId: mongoose.Types.ObjectId;
    storeId: mongoose.Types.ObjectId;
    status: RunStatus;
    totalRecipients: number;
    emailsDispatched: number;
    emailsDelivered: number;
    emailsBounced: number;
    scheduledAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CampaignRunSchema: Schema = new Schema(
    {
        campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        status: { 
            type: String, 
            enum: ['scheduled', 'quota_reserved', 'preparing_recipients', 'queued', 'sending', 'completed', 'failed', 'cancelled'], 
            default: 'scheduled' 
        },
        totalRecipients: { type: Number, default: 0 },
        emailsDispatched: { type: Number, default: 0 },
        emailsDelivered: { type: Number, default: 0 },
        emailsBounced: { type: Number, default: 0 },
        scheduledAt: { type: Date },
        startedAt: { type: Date },
        completedAt: { type: Date },
        errorMessage: { type: String }
    },
    { timestamps: true }
);

CampaignRunSchema.index({ storeId: 1, status: 1 });
CampaignRunSchema.index({ campaignId: 1, createdAt: -1 });

export default mongoose.model<ICampaignRun>('CampaignRun', CampaignRunSchema);
