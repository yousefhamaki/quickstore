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
}

const SessionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userAgent: { type: String, default: '' },
    deviceLabel: { type: String, default: 'Unknown device' },
    ip: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    revokedAt: { type: Date },
});

// Every authenticated request looks this up by _id — already indexed via
// the default _id index. This compound index serves "list my active
// sessions" (userId + revokedAt: null) without a collection scan.
SessionSchema.index({ userId: 1, revokedAt: 1 });

export default mongoose.model<ISession>('Session', SessionSchema);
