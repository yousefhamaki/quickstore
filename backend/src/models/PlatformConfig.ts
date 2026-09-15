import mongoose, { Schema, Document } from 'mongoose';

/**
 * PlatformConfig — a genuine SINGLETON document holding global, admin-tunable
 * platform settings that are NOT tied to any particular subscription plan
 * (contrast with SubscriptionPlan.features/limits, which are per-plan).
 *
 * There is intentionally only ever one document in this collection, at the
 * fixed id below. Use platformConfigService.ts to read it (cached) rather
 * than querying this model directly outside of admin read/write paths.
 */
export const PLATFORM_CONFIG_SINGLETON_ID = '000000000000000000000001';

export interface IPlatformConfigSignupGift {
    enabled: boolean;
    amount: number;
}

export interface IPlatformConfig extends Omit<Document, '_id'> {
    _id: string;
    // Global "500 EGP for new users" wallet gift — see platformConfigService.ts.
    signupGift: IPlatformConfigSignupGift;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PlatformConfigSchema: Schema = new Schema(
    {
        _id: { type: String, default: PLATFORM_CONFIG_SINGLETON_ID },
        signupGift: {
            enabled: { type: Boolean, default: true },
            amount: { type: Number, default: 500, min: 0 },
        },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

export default mongoose.model<IPlatformConfig>('PlatformConfig', PlatformConfigSchema);
