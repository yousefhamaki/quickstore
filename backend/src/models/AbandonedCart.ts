import mongoose, { Schema, Document } from 'mongoose';

export interface IAbandonedCart extends Document {
    storeId: mongoose.Types.ObjectId;
    // Stable per-browser-session identity (the storefront's `storefront_session`
    // localStorage id — see checkout/page.tsx). Used to upsert the same cart
    // record as it changes, and to match it back to the real order that
    // eventually recovers it (see publicOrderController.createPublicOrder).
    sessionId: string;
    customerEmail: string;
    customerPhone?: string;
    customerName?: string;
    items: any[];
    totalAmount: number;
    status: 'pending' | 'recovered' | 'contacted';
    // Set once the recovery sweep actually sends the reminder email, so the
    // same cart is never emailed twice (see AbandonedCartRecoveryService).
    recoveryEmailSentAt?: Date;
    // Short opaque identifier for the recovery email's checkout link (see
    // GET /api/public/stores/:storeId/abandoned-cart/:token) — never the raw
    // Mongo _id, so a leaked/forwarded email link can't be used to enumerate
    // or guess at other carts.
    recoveryToken?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AbandonedCartSchema: Schema = new Schema({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    sessionId: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String },
    customerName: { type: String },
    items: [{ type: Schema.Types.Mixed }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'recovered', 'contacted'], default: 'pending' },
    recoveryEmailSentAt: { type: Date },
    recoveryToken: { type: String },
}, { timestamps: true });

// Index for performance
AbandonedCartSchema.index({ storeId: 1, createdAt: -1 });
AbandonedCartSchema.index({ customerEmail: 1 });
// Upsert/lookup key used by the capture endpoint (one cart per browser
// session per store) and the order-recovery match.
AbandonedCartSchema.index({ storeId: 1, sessionId: 1 });
// Lookup key for the recovery sweep's email link (GET .../abandoned-cart/:token).
AbandonedCartSchema.index({ recoveryToken: 1 }, { sparse: true });

export default mongoose.model<IAbandonedCart>('AbandonedCart', AbandonedCartSchema);
