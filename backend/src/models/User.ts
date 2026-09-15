import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash?: string;
    role: 'merchant' | 'super_admin' | 'finance_admin' | 'support_admin' | 'read_only_admin';
    authProvider: 'local' | 'google';
    googleId?: string;
    isVerified: boolean;
    emailVerificationTokenHash?: string;
    emailVerificationExpiresAt?: Date;
    subscriptionStatus: 'pending' | 'active' | 'expired';
    subscriptionPlan?: mongoose.Types.ObjectId;
    subscriptionExpiry?: Date;
    stores: mongoose.Types.ObjectId[];
    isBlocked: boolean;
    // --- Two-Factor Authentication ---
    twoFactorEnabled: boolean;
    twoFactorMethod?: 'totp' | 'email';
    totpSecretEncrypted?: string; // AES-256-GCM encrypted (see utils/crypto.ts), only set once TOTP is confirmed
    backupCodeHashes: string[]; // bcrypt-hashed one-time recovery codes, consumed on use
    // Ephemeral fields for a pending setup or an in-flight email-OTP login challenge —
    // never left populated once confirmed/consumed.
    twoFactorPendingSecretEncrypted?: string; // TOTP secret generated but not yet confirmed via a valid code
    twoFactorLoginCodeHash?: string;
    twoFactorLoginCodeExpiresAt?: Date;
    twoFactorFailedAttempts: number;
    twoFactorLockedUntil?: Date;
    // Merchant-facing onboarding/activation drip marketing emails (see
    // services/marketing/MerchantDripService.ts) — set via the signed
    // unsubscribe link in every drip email's footer. Distinct from any
    // shopper-facing consent tracking (Customer.consentHistory), which is
    // unrelated (storefront newsletter, not this SaaS's own merchant email).
    marketingOptOut: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        passwordHash: { type: String, required: false },
        role: { type: String, enum: ['merchant', 'super_admin', 'finance_admin', 'support_admin', 'read_only_admin'], default: 'merchant' },
        authProvider: { type: String, enum: ['local', 'google'], required: true, default: 'local' },
        googleId: { type: String, index: true, sparse: true },
        isVerified: { type: Boolean, default: false },
        emailVerificationTokenHash: { type: String },
        emailVerificationExpiresAt: { type: Date },
        subscriptionStatus: {
            type: String,
            enum: ['pending', 'active', 'expired'],
            default: 'pending'
        },
        subscriptionPlan: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
        subscriptionExpiry: { type: Date },
        stores: [{ type: Schema.Types.ObjectId, ref: 'Store' }],
        isBlocked: { type: Boolean, default: false },
        // --- Two-Factor Authentication ---
        twoFactorEnabled: { type: Boolean, default: false },
        twoFactorMethod: { type: String, enum: ['totp', 'email'] },
        totpSecretEncrypted: { type: String, select: false },
        backupCodeHashes: { type: [String], default: undefined, select: false },
        twoFactorPendingSecretEncrypted: { type: String, select: false },
        twoFactorLoginCodeHash: { type: String, select: false },
        twoFactorLoginCodeExpiresAt: { type: Date, select: false },
        twoFactorFailedAttempts: { type: Number, default: 0 },
        twoFactorLockedUntil: { type: Date },
        marketingOptOut: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
