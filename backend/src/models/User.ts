import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash?: string;
    role: 'merchant' | 'super_admin';
    authProvider: 'local' | 'google';
    googleId?: string;
    isVerified: boolean;
    emailVerificationTokenHash?: string;
    emailVerificationExpiresAt?: Date;
    subscriptionStatus: 'pending' | 'active' | 'expired';
    subscriptionPlan?: mongoose.Types.ObjectId;
    subscriptionExpiry?: Date;
    stores: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        passwordHash: { type: String, required: false },
        role: { type: String, enum: ['merchant', 'super_admin'], default: 'merchant' },
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
        stores: [{ type: Schema.Types.ObjectId, ref: 'Store' }]
    },
    { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
