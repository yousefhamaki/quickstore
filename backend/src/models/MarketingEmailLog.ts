import mongoose, { Schema, Document } from 'mongoose';

/**
 * Records that a given step of the merchant onboarding/activation drip (see
 * services/marketing/MerchantDripService.ts) has been sent to a given user.
 * The unique (userId, step) index is what makes a sweep run idempotent: even
 * if the sweep runs twice (overlapping cron tick, manual re-run, retried
 * job), the same user can never receive the same drip step twice.
 *
 * Unrelated to the storefront-facing Campaign/CampaignRecipient system
 * (models/Campaign.ts) — that's a merchant-to-shopper broadcast tool. This
 * log is exclusively for Buildora's own merchant-activation emails.
 */
export type MarketingDripStep =
    | 'create_store'
    | 'add_first_product'
    | 'publish_store'
    | 'upgrade_plan';

export const MARKETING_DRIP_STEPS: MarketingDripStep[] = [
    'create_store',
    'add_first_product',
    'publish_store',
    'upgrade_plan',
];

export interface IMarketingEmailLog extends Document {
    userId: mongoose.Types.ObjectId;
    step: MarketingDripStep;
    sentAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const MarketingEmailLogSchema: Schema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        step: { type: String, enum: MARKETING_DRIP_STEPS, required: true },
        sentAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// One send per (user, step), ever — see file header.
MarketingEmailLogSchema.index({ userId: 1, step: 1 }, { unique: true });

export default mongoose.model<IMarketingEmailLog>('MarketingEmailLog', MarketingEmailLogSchema);
