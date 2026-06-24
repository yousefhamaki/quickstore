import express from 'express';
import {
    // Public (storefront) handlers
    evaluateStorefrontOffers,
    recordImpression,
    recordDecision,
    acceptOffer,
    getPublicCampaign,
    // Merchant (dashboard) handlers
    getCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaignAnalytics,
} from '../controllers/offerController';
import { protect, authorize } from '../middleware/authMiddleware';
import { billingContext, storefrontBillingContext } from '../middleware/billingMiddleware';
import { requireFeature } from '../middleware/featureGate';

// ─────────────────────────────────────────────────────────────────────────────
// Public Router  (mounted at /api/public/offers in server.ts)
// ─────────────────────────────────────────────────────────────────────────────
export const publicOfferRouter = express.Router();

/**
 * POST /api/public/offers/evaluate
 * Body: { storeId, event, sessionId, cartItems[], cartSubtotal, customerId? }
 * Returns ranked list of eligible EvaluatedOffer objects.
 * No auth — storefront-facing, reads only.
 */
publicOfferRouter.post('/evaluate', evaluateStorefrontOffers);

/**
 * GET /api/public/offers/campaigns/:id
 * Query: storeId
 * Returns the populated campaign details with safe product data projection.
 */
publicOfferRouter.get('/campaigns/:id', getPublicCampaign);

/**
 * POST /api/public/offers/impression
 * Body: { storeId, campaignId, sessionId, offerType, snapshot, cartValueAtTime, orderId?, customerId? }
 * Returns { impressionId } — must be held by client to reference in /decision or /accept.
 */
publicOfferRouter.post('/impression', recordImpression);

/**
 * POST /api/public/offers/decision
 * Body: { impressionId, decision: 'declined' | 'accepted' }
 * Records a pure decline (no order mutation).
 * For acceptance WITH order mutation use /accept instead.
 */
publicOfferRouter.post('/decision', recordDecision);

/**
 * POST /api/public/offers/accept
 * Body: { impressionId, orderId, sessionId }
 * Atomically:
 *  - validates session ownership
 *  - checks live inventory
 *  - mutates order.items (replace for upsell, append for cross/down-sell)
 *  - recalculates order totals + tax
 *  - reserves inventory
 *  - runs delta billing fee
 *  - marks impression accepted + increments campaign.totalAcceptances
 * Returns { newTotal, addedItems[] }
 *
 * storefrontBillingContext is attached to resolve store subscription context
 * needed by processOrderFee without requiring merchant auth.
 */
publicOfferRouter.post('/accept', storefrontBillingContext, acceptOffer);

// ─────────────────────────────────────────────────────────────────────────────
// Merchant Router  (mounted at /api/merchant/offers in server.ts)
// ─────────────────────────────────────────────────────────────────────────────
export const merchantOfferRouter = express.Router();

// All merchant routes require: JWT auth → merchant role → active subscription with UCD feature
merchantOfferRouter.use(protect);
merchantOfferRouter.use(authorize('merchant'));
merchantOfferRouter.use(billingContext);

/**
 * GET  /api/merchant/offers/campaigns?storeId=...&type=upsell&status=active&page=1&limit=20
 * Returns paginated campaign list for a store.
 * requireFeature('ucd') gates access behind Pro+ plan.
 */
merchantOfferRouter.get('/campaigns', requireFeature('ucd'), getCampaigns);

/**
 * POST /api/merchant/offers/campaigns
 * Body: { storeId, type, name, trigger, offerProducts[], display, ... }
 * Creates a new campaign in 'draft' status.
 */
merchantOfferRouter.post('/campaigns', requireFeature('ucd'), createCampaign);

/**
 * PUT  /api/merchant/offers/campaigns/:id
 * Body: any updatable campaign field (totalAcceptances and storeId are stripped server-side)
 * Updates and invalidates the evaluation cache for the campaign's store.
 */
merchantOfferRouter.put('/campaigns/:id', requireFeature('ucd'), updateCampaign);

/**
 * DELETE /api/merchant/offers/campaigns/:id
 * Soft-deletes by setting status='archived' (preserves impression FK integrity).
 */
merchantOfferRouter.delete('/campaigns/:id', requireFeature('ucd'), deleteCampaign);

/**
 * GET /api/merchant/offers/analytics/:campaignId?storeId=...&days=30
 * Returns impressions, acceptance rate, revenue added, and daily breakdown.
 */
merchantOfferRouter.get('/analytics/:campaignId', requireFeature('ucd'), getCampaignAnalytics);
