import mongoose, { Schema, Document } from 'mongoose';

export type EmailEventType = 'sent' | 'delivered' | 'open' | 'click' | 'bounce' | 'complaint' | 'unsubscribe';
export type EmailProviderType = 'ses' | 'sendgrid' | 'resend' | 'mailgun';

export interface IEmailEvent extends Document {
    storeId: mongoose.Types.ObjectId;
    campaignRunId: mongoose.Types.ObjectId;
    contactId: mongoose.Types.ObjectId;
    recipientEmail: string;
    event: EmailEventType;
    provider: EmailProviderType;
    providerMessageId: string;
    deliveryMetadata?: {
        smtpStatusCode?: number;
        bounceType?: 'hard' | 'soft' | 'transient';
        bounceSubType?: string;
        diagnosticCode?: string;
    };
    ipAddress?: string;
    userAgent?: string;
    linkUrl?: string;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EmailEventSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        campaignRunId: { type: Schema.Types.ObjectId, ref: 'CampaignRun', required: true },
        contactId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        recipientEmail: { type: String, required: true, trim: true, lowercase: true },
        event: { 
            type: String, 
            enum: ['sent', 'delivered', 'open', 'click', 'bounce', 'complaint', 'unsubscribe'], 
            required: true 
        },
        provider: { 
            type: String, 
            enum: ['ses', 'sendgrid', 'resend', 'mailgun'], 
            required: true 
        },
        providerMessageId: { type: String, required: true },
        deliveryMetadata: {
            smtpStatusCode: { type: Number },
            bounceType: { type: String, enum: ['hard', 'soft', 'transient'] },
            bounceSubType: { type: String },
            diagnosticCode: { type: String }
        },
        ipAddress: { type: String },
        userAgent: { type: String },
        linkUrl: { type: String },
        timestamp: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

// Indexes
EmailEventSchema.index({ storeId: 1, campaignRunId: 1 });
EmailEventSchema.index({ providerMessageId: 1 });
EmailEventSchema.index({ contactId: 1 });
EmailEventSchema.index({ event: 1 });

export default mongoose.model<IEmailEvent>('EmailEvent', EmailEventSchema);
