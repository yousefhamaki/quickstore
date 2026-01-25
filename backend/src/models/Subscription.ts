import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    status: 'inactive' | 'active' | 'past_due' | 'canceled' | 'expired';
    startedAt: Date;
    expiresAt: Date;
    trialExpiresAt?: Date;
    gracePeriodEnd?: Date;
}

const SubscriptionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: {
        type: String,
        enum: ['inactive', 'active', 'past_due', 'canceled', 'expired'],
        default: 'inactive'
    },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    trialExpiresAt: { type: Date },
    gracePeriodEnd: { type: Date }
}, { timestamps: true });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
