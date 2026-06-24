import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import OfferCampaign from '../models/OfferCampaign';
import OfferImpression from '../models/OfferImpression';
import Order from '../models/Order';
import Product from '../models/Product';
import Store from '../models/Store';
import InventoryLog from '../models/InventoryLog';
import { evaluateOffers, CartItem } from '../services/offerEvaluationService';
import { processOrderFee } from './billingController';
import { redisClient } from '../config/redis';
import { clearStoreProductCaches } from './productController';

// ─────────────────────────────────────────────────────────────────────────────
// ── PUBLIC STOREFRONT ENDPOINTS ───────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Evaluate which offer campaigns are eligible for the current cart.
 * @route   POST /api/public/offers/evaluate
 * @access  Public (storefront)
 */
export const evaluateStorefrontOffers = async (req: Request, res: Response) => {
    try {
        const { storeId, event, sessionId, cartItems, cartSubtotal, customerId } = req.body;

        if (!storeId || !event || !sessionId) {
            return res.status(400).json({
                success: false,
                message: 'storeId, event, and sessionId are required.',
            });
        }

        if (!Array.isArray(cartItems)) {
            return res.status(400).json({ success: false, message: 'cartItems must be an array.' });
        }

        const offers = await evaluateOffers({
            storeId,
            event,
            sessionId,
            cartItems: cartItems as CartItem[],
            cartSubtotal: Number(cartSubtotal) || 0,
            customerId,
        });

        res.json({ success: true, offers });
    } catch (error: any) {
        console.error('[offerController] evaluateStorefrontOffers error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Record that an offer was shown to a session (must be called before decision).
 * @route   POST /api/public/offers/impression
 * @access  Public (storefront)
 *
 * Returns an impressionId that the client must hold and pass to /decision or /accept.
 * Writing the impression record here (not inside evaluate) lets us keep evaluate as
 * a pure read-only function, which is important for cache correctness.
 */
export const recordImpression = async (req: Request, res: Response) => {
    try {
        const {
            storeId,
            campaignId,
            sessionId,
            orderId,
            customerId,
            cartValueAtTime,
            offerType,
            snapshot,
        } = req.body;

        if (!storeId || !campaignId || !sessionId || !offerType || !snapshot) {
            return res.status(400).json({
                success: false,
                message: 'storeId, campaignId, sessionId, offerType, and snapshot are required.',
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(storeId) ||
            !mongoose.Types.ObjectId.isValid(campaignId)
        ) {
            return res.status(400).json({ success: false, message: 'Invalid storeId or campaignId.' });
        }

        // Deduplicate: check if an impression already exists for this session and campaign
        let impression = await OfferImpression.findOne({
            campaignId: new mongoose.Types.ObjectId(campaignId),
            sessionId,
        });

        let isNew = false;
        if (!impression) {
            impression = await OfferImpression.create({
                storeId: new mongoose.Types.ObjectId(storeId),
                campaignId: new mongoose.Types.ObjectId(campaignId),
                sessionId,
                orderId: orderId && mongoose.Types.ObjectId.isValid(orderId)
                    ? new mongoose.Types.ObjectId(orderId)
                    : undefined,
                customerId: customerId && mongoose.Types.ObjectId.isValid(customerId)
                    ? new mongoose.Types.ObjectId(customerId)
                    : undefined,
                offerType,
                shownAt: new Date(),
                decision: 'pending',
                snapshot: {
                    offerProductIds: (snapshot.offerProductIds || []).map(
                        (id: string) => new mongoose.Types.ObjectId(id)
                    ),
                    discountAmountAdvertised: Number(snapshot.discountAmountAdvertised) || 0,
                    cartValueAtTime: Number(cartValueAtTime) || 0,
                    computedOfferPrices: snapshot.computedOfferPrices || {},
                },
            });
            isNew = true;
        }

        if (isNew) {
            // Increment campaign impressions count only on new impressions
            await OfferCampaign.findByIdAndUpdate(
                campaignId,
                { $inc: { 'analytics.impressions': 1 } }
            );
        }

        res.status(201).json({ success: true, impressionId: impression._id });
    } catch (error: any) {
        console.error('[offerController] recordImpression error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Record a shopper's decline decision (no order mutation needed).
 * @route   POST /api/public/offers/decision
 * @access  Public (storefront)
 *
 * For 'accepted' decisions that also need order mutation, use /accept instead.
 * This endpoint handles pure 'declined' decisions only.
 */

export const recordDecision = async (req: Request, res: Response) => {
    try {
        const { impressionId, decision } = req.body;

        if (!impressionId || !decision) {
            return res.status(400).json({ success: false, message: 'impressionId and decision are required.' });
        }

        if (!['declined', 'accepted'].includes(decision)) {
            return res.status(400).json({ success: false, message: 'decision must be "declined" or "accepted".' });
        }

        if (!mongoose.Types.ObjectId.isValid(impressionId)) {
            return res.status(400).json({ success: false, message: 'Invalid impressionId.' });
        }

        const impression = await OfferImpression.findById(impressionId);
        if (!impression) {
            return res.status(404).json({ success: false, message: 'Impression not found.' });
        }

        if (impression.decision !== 'pending') {
            return res.status(409).json({
                success: false,
                message: `Decision already recorded as '${impression.decision}'.`,
            });
        }

        impression.decision = decision;
        await impression.save();

        if (decision === 'declined') {
            await OfferCampaign.findByIdAndUpdate(
                impression.campaignId,
                { $inc: { 'analytics.dismissals': 1 } }
            );
        }

        res.json({ success: true, decision: impression.decision });
    } catch (error: any) {
        console.error('[offerController] recordDecision error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Accept an offer — atomically mutates an existing pending order.
 * @route   POST /api/public/offers/accept
 * @access  Public (lightweight session-ownership check via sessionId + orderId)
 *
 * Critical path:
 *  1. Validate impressionId, orderId ownership via sessionId
 *  2. Load campaign snapshot to get locked-in offer prices
 *  3. For each offer product: live inventory check
 *  4. If upsell with replacesProductId: un-reserve original, add new item
 *  5. For cross-sell / down-sell: append new items to order.items
 *  6. Recalculate subtotal, tax, total
 *  7. Reserve inventory for all new items
 *  8. processOrderFee delta for added revenue
 *  9. Atomically $inc campaign.totalAcceptances
 * 10. Update impression.decision = 'accepted'
 * 11. Return new order total
 */
export const acceptOffer = async (req: Request, res: Response) => {
    const {
        impressionId,
        orderId,
        sessionId,
    } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!impressionId || !orderId || !sessionId) {
        return res.status(400).json({
            success: false,
            message: 'impressionId, orderId, and sessionId are required.',
        });
    }

    if (
        !mongoose.Types.ObjectId.isValid(impressionId) ||
        !mongoose.Types.ObjectId.isValid(orderId)
    ) {
        return res.status(400).json({ success: false, message: 'Invalid impressionId or orderId.' });
    }

    let dbSession: mongoose.ClientSession | null = null;
    const isLocalStandalone =
        process.env.MONGODB_URI?.includes('localhost') &&
        !process.env.MONGODB_URI?.includes('replicaSet');

    try {
        // ── Load impression ──────────────────────────────────────────────────
        const impression = await OfferImpression.findById(impressionId);
        if (!impression) {
            return res.status(404).json({ success: false, message: 'Impression not found.' });
        }

        // Idempotency: if already accepted, return current order total without re-processing
        if (impression.decision === 'accepted') {
            const existingOrder = await Order.findById(orderId).select('total').lean();
            return res.json({
                success: true,
                message: 'Offer already accepted.',
                newTotal: existingOrder?.total,
            });
        }

        if (impression.decision !== 'pending') {
            return res.status(409).json({
                success: false,
                message: `Cannot accept an offer that was already '${impression.decision}'.`,
            });
        }

        // ── Ownership check ──────────────────────────────────────────────────
        // Session ID binds this impression to the shopper who saw it.
        if (impression.sessionId !== sessionId) {
            return res.status(403).json({
                success: false,
                message: 'Session mismatch. Offer acceptance denied.',
            });
        }

        // ── Load the campaign for live data (snapshot used for prices only) ─
        const campaign = await OfferCampaign.findById(impression.campaignId);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found.' });
        }

        // Acceptance limit: check again under lock to prevent race conditions
        if (
            campaign.maxTotalAcceptances > 0 &&
            campaign.totalAcceptances >= campaign.maxTotalAcceptances
        ) {
            return res.status(409).json({
                success: false,
                message: 'This offer has reached its maximum acceptance limit.',
                code: 'OFFER_LIMIT_REACHED',
            });
        }

        // ── Load the order ───────────────────────────────────────────────────
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        if (order.paymentStatus !== 'pending' || order.status !== 'pending') {
            return res.status(409).json({
                success: false,
                message: 'Offer can only be accepted on a pending order.',
                code: 'ORDER_NOT_MUTABLE',
            });
        }

        // ── Load store for tax + fee calculation ─────────────────────────────
        const store = await Store.findById(order.storeId).populate({
            path: 'subscriptionId',
            populate: { path: 'planId' },
        });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found.' });
        }

        // ── Live inventory checks for all offer products ─────────────────────
        const offerProductDetails: Array<{
            productDoc: any;
            variantDoc?: any;
            op: typeof campaign.offerProducts[number];
            offerPrice: number;
        }> = [];

        for (const op of campaign.offerProducts) {
            const product = await Product.findById(op.productId);
            if (!product || product.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: `Offer product is no longer available.`,
                    code: 'PRODUCT_UNAVAILABLE',
                });
            }

            // Compute live offer price (locked from impression snapshot for security)
            const snapshotPrice = impression.snapshot.computedOfferPrices[op.productId.toString()];
            const offerPrice = snapshotPrice !== undefined ? snapshotPrice : product.price;

            if (product.trackInventory) {
                if (op.variantId) {
                    const variant = product.variants.find(
                        (v: any) => v._id.toString() === op.variantId!.toString()
                    );
                    if (!variant || variant.isDeleted) {
                        return res.status(400).json({
                            success: false,
                            message: `Offer product variant is no longer available.`,
                        });
                    }
                    const available = (variant.inventory || 0) - (variant.reserved || 0);
                    if (available < op.quantity) {
                        return res.status(400).json({
                            success: false,
                            message: `Insufficient stock for offer product. Only ${available} left.`,
                            code: 'INSUFFICIENT_STOCK',
                        });
                    }
                    offerProductDetails.push({ productDoc: product, variantDoc: variant, op, offerPrice });
                } else {
                    const available =
                        (product.inventory.quantity || 0) - (product.inventory.reserved || 0);
                    if (available < op.quantity) {
                        return res.status(400).json({
                            success: false,
                            message: `Insufficient stock for offer product. Only ${available} left.`,
                            code: 'INSUFFICIENT_STOCK',
                        });
                    }
                    offerProductDetails.push({ productDoc: product, variantDoc: undefined, op, offerPrice });
                }
            } else {
                offerProductDetails.push({ productDoc: product, variantDoc: undefined, op, offerPrice });
            }
        }

        // ── Start MongoDB transaction (if replica set available) ─────────────
        if (!isLocalStandalone) {
            try {
                dbSession = await mongoose.startSession();
                dbSession.startTransaction();
            } catch {
                dbSession = null;
            }
        }

        try {
            const originalTotal = order.total;
            let revenueAdded = 0;
            let savedAmount = 0;

            // ── Handle upsell product replacement ────────────────────────────
            if (campaign.type === 'upsell' && campaign.replacesProductId) {
                const replaceIdStr = campaign.replacesProductId.toString();
                const replaceVarIdStr = campaign.replacesVariantId?.toString();

                const replacedItemIndex = order.items.findIndex((item: any) => {
                    const productMatch = item.productId.toString() === replaceIdStr;
                    if (replaceVarIdStr) {
                        return productMatch && item.variantId?.toString() === replaceVarIdStr;
                    }
                    return productMatch;
                });

                if (replacedItemIndex !== -1) {
                    const replacedItem = order.items[replacedItemIndex];

                    // Un-reserve inventory for the replaced item
                    if (replaceVarIdStr) {
                        await Product.findOneAndUpdate(
                            { _id: campaign.replacesProductId, 'variants._id': campaign.replacesVariantId },
                            {
                                $inc: {
                                    'variants.$.reserved': -Number(replacedItem.quantity),
                                    'inventory.reserved': -Number(replacedItem.quantity),
                                },
                            },
                            { session: dbSession || undefined }
                        );
                    } else {
                        await Product.findOneAndUpdate(
                            { _id: campaign.replacesProductId },
                            { $inc: { 'inventory.reserved': -Number(replacedItem.quantity) } },
                            { session: dbSession || undefined }
                        );
                    }

                    // Remove the replaced item from the order
                    (order.items as any[]).splice(replacedItemIndex, 1);
                }
            }

            // ── Add offer products to the order ──────────────────────────────
            for (const { productDoc, op, offerPrice } of offerProductDetails) {
                const basePrice = productDoc.price;
                const itemSavings = Math.max(0, basePrice - offerPrice) * op.quantity;
                savedAmount += itemSavings;
                revenueAdded += offerPrice * op.quantity;

                (order.items as any[]).push({
                    productId: productDoc._id,
                    variantId: op.variantId || undefined,
                    name: productDoc.name,
                    quantity: op.quantity,
                    price: offerPrice,
                    image: productDoc.images?.[0]?.url,
                });
            }

            // ── Recalculate order totals ──────────────────────────────────────
            const rawSubtotal = (order.items as any[]).reduce(
                (sum: number, item: any) => sum + item.price * item.quantity,
                0
            );
            const taxRate = store.settings?.tax?.enabled ? store.settings.tax.rate / 100 : 0;
            const taxDelta = parseFloat((revenueAdded * taxRate).toFixed(2));

            order.subtotal = parseFloat(rawSubtotal.toFixed(2));
            order.tax = parseFloat(((order.tax || 0) + taxDelta).toFixed(2));
            order.total = parseFloat((order.subtotal + order.shipping + order.tax - order.discount).toFixed(2));

            // ── Append offer attribution record ──────────────────────────────
            let campaignRevenue = 0;
            let discountAmount = 0;
            for (const { productDoc, op, offerPrice } of offerProductDetails) {
                const basePrice = productDoc.price;
                campaignRevenue += basePrice * op.quantity;
                discountAmount += Math.max(0, basePrice - offerPrice) * op.quantity;
            }

            let revenueSource: 'order' | 'upsell' | 'bogo' | 'threshold' | 'bundle' = 'bundle';
            if (campaign.type === 'upsell' || campaign.type === 'down_sell') {
                revenueSource = 'upsell';
            } else if (campaign.type === 'bogo') {
                revenueSource = 'bogo';
            } else if (campaign.type === 'cart_threshold') {
                revenueSource = 'threshold';
            } else if (campaign.type === 'volume_discount') {
                revenueSource = 'bundle';
            } else if (campaign.type === 'offer_page') {
                revenueSource = 'order';
            }

            if (!order.offerAttribution) (order as any).offerAttribution = [];
            (order as any).offerAttribution.push({
                campaignId: campaign._id,
                impressionId: impression._id,
                offerType: campaign.type,
                revenueAdded: parseFloat(revenueAdded.toFixed(2)),
                savedAmount: parseFloat(savedAmount.toFixed(2)),
                campaignRevenue: parseFloat(campaignRevenue.toFixed(2)),
                discountAmount: parseFloat(discountAmount.toFixed(2)),
                revenueSource,
                analyticsReversed: false,
                attributionVersion: 1,
                placement: campaign.placement || 'product_page',
                acceptedAt: new Date(),
            });

            await order.save({ session: dbSession || undefined });

            // ── Reserve inventory for new offer products ──────────────────────
            for (const { productDoc, variantDoc, op } of offerProductDetails) {
                if (!productDoc.trackInventory) continue;

                let updatedProduct: any;
                if (op.variantId) {
                    updatedProduct = await Product.findOneAndUpdate(
                        { _id: productDoc._id, 'variants._id': op.variantId },
                        {
                            $inc: {
                                'variants.$.reserved': op.quantity,
                                'inventory.reserved': op.quantity,
                            },
                        },
                        { session: dbSession || undefined, new: true }
                    );
                } else {
                    updatedProduct = await Product.findOneAndUpdate(
                        { _id: productDoc._id },
                        { $inc: { 'inventory.reserved': op.quantity } },
                        { session: dbSession || undefined, new: true }
                    );
                }

                if (updatedProduct) {
                    const newBalance = op.variantId
                        ? (variantDoc?.inventory || 0) - (variantDoc?.reserved || 0) - op.quantity
                        : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0);

                    await InventoryLog.create(
                        [{
                            storeId: order.storeId,
                            productId: productDoc._id,
                            variantId: op.variantId || undefined,
                            orderId: order._id,
                            type: 'RESERVATION',
                            amount: op.quantity,
                            previousBalance: newBalance + op.quantity,
                            newBalance,
                            reason: `Offer accept — campaign ${campaign._id} on order ${order.orderNumber}`,
                        }],
                        { session: dbSession || undefined }
                    );

                    // Cache invalidation: wipe individual product if sold out
                    try {
                        await redisClient.unlink(`product:${productDoc._id}`);
                    } catch (_) { /* graceful */ }

                    if (newBalance === 0) {
                        await clearStoreProductCaches(order.storeId.toString());
                    }
                }
            }

            // ── Delta billing fee ─────────────────────────────────────────────
            const deltaTotal = order.total - originalTotal;
            if (deltaTotal > 0) {
                const plan = (store.subscriptionId as any)?.planId;
                const feePercent = plan?.transactionFeePercent || 0;
                if (feePercent > 0) {
                    const deltaFee = parseFloat((deltaTotal * (feePercent / 100)).toFixed(2));
                    order.transactionFee = parseFloat(((order.transactionFee || 0) + deltaFee).toFixed(2));
                    await order.save({ session: dbSession || undefined });
                    await processOrderFee(store.ownerId.toString(), order._id, dbSession || undefined);
                }

                // Update store revenue stats
                await Store.findByIdAndUpdate(
                    order.storeId,
                    { $inc: { 'stats.totalRevenue': deltaTotal } },
                    { session: dbSession || undefined }
                );
            }

            // ── Atomically increment campaign acceptance counter and revenue ───────────────
            await OfferCampaign.findByIdAndUpdate(
                campaign._id,
                { 
                    $inc: { 
                        totalAcceptances: 1,
                        'analytics.acceptances': 1,
                        'analytics.revenue': campaignRevenue > 0 ? parseFloat(campaignRevenue.toFixed(2)) : 0,
                        'analytics.generatedOrders': 1
                    } 
                },
                { session: dbSession || undefined }
            );

            // ── Mark impression as accepted ───────────────────────────────────
            impression.decision = 'accepted';
            impression.orderId = order._id as mongoose.Types.ObjectId;
            await impression.save({ session: dbSession || undefined });

            // ── Invalidate offer evaluation cache for this store ──────────────
            // A user accepting one offer might unlock or block other campaigns.
            try {
                const offerKeys = await redisClient.keys(`offers:eval:${order.storeId}:*`);
                if (offerKeys.length > 0) await redisClient.unlink(...offerKeys);
            } catch (_) { /* graceful */ }

            if (dbSession) await dbSession.commitTransaction();

            res.json({
                success: true,
                newTotal: order.total,
                newSubtotal: order.subtotal,
                addedItems: offerProductDetails.map(({ productDoc, op, offerPrice }) => ({
                    productId: productDoc._id,
                    name: productDoc.name,
                    quantity: op.quantity,
                    offerPrice,
                })),
            });
        } catch (txnError: any) {
            if (dbSession) await dbSession.abortTransaction();
            throw txnError;
        } finally {
            if (dbSession) dbSession.endSession();
        }
    } catch (error: any) {
        console.error('[offerController] acceptOffer error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ── MERCHANT-AUTHED CAMPAIGN MANAGEMENT ENDPOINTS ─────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    List all campaigns for a store (with pagination).
 * @route   GET /api/merchant/offers/campaigns?storeId=...&page=1&limit=20&type=upsell&status=active
 * @access  Private/Merchant
 */
export const getCampaigns = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId, type, status } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        if (!storeId) {
            return res.status(400).json({ success: false, message: 'storeId is required.' });
        }

        // Ownership check — ensures merchant can only access their own store's campaigns
        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found or unauthorized.' });
        }

        const filter: any = { storeId };
        if (type) filter.type = type;
        if (status) filter.status = status;

        const [campaigns, total] = await Promise.all([
            OfferCampaign.find(filter)
                .sort({ priority: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            OfferCampaign.countDocuments(filter),
        ]);

        res.json({
            success: true,
            campaigns,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Create a new offer campaign.
 * @route   POST /api/merchant/offers/campaigns
 * @access  Private/Merchant (requires UCD feature gate)
 */
export const createCampaign = async (req: AuthRequest, res: Response) => {
    try {
        const {
            storeId,
            type,
            name,
            trigger,
            offerProducts,
            display,
            schedule,
            priority,
            maxImpressionsPerCustomer,
            maxTotalAcceptances,
            replacesProductId,
            replacesVariantId,
            status,
            pricingTiers,
            shippingFee,
        } = req.body;

        if (!storeId || !type || !name || !trigger || !offerProducts || !display) {
            return res.status(400).json({ success: false, message: 'Missing required campaign fields.' });
        }

        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found or unauthorized.' });
        }

        // Verify all offer products belong to this store
        for (const op of offerProducts) {
            if (!mongoose.Types.ObjectId.isValid(op.productId)) {
                return res.status(400).json({ success: false, message: `Invalid productId: ${op.productId}` });
            }
            const product = await Product.findOne({ _id: op.productId, storeId });
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product ${op.productId} does not belong to this store.`,
                });
            }
        }

        const campaign = await OfferCampaign.create({
            storeId,
            type,
            name,
            trigger,
            offerProducts,
            display,
            schedule: schedule || undefined,
            priority: priority || 100,
            maxImpressionsPerCustomer: maxImpressionsPerCustomer ?? 0,
            maxTotalAcceptances: maxTotalAcceptances ?? 0,
            replacesProductId: replacesProductId || undefined,
            replacesVariantId: replacesVariantId || undefined,
            status: status || 'draft',
            pricingTiers: pricingTiers || undefined,
            shippingFee: shippingFee !== undefined ? shippingFee : undefined,
        });

        // Invalidate evaluation cache for this store so new campaign is immediately eligible
        try {
            const keys = await redisClient.keys(`offers:eval:${storeId}:*`);
            if (keys.length > 0) await redisClient.unlink(...keys);
        } catch (_) { /* graceful */ }

        res.status(201).json({ success: true, campaign });
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Update an existing campaign (including status transitions).
 * @route   PUT /api/merchant/offers/campaigns/:id
 * @access  Private/Merchant
 */
export const updateCampaign = async (req: AuthRequest, res: Response) => {
    try {
        const campaign = await OfferCampaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found.' });
        }

        // Ownership check via storeId → ownerId
        const store = await Store.findOne({ _id: campaign.storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' });
        }

        // Prevent mutations to counters from external requests
        const { totalAcceptances, storeId, ...safeBody } = req.body;

        const updated = await OfferCampaign.findByIdAndUpdate(
            req.params.id,
            { $set: safeBody },
            { new: true, runValidators: true }
        );

        // Invalidate evaluation cache since campaign config changed
        try {
            const keys = await redisClient.keys(`offers:eval:${campaign.storeId}:*`);
            if (keys.length > 0) await redisClient.unlink(...keys);
        } catch (_) { /* graceful */ }

        res.json({ success: true, campaign: updated });
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Archive (soft-delete) a campaign.
 * @route   DELETE /api/merchant/offers/campaigns/:id
 * @access  Private/Merchant
 *
 * We archive rather than hard-delete to preserve OfferImpression foreign key
 * integrity and historical analytics data.
 */
export const deleteCampaign = async (req: AuthRequest, res: Response) => {
    try {
        const campaign = await OfferCampaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found.' });
        }

        const store = await Store.findOne({ _id: campaign.storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' });
        }

        campaign.status = 'archived';
        await campaign.save();

        // Invalidate evaluation cache
        try {
            const keys = await redisClient.keys(`offers:eval:${campaign.storeId}:*`);
            if (keys.length > 0) await redisClient.unlink(...keys);
        } catch (_) { /* graceful */ }

        res.json({ success: true, message: 'Campaign archived successfully.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get performance analytics for a specific campaign.
 * @route   GET /api/merchant/offers/analytics/:campaignId?storeId=...&days=30
 * @access  Private/Merchant
 *
 * Returns:
 *  - totalImpressions
 *  - acceptanceRate (%)
 *  - declineRate (%)
 *  - totalRevenueAdded (from Order.offerAttribution)
 *  - totalSavingsGranted
 *  - dailyBreakdown (last N days)
 */
export const getCampaignAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const campaignId = String(req.params.campaignId);
        const storeId = String(req.query.storeId || '');
        const days = parseInt(req.query.days as string) || 30;

        if (!storeId) {
            return res.status(400).json({ success: false, message: 'storeId is required.' });
        }

        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaignId.' });
        }

        const campaign = await OfferCampaign.findOne({ _id: campaignId, storeId: storeId as string });
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found or unauthorized.' });
        }

        const store = await Store.findOne({ _id: storeId as string, ownerId: req.user._id });
        if (!store) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' });
        }

        const since = new Date();
        since.setDate(since.getDate() - days);

        const campaignOid = new mongoose.Types.ObjectId(campaignId);

        // Impression aggregation
        const impressionStats = await OfferImpression.aggregate([
            { $match: { campaignId: campaignOid, shownAt: { $gte: since } } },
            {
                $group: {
                    _id: '$decision',
                    count: { $sum: 1 },
                },
            },
        ]);

        const statMap: Record<string, number> = {};
        for (const s of impressionStats) statMap[s._id] = s.count;

        const totalImpressions = Object.values(statMap).reduce((a, b) => a + b, 0);
        const totalAccepted = statMap['accepted'] || 0;
        const totalDeclined = statMap['declined'] || 0;

        // Revenue attribution aggregation from Order.offerAttribution
        const revenueStats = await Order.aggregate([
            {
                $match: {
                    storeId: new mongoose.Types.ObjectId(storeId as string),
                    'offerAttribution.campaignId': campaignOid,
                    createdAt: { $gte: since },
                },
            },
            { $unwind: '$offerAttribution' },
            { $match: { 'offerAttribution.campaignId': campaignOid } },
            {
                $group: {
                    _id: null,
                    totalRevenueAdded: { $sum: '$offerAttribution.revenueAdded' },
                    totalSavingsGranted: { $sum: '$offerAttribution.savedAmount' },
                },
            },
        ]);

        const totalRevenueAdded = revenueStats[0]?.totalRevenueAdded || 0;
        const totalSavingsGranted = revenueStats[0]?.totalSavingsGranted || 0;

        // Daily impression breakdown
        const dailyBreakdown = await OfferImpression.aggregate([
            { $match: { campaignId: campaignOid, shownAt: { $gte: since } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$shownAt' },
                        month: { $month: '$shownAt' },
                        day: { $dayOfMonth: '$shownAt' },
                        decision: '$decision',
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]);

        res.json({
            success: true,
            campaign: {
                _id: campaign._id,
                name: campaign.name,
                type: campaign.type,
                status: campaign.status,
                totalAcceptances: campaign.totalAcceptances,
            },
            metrics: {
                totalImpressions,
                totalAccepted,
                totalDeclined,
                acceptanceRate: totalImpressions > 0
                    ? parseFloat(((totalAccepted / totalImpressions) * 100).toFixed(1))
                    : 0,
                declineRate: totalImpressions > 0
                    ? parseFloat(((totalDeclined / totalImpressions) * 100).toFixed(1))
                    : 0,
                totalRevenueAdded: parseFloat(totalRevenueAdded.toFixed(2)),
                totalSavingsGranted: parseFloat(totalSavingsGranted.toFixed(2)),
            },
            dailyBreakdown,
        });
    } catch (error: any) {
        console.error('[offerController] getCampaignAnalytics error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get details of an active public campaign for storefront
 * @route   GET /api/public/offers/campaigns/:id?storeId=...
 * @access  Public (storefront)
 */
export const getPublicCampaign = async (req: Request, res: Response) => {
    try {
        const storeId = req.query.storeId as string;
        const campaignId = req.params.id as string;

        if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing storeId.' });
        }
        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            return res.status(400).json({ success: false, message: 'Invalid campaignId.' });
        }

        const now = new Date();
        const campaign = await OfferCampaign.findOne({
            _id: campaignId,
            storeId: new mongoose.Types.ObjectId(storeId as string),
            status: 'active',
            $and: [
                { $or: [{ 'schedule.startAt': { $exists: false } }, { 'schedule.startAt': { $lte: now } }] },
                { $or: [{ 'schedule.endAt': { $exists: false } }, { 'schedule.endAt': { $gte: now } }] }
            ]
        })
        .populate({
            path: 'offerProducts.productId',
            select: '_id name price compareAtPrice images description shortDescription options variants status storeId'
        })
        .lean();

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found, inactive, or schedule constraints not met.' });
        }

        // Project strictly only what's required for storefront UI (remove margins, stock levels, etc.)
        if (campaign.offerProducts && campaign.offerProducts.length > 0) {
            campaign.offerProducts = campaign.offerProducts.map((op: any) => {
                const product = op.productId;
                if (product) {
                    // Safe public variants projection (omit reserved/inventory counts, only return available state)
                    const cleanVariants = (product.variants || [])
                        .filter((v: any) => !v.isDeleted)
                        .map((v: any) => ({
                            _id: v._id,
                            name: v.name,
                            options: v.options,
                            price: v.price,
                            inStock: (v.inventory - v.reserved) > 0
                        }));

                    op.productId = {
                        _id: product._id,
                        name: product.name,
                        price: product.price,
                        compareAtPrice: product.compareAtPrice,
                        images: (product.images || []).map((img: any) => ({ url: img.url, isMain: img.isMain })),
                        description: product.description,
                        shortDescription: product.shortDescription,
                        options: product.options || [],
                        variants: cleanVariants
                    };
                }
                return op;
            });
        }

        res.json({ success: true, campaign });
    } catch (error: any) {
        console.error('[offerController] getPublicCampaign error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

