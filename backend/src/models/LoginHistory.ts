import mongoose, { Schema, Document } from 'mongoose';

/**
 * Append-only audit log of every login attempt — unlike Session, entries
 * here are never deleted or mutated by a revoke, so the merchant always has
 * a full history to review even after sessions are long gone.
 */
export interface ILoginHistory extends Document {
    userId: mongoose.Types.ObjectId;
    success: boolean;
    reason?: string; // e.g. 'invalid_password', '2fa_failed', 'account_blocked' — only set when success is false
    ip: string;
    userAgent: string;
    deviceLabel: string;
    createdAt: Date;
}

const LoginHistorySchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    success: { type: Boolean, required: true },
    reason: { type: String },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    deviceLabel: { type: String, default: 'Unknown device' },
    createdAt: { type: Date, default: Date.now },
});

// Newest-first pagination for "GET my login history" is the only query
// pattern this collection serves.
LoginHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ILoginHistory>('LoginHistory', LoginHistorySchema);
