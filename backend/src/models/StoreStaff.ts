import mongoose, { Schema, Document } from 'mongoose';

/**
 * A single staff membership: one merchant's store, granting one invited
 * email limited access to it. Deliberately kept flat/simple for v1 — see
 * the role doc-comment below for exactly what 'manager' vs 'staff' can do.
 *
 * Lifecycle: an invite is created with status 'pending' and no `userId`
 * (only `email` is known yet). Once accepted (see staffController.acceptInvite)
 * it flips to 'active' and `userId`/`acceptedAt` are set. Removing a staff
 * member sets status to 'removed' rather than deleting the document, so the
 * invite/removal history stays auditable — a removed member can be
 * re-invited later, which creates a fresh 'pending' cycle on the same
 * document (see staffController.inviteStaff's upsert-by-{storeId,email}).
 */
export interface IStoreStaff extends Document {
    storeId: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    email: string;
    // 'manager': same day-to-day access as the owner (products, orders,
    //   customers, coupons, offers, analytics, marketing settings, shipping,
    //   general store settings) but NEVER billing/subscription, store
    //   deletion, or staff management — those stay owner-only.
    // 'staff': products, orders, and customers only — no analytics,
    //   marketing, shipping, or store settings, and (like manager) never
    //   billing or staff management.
    role: 'manager' | 'staff';
    status: 'pending' | 'active' | 'removed';
    invitedBy: mongoose.Types.ObjectId;
    inviteTokenHash?: string;
    inviteTokenExpiresAt?: Date;
    acceptedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const StoreStaffSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        email: { type: String, required: true, lowercase: true, trim: true },
        role: { type: String, enum: ['manager', 'staff'], required: true, default: 'staff' },
        status: { type: String, enum: ['pending', 'active', 'removed'], default: 'pending' },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        inviteTokenHash: { type: String, select: false },
        inviteTokenExpiresAt: { type: Date },
        acceptedAt: { type: Date },
    },
    { timestamps: true }
);

// One invite/membership per email per store — re-inviting the same email
// updates this same document rather than creating a duplicate.
StoreStaffSchema.index({ storeId: 1, email: 1 }, { unique: true });
StoreStaffSchema.index({ userId: 1, storeId: 1 });

export default mongoose.model<IStoreStaff>('StoreStaff', StoreStaffSchema);
