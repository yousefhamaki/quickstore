import mongoose, { Schema, Document } from 'mongoose';
import type { OfferType } from './OfferCampaign';

// ─────────────────────────────────────────────────────────────────────────────
// Decision State
// ─────────────────────────────────────────────────────────────────────────────

export type ImpressionDecision =
    | 'pending'         // Offer shown, shopper has not yet interacted
    | 'accepted'        // Shopper clicked the CTA — order has been (or is being) mutated
    | 'declined'        // Shopper dismissed the offer
    | 'payment_failed'; // Post-purchase Stripe charge attempted but failed

// ─────────────────────────────────────────────────────────────────────────────
// Sub-document: Snapshot
//
// A point-in-time record of the offer's terms when it was presented.
// This is immutable after creation and serves as the audit trail for
// any order mutation that follows (price, discount, products shown).
// Critical for dispute resolution and analytics accuracy.
// ─────────────────────────────────────────────────────────────────────────────

export interface IImpressionSnapshot {
    /** IDs of the offer products shown in this impression. */
    offerProductIds: mongoose.Types.ObjectId[];

    /**
     * The computed discount amount (in store currency) that was advertised.
     * E.g. if a 20% discount was applied to a 250 EGP product, this stores 50.
     */
    discountAmountAdvertised: number;

    /**
     * The shopper's cart subtotal at the exact moment the offer was shown.
     * Used to verify that trigger conditions were legitimately met.
     */
    cartValueAtTime: number;

    /**
     * The final offer prices per product at the time of impression.
     * Keyed by productId string for fast lookup during acceptance validation.
     */
    computedOfferPrices: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Document Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface IOfferImpression extends Document {
    storeId: mongoose.Types.ObjectId;

    /** The campaign that was shown. */
    campaignId: mongoose.Types.ObjectId;

    /**
     * Browser/device session identifier. Generated client-side using
     * `crypto.randomUUID()` and persisted in localStorage for guest shoppers.
     * For authenticated customers, still tracked to allow cross-device dedup.
     */
    sessionId: string;

    /**
     * Resolved customer ID (if the shopper is a known Customer record).
     * May be null for first-time guest shoppers.
     */
    customerId?: mongoose.Types.ObjectId;

    /**
     * The order this impression was associated with.
     * - For pre-purchase events (cart_view, checkout_start): set after order creation.
     * - For post_purchase event: set immediately (order already exists).
     * - For checkout_abandon: may remain null if shopper left before placing order.
     */
    orderId?: mongoose.Types.ObjectId;

    /** The offer type at time of impression (denormalized for query efficiency). */
    offerType: OfferType;

    shownAt: Date;
    decision: ImpressionDecision;
    decidedAt?: Date;

    /** Immutable audit snapshot. Written once at impression creation. */
    snapshot: IImpressionSnapshot;

    createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const ImpressionSnapshotSchema = new Schema<IImpressionSnapshot>(
    {
        offerProductIds: [
            { type: Schema.Types.ObjectId, ref: 'Product' },
        ],
        discountAmountAdvertised: { type: Number, default: 0, min: 0 },
        cartValueAtTime: { type: Number, required: true, min: 0 },
        computedOfferPrices: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    { _id: false }
);

const OfferImpressionSchema = new Schema<IOfferImpression>(
    {
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
        },
        campaignId: {
            type: Schema.Types.ObjectId,
            ref: 'OfferCampaign',
            required: true,
        },
        sessionId: {
            type: String,
            required: true,
            trim: true,
            // UUIDs are 36 chars; allow up to 128 for custom implementations
            maxlength: 128,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'Customer',
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
        },
        offerType: {
            type: String,
            enum: ['upsell', 'cross_sell', 'down_sell', 'offer_page'],
            required: true,
        },
        shownAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        decision: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'payment_failed'],
            default: 'pending',
        },
        decidedAt: {
            type: Date,
        },
        snapshot: {
            type: ImpressionSnapshotSchema,
            required: true,
        },
    },
    {
        // Only `createdAt` is needed — updatedAt would be misleading since
        // the snapshot is immutable. We track decision timing via `decidedAt`.
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

// IMPRESSION LIMIT CHECK: Primary lookup used by offerEvaluationService to
// count how many times this campaign was already shown to this session/customer.
// This query runs on EVERY evaluate call, so it must be extremely fast.
OfferImpressionSchema.index(
    { campaignId: 1, sessionId: 1 },
    { name: 'idx_impression_campaign_session' }
);

// CUSTOMER DEDUP: Secondary lookup for logged-in customers across sessions.
OfferImpressionSchema.index(
    { campaignId: 1, customerId: 1 },
    {
        name: 'idx_impression_campaign_customer',
        sparse: true, // Most impressions are from guest sessions
    }
);

// ORDER ATTRIBUTION: Used in offerController.accept to fetch all impressions
// linked to a specific order (e.g. to validate ownership and avoid re-charging).
OfferImpressionSchema.index(
    { storeId: 1, orderId: 1 },
    {
        name: 'idx_impression_store_order',
        sparse: true,
    }
);

// ANALYTICS AGGREGATION: Powers the campaign analytics dashboard queries:
// "How many impressions had decision=accepted for campaign X?"
OfferImpressionSchema.index(
    { campaignId: 1, decision: 1, shownAt: -1 },
    { name: 'idx_impression_campaign_decision_date' }
);

// STORE-LEVEL ANALYTICS: Allows store-wide analytics queries without
// scanning the campaignId dimension.
OfferImpressionSchema.index(
    { storeId: 1, offerType: 1, decision: 1 },
    { name: 'idx_impression_store_type_decision' }
);

// TTL INDEX: Automatically removes impression records after 90 days.
// This keeps the collection lean without manual cleanup jobs.
// Analytics dashboards should aggregate data into a summary collection
// before this window expires for long-term reporting.
OfferImpressionSchema.index(
    { shownAt: 1 },
    {
        name: 'idx_impression_ttl_90d',
        expireAfterSeconds: 7_776_000, // 90 days
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Pre-save Hook
// ─────────────────────────────────────────────────────────────────────────────

OfferImpressionSchema.pre<IOfferImpression>('save', function () {
    // Auto-set decidedAt whenever the decision transitions away from 'pending'.
    if (
        this.isModified('decision') &&
        this.decision !== 'pending' &&
        !this.decidedAt
    ) {
        this.decidedAt = new Date();
    }
});

export default mongoose.model<IOfferImpression>('OfferImpression', OfferImpressionSchema);
