import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
    storeId: mongoose.Types.ObjectId;
    name: string;
    subject: string;
    content: string; // HTML Template markup
    status: 'draft' | 'scheduled' | 'sent' | 'archived';
    segmentFilters: {
        tags?: string[];
        consentStatus?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const CampaignSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        name: { type: String, required: true },
        subject: { type: String, required: true },
        content: { type: String, required: true },
        status: { 
            type: String, 
            enum: ['draft', 'scheduled', 'sent', 'archived'], 
            default: 'draft' 
        },
        segmentFilters: {
            tags: [{ type: String }],
            consentStatus: { type: String, default: 'subscribed' }
        }
    },
    { timestamps: true }
);

// Indexes
CampaignSchema.index({ storeId: 1, status: 1 });

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);
