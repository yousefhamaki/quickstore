import mongoose, { Schema, Document } from 'mongoose';

export type ReservationStatus = 'pending' | 'partially_consumed' | 'fully_consumed' | 'released' | 'expired';

export interface IEmailCreditReservation extends Document {
    storeId: mongoose.Types.ObjectId;
    campaignRunId: mongoose.Types.ObjectId;
    status: ReservationStatus;
    creditsReserved: number;
    creditsConsumed: number;
    creditsRefunded: number;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EmailCreditReservationSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        campaignRunId: { type: Schema.Types.ObjectId, ref: 'CampaignRun', required: true },
        status: { 
            type: String, 
            enum: ['pending', 'partially_consumed', 'fully_consumed', 'released', 'expired'], 
            default: 'pending' 
        },
        creditsReserved: { type: Number, required: true },
        creditsConsumed: { type: Number, default: 0 },
        creditsRefunded: { type: Number, default: 0 },
        expiresAt: { type: Date, required: true }
    },
    { timestamps: true }
);

// Indexes
EmailCreditReservationSchema.index({ storeId: 1, campaignRunId: 1 }, { unique: true });
EmailCreditReservationSchema.index({ expiresAt: 1, status: 1 });

export default mongoose.model<IEmailCreditReservation>('EmailCreditReservation', EmailCreditReservationSchema);
