import mongoose, { Schema, Document } from 'mongoose';

/**
 * One document per issued JWT. The JWT itself carries a `sid` claim that
 * matches this document's _id — `protect` (authMiddleware.ts) looks it up
 * on every request so a session can actually be revoked before its natural
 * expiry (a bare stateless JWT cannot be invalidated early at all). This is
 * what powers both the "Active Sessions" list/revoke feature and the
 * "new device" detection for login alerts (see authController.ts).
 */
export interface ISession extends Document {
    userId: mongoose.Types.ObjectId;
    userAgent: string;
    deviceLabel: string; // human-readable, derived from userAgent — e.g. "Chrome on Windows"
    ip: string;
    createdAt: Date;
    lastActiveAt: Date;
    revokedAt?: Date;
    // --- Refresh token (mobile app) ---
    // Only the SHA-256 hash is ever stored, same convention as
    // User.emailVerificationTokenHash — the raw token is high-entropy
    // (crypto.randomBytes) so a fast exact-match hash lookup is fine; no
    // need for bcrypt's slow compare like the low-entropy 2FA backup codes.
    // Rotated (overwritten) on every use in POST /api/auth/refresh, which is
    // what makes each refresh token single-use — reusing an old one after
    // rotation simply no longer matches anything stored here.
    refreshTokenHash?: string;
    refreshTokenExpiresAt?: Date;
}

const SessionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userAgent: { type: String, default: '' },
    deviceLabel: { type: String, default: 'Unknown device' },
    ip: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    revokedAt: { type: Date },
    refreshTokenHash: { type: String, select: false },
    refreshTokenExpiresAt: { type: Date, select: false },
});

// Every authenticated request looks this up by _id — already indexed via
// the default _id index. This compound index serves "list my active
// sessions" (userId + revokedAt: null) without a collection scan.
SessionSchema.index({ userId: 1, revokedAt: 1 });

// POST /api/auth/refresh looks a session up directly by the incoming
// refresh token's hash (there is no other identifier available at that
// point — the access token may already be expired). Sparse+unique since
// most sessions won't have one set (e.g. web sessions that never issue a
// refresh token) and any that do must be unique.
SessionSchema.index({ refreshTokenHash: 1 }, { unique: true, sparse: true });

export default mongoose.model<ISession>('Session', SessionSchema);
