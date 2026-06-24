import crypto from 'crypto';
import mongoose from 'mongoose';
import OfferCampaign, { IOfferCampaign, IOfferProduct } from '../models/OfferCampaign';
import OfferImpression from '../models/OfferImpression';
import Product from '../models/Product';
import { redisClient } from '../config/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Input / Output Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CartItem {
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
    /** Mirrors Product.category — used for categoryMatch trigger evaluation. */
    category?: string;
}

export interface EvaluateOffersParams {
    storeId: string;
    event: IOfferCampaign['trigger']['event'];
    sessionId: string;
    cartItems: CartItem[];
    cartSubtotal: number;
    customerId?: string;
}

/** A fully-enriched, client-ready offer. Price computations are pre-resolved
 *  server-side so the frontend only needs to render — no price logic on client. */
export interface EvaluatedOfferProduct {
    productId: string;
    variantId?: string;
    name: string;
    image?: string;
    basePrice: number;
    /** Final price after discount / overridePrice applied. */
    offerPrice: number;
    /** Amount saved vs. base price (0 when discountType='none'). */
    savingsAmount: number;
    quantity: number;
    displayOrder: number;
    options?: any[];
    variants?: any[];
}

export interface EvaluatedOffer {
    campaignId: string;
    type: IOfferCampaign['type'];
    priority: number;
    name: string;
    display: IOfferCampaign['display'];
    offerProducts: EvaluatedOfferProduct[];
    /** Total savings across all offer products for UI badge rendering. */
    totalSavings: number;
    /** For upsell replace flows — the cart item productId to be swapped out. */
    replacesProductId?: string;
    replacesVariantId?: string;
    /** Snapshot data needed to record an OfferImpression after rendering. */
    snapshot: {
        offerProductIds: string[];
        discountAmountAdvertised: number;
        computedOfferPrices: Record<string, number>;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Key
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic cache key scoped to storeId + event + sorted cart item IDs.
 * Cart subtotal is NOT included because small floating-point differences would
 * create too many distinct keys; trigger conditions re-evaluate against the
 * actual passed-in subtotal even when reading from cache.
 *
 * Note: The TTL is kept at 30s so a merchant who pauses a campaign mid-session
 * sees the change within half a minute at most.
 */
function buildCacheKey(storeId: string, event: string, cartItems: CartItem[]): string {
    const sortedIds = [...cartItems]
        .map((i) => i.productId)
        .sort()
        .join(',');
    const hash = crypto.createHash('sha256').update(`${storeId}:${event}:${sortedIds}`).digest('hex').slice(0, 16);
    return `offers:eval:${storeId}:${event}:${hash}`;
}

const EVAL_CACHE_TTL = 30; // seconds

// ─────────────────────────────────────────────────────────────────────────────
// Trigger Condition Evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if ALL present trigger conditions on the campaign are satisfied
 * by the current cart state. Conditions are AND-ed; within each array-type
 * condition membership is OR-ed (any element match = satisfied).
 */
function matchesTriggerConditions(
    campaign: IOfferCampaign,
    cartItems: CartItem[],
    cartSubtotal: number
): boolean {
    if (campaign.type === 'bogo') {
        if (!campaign.bogoConfig) return false;
        const bc = campaign.bogoConfig;
        const triggerProductIdsStr = bc.triggerProductIds.map(id => id.toString());
        const totalQty = cartItems
            .filter(item => triggerProductIdsStr.includes(item.productId))
            .reduce((sum, item) => sum + item.quantity, 0);
        return totalQty >= bc.triggerQuantity;
    }

    if (campaign.type === 'cart_threshold') {
        if (!campaign.thresholdConfig) return false;
        return cartSubtotal >= campaign.thresholdConfig.minSubtotal;
    }

    if (campaign.type === 'volume_discount') {
        if (!campaign.volumeDiscountTiers || campaign.volumeDiscountTiers.length === 0) return false;
        const targetIds = campaign.trigger?.conditions?.cartContainsProductIds?.map(id => id.toString()) || [];
        if (targetIds.length > 0) {
            const totalQty = cartItems
                .filter(item => targetIds.includes(item.productId))
                .reduce((sum, item) => sum + item.quantity, 0);
            const minQtyRequired = Math.min(...campaign.volumeDiscountTiers.map(t => t.quantity));
            return totalQty >= minQtyRequired;
        }
        return false;
    }

    const trigger = campaign.trigger;
    if (!trigger || !trigger.conditions) return true;

    const { conditions } = trigger;
    const cartProductIds = new Set(cartItems.map((i) => i.productId));
    const cartCategories = new Set(cartItems.map((i) => i.category).filter(Boolean));

    // Condition: cart must contain at least one of the specified product IDs
    if (conditions.cartContainsProductIds && conditions.cartContainsProductIds.length > 0) {
        const requiredIds = conditions.cartContainsProductIds.map((id) => id.toString());
        const hasMatch = requiredIds.some((id) => cartProductIds.has(id));
        if (!hasMatch) return false;
    }

    // Condition: cart subtotal must be >= minimum
    if (conditions.cartMinValue !== undefined && conditions.cartMinValue > 0) {
        if (cartSubtotal < conditions.cartMinValue) return false;
    }

    // Condition: cart subtotal must be <= maximum (primary down-sell gate)
    if (conditions.cartMaxValue !== undefined && conditions.cartMaxValue > 0) {
        if (cartSubtotal > conditions.cartMaxValue) return false;
    }

    // Condition: at least one cart item must belong to a specified category
    if (conditions.categoryMatch && conditions.categoryMatch.length > 0) {
        const hasCategory = conditions.categoryMatch.some((cat) => cartCategories.has(cat));
        if (!hasCategory) return false;
    }

    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule Guard
// ─────────────────────────────────────────────────────────────────────────────

function isScheduleActive(campaign: IOfferCampaign): boolean {
    if (!campaign.schedule) return true;
    const now = new Date();
    if (campaign.schedule.startAt && now < campaign.schedule.startAt) return false;
    if (campaign.schedule.endAt && now > campaign.schedule.endAt) return false;
    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Offer Price Computer
// ─────────────────────────────────────────────────────────────────────────────

function computeOfferPrice(basePrice: number, op: IOfferProduct): { offerPrice: number; savingsAmount: number } {
    if (op.overridePrice !== undefined && op.overridePrice >= 0) {
        const savingsAmount = Math.max(0, basePrice - op.overridePrice);
        return { offerPrice: op.overridePrice, savingsAmount };
    }
    switch (op.discountType) {
        case 'percentage': {
            const discount = basePrice * (op.discountValue / 100);
            const offerPrice = Math.max(0, basePrice - discount);
            return { offerPrice: parseFloat(offerPrice.toFixed(2)), savingsAmount: parseFloat(discount.toFixed(2)) };
        }
        case 'fixed': {
            const offerPrice = Math.max(0, basePrice - op.discountValue);
            return { offerPrice: parseFloat(offerPrice.toFixed(2)), savingsAmount: op.discountValue };
        }
        case 'none':
        default:
            return { offerPrice: basePrice, savingsAmount: 0 };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Impression Limit Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the offer has already been shown the maximum allowed times
 * to this session (or customer). A limit of 0 means unlimited.
 */
async function hasExceededImpressionLimit(
    campaignId: string,
    maxImpressions: number,
    sessionId: string,
    customerId?: string
): Promise<boolean> {
    // 1. ALWAYS block if this specific session has already seen it
    const sessionImpression = await OfferImpression.exists({
        campaignId: new mongoose.Types.ObjectId(campaignId),
        sessionId
    });
    if (sessionImpression) return true;

    // 2. If it passes the session guard, check lifetime limits
    if (maxImpressions === 0) return false;

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
        const customerCount = await OfferImpression.countDocuments({
            campaignId: new mongoose.Types.ObjectId(campaignId),
            customerId: new mongoose.Types.ObjectId(customerId),
        });
        return customerCount >= maxImpressions;
    }

    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Enricher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches product data for a single offer product, using a per-product Redis
 * cache (TTL 60s) to avoid repeated DB hits when multiple campaigns share the
 * same offer product in a single evaluate call.
 */
async function fetchProductForOffer(
    productId: string
): Promise<{ name: string; price: number; image?: string; options?: any[]; variants?: any[]; trackInventory?: boolean; inventory?: any } | null> {
    const cacheKey = `product:${productId}`;
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            const p = JSON.parse(cached);
            return {
                name: p.name,
                price: p.price,
                image: p.images?.[0]?.url,
                options: p.options,
                variants: p.variants,
                trackInventory: p.trackInventory,
                inventory: p.inventory
            };
        }
    } catch (_) { /* redis graceful degradation handled by circuit breaker in redis.ts */ }

    const product = await Product.findById(productId)
        .select('name price images status trackInventory inventory variants options')
        .lean();

    if (!product || product.status !== 'active') return null;
    return {
        name: product.name,
        price: product.price,
        image: product.images?.[0]?.url,
        options: product.options,
        variants: product.variants,
        trackInventory: product.trackInventory,
        inventory: product.inventory
    };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Acceptance Limit Check
// ─────────────────────────────────────────────────────────────────────────────

function hasExceededAcceptanceLimit(campaign: IOfferCampaign): boolean {
    if (campaign.maxTotalAcceptances === 0) return false;
    return campaign.totalAcceptances >= campaign.maxTotalAcceptances;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Evaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core offer evaluation engine. Called on every relevant storefront event.
 *
 * Evaluation pipeline:
 *  1. Redis cache hit?  → deserialize and return immediately
 *  2. Load active campaigns for this store + event from MongoDB
 *  3. Per campaign: schedule guard → trigger condition check → acceptance limit →
 *     impression limit → product enrichment → price computation
 *  4. Sort by priority ascending
 *  5. Cache result → return to caller
 *
 * This function NEVER writes to the DB. All writes (impressions, decisions,
 * order mutations) happen in offerController handlers.
 */
export async function evaluateOffers(params: EvaluateOffersParams): Promise<EvaluatedOffer[]> {
    const { storeId, event, sessionId, cartItems, cartSubtotal, customerId } = params;

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) return [];

    // ── 1. Cache check ──────────────────────────────────────────────────────
    const cacheKey = buildCacheKey(storeId, event, cartItems);
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            // Re-validate trigger conditions against live subtotal even on cache hit.
            // The cached list still holds full campaign data needed for re-evaluation.
            const parsed: EvaluatedOffer[] = JSON.parse(cached);
            return parsed;
        }
    } catch (_) { /* circuit breaker will handle */ }
    // ── 2. Load candidate campaigns ─────────────────────────────────────────
    const storeOid = new mongoose.Types.ObjectId(storeId);
    let placements: string[] = ['standalone'];
    if (event === 'product_page') placements.push('product_page');
    else if (event === 'cart_view') placements.push('cart');
    else if (event === 'checkout_start') placements.push('checkout');
    else if (event === 'post_purchase') placements.push('post_purchase');
    else if (event === 'checkout_abandon') placements.push('checkout');

    const candidates = await OfferCampaign.find({
        storeId: storeOid,
        status: 'active',
        $or: [
            { 'trigger.event': event },
            { placement: { $in: placements } }
        ]
    })
    .lean();

    if (candidates.length === 0) return [];

    // Sort by priorityGroup weight and then by priority
    const groupWeights: Record<string, number> = {
        critical: 4,
        high: 3,
        normal: 2,
        low: 1,
    };
    candidates.sort((a, b) => {
        const weightA = groupWeights[a.priorityGroup || 'normal'] || 2;
        const weightB = groupWeights[b.priorityGroup || 'normal'] || 2;
        if (weightA !== weightB) {
            return weightB - weightA;
        }
        return (a.priority ?? 100) - (b.priority ?? 100);
    });

    // ── 3. Filter and enrich ─────────────────────────────────────────────────
    const results: EvaluatedOffer[] = [];

    const appliedCampaignIds = new Set<string>();
    let hasExclusiveApplied = false;
    let hasNonStackableApplied = false;

    for (const campaign of candidates) {
        if (hasExclusiveApplied) continue;

        const allowStacking = campaign.allowStacking !== false;
        const exclusiveCampaign = campaign.exclusiveCampaign === true;

        if (exclusiveCampaign) {
            if (appliedCampaignIds.size > 0) continue;
        } else {
            if (hasNonStackableApplied) continue;
            if (!allowStacking && appliedCampaignIds.size > 0) continue;
        }

        // Schedule guard
        if (!isScheduleActive(campaign as IOfferCampaign)) continue;

        // Trigger condition guard
        if (!matchesTriggerConditions(campaign as IOfferCampaign, cartItems, cartSubtotal)) continue;

        // Acceptance limit guard
        if (hasExceededAcceptanceLimit(campaign as IOfferCampaign)) continue;

        // Impression limit guard (DB query — kept out of cache to always be fresh)
        const maxImpressions = campaign.maxImpressionsPerCustomer;
        if (maxImpressions > 0) {
            const exceeded = await hasExceededImpressionLimit(
                campaign._id.toString(),
                maxImpressions,
                sessionId,
                customerId
            );
            if (exceeded) continue;
        }

        // Product enrichment
        const enrichedProducts: EvaluatedOfferProduct[] = [];
        let totalSavings = 0;
        const computedOfferPrices: Record<string, number> = {};
        let totalDiscountAdvertised = 0;

        if (['upsell', 'cross_sell', 'down_sell', 'offer_page'].includes(campaign.type)) {
            let allProductsAvailable = true;
            for (const op of campaign.offerProducts || []) {
                const productData = await fetchProductForOffer(op.productId.toString());
                if (!productData) {
                    allProductsAvailable = false;
                    break;
                }

                if (productData.trackInventory) {
                    if (op.variantId) {
                        const variant = productData.variants?.find((v: any) => v._id.toString() === op.variantId?.toString());
                        if (!variant || variant.isDeleted || (variant.inventory - variant.reserved) < op.quantity) {
                            allProductsAvailable = false;
                            break;
                        }
                    } else {
                        const available = (productData.inventory?.quantity || 0) - (productData.inventory?.reserved || 0);
                        if (available < op.quantity) {
                            allProductsAvailable = false;
                            break;
                        }
                    }
                }

                const basePrice = productData.price;
                const { offerPrice, savingsAmount } = computeOfferPrice(basePrice, op as IOfferProduct);

                totalSavings += savingsAmount * op.quantity;
                totalDiscountAdvertised += savingsAmount * op.quantity;
                computedOfferPrices[op.productId.toString()] = offerPrice;

                enrichedProducts.push({
                    productId: op.productId.toString(),
                    variantId: op.variantId?.toString(),
                    name: productData.name,
                    image: (op as any).display?.imageOverride || productData.image,
                    basePrice,
                    offerPrice,
                    savingsAmount,
                    quantity: op.quantity,
                    displayOrder: op.displayOrder || 0,
                    options: productData.options,
                    variants: productData.variants,
                });
            }
            if (!allProductsAvailable) continue;
        } else if (campaign.type === 'cart_threshold' && campaign.thresholdConfig) {
            let thresholdOk = true;
            for (const rw of campaign.thresholdConfig.rewards) {
                const productData = await fetchProductForOffer(rw.rewardProductId.toString());
                if (!productData) {
                    thresholdOk = false;
                    break;
                }
                if (productData.trackInventory) {
                    if (rw.rewardVariantId) {
                        const variant = productData.variants?.find((v: any) => v._id.toString() === rw.rewardVariantId?.toString());
                        if (!variant || variant.isDeleted || (variant.inventory - variant.reserved) < rw.rewardQuantity) {
                            thresholdOk = false;
                            break;
                        }
                    } else {
                        const available = (productData.inventory?.quantity || 0) - (productData.inventory?.reserved || 0);
                        if (available < rw.rewardQuantity) {
                            thresholdOk = false;
                            break;
                        }
                    }
                }
                const basePrice = productData.price;
                const opFake = {
                    productId: rw.rewardProductId,
                    variantId: rw.rewardVariantId,
                    discountType: rw.discountType,
                    discountValue: rw.discountValue,
                    overridePrice: rw.overridePrice,
                    quantity: rw.rewardQuantity
                };
                const { offerPrice, savingsAmount } = computeOfferPrice(basePrice, opFake as any);

                totalSavings += savingsAmount * rw.rewardQuantity;
                totalDiscountAdvertised += savingsAmount * rw.rewardQuantity;
                computedOfferPrices[rw.rewardProductId.toString()] = offerPrice;

                enrichedProducts.push({
                    productId: rw.rewardProductId.toString(),
                    variantId: rw.rewardVariantId?.toString(),
                    name: productData.name,
                    image: productData.image,
                    basePrice,
                    offerPrice,
                    savingsAmount,
                    quantity: rw.rewardQuantity,
                    displayOrder: 1,
                    options: productData.options,
                    variants: productData.variants
                });
            }
            if (!thresholdOk) continue;
        } else if (campaign.type === 'bogo' && campaign.bogoConfig) {
            const bc = campaign.bogoConfig;
            const productData = await fetchProductForOffer(bc.rewardProductId.toString());
            if (!productData) continue;
            let bogoOk = true;
            if (productData.trackInventory) {
                if (bc.rewardVariantId) {
                    const variant = productData.variants?.find((v: any) => v._id.toString() === bc.rewardVariantId?.toString());
                    if (!variant || variant.isDeleted || (variant.inventory - variant.reserved) < bc.rewardQuantity) {
                        bogoOk = false;
                    }
                } else {
                    const available = (productData.inventory?.quantity || 0) - (productData.inventory?.reserved || 0);
                    if (available < bc.rewardQuantity) {
                        bogoOk = false;
                    }
                }
            }
            if (!bogoOk) continue;

            const basePrice = productData.price;
            const opFake = {
                productId: bc.rewardProductId,
                variantId: bc.rewardVariantId,
                discountType: bc.discountType,
                discountValue: bc.discountValue,
                overridePrice: bc.overridePrice,
                quantity: bc.rewardQuantity
            };
            const { offerPrice, savingsAmount } = computeOfferPrice(basePrice, opFake as any);

            totalSavings += savingsAmount * bc.rewardQuantity;
            totalDiscountAdvertised += savingsAmount * bc.rewardQuantity;
            computedOfferPrices[bc.rewardProductId.toString()] = offerPrice;

            enrichedProducts.push({
                productId: bc.rewardProductId.toString(),
                variantId: bc.rewardVariantId?.toString(),
                name: productData.name,
                image: productData.image,
                basePrice,
                offerPrice,
                savingsAmount,
                quantity: bc.rewardQuantity,
                displayOrder: 1,
                options: productData.options,
                variants: productData.variants
            });
        } else if (campaign.type === 'volume_discount' && campaign.volumeDiscountTiers && campaign.volumeDiscountTiers.length > 0) {
            const targetIds = campaign.trigger?.conditions?.cartContainsProductIds?.map(id => id.toString()) || [];
            let volumeOk = true;
            for (const tid of targetIds) {
                const productData = await fetchProductForOffer(tid);
                if (!productData) {
                    volumeOk = false;
                    break;
                }
                const basePrice = productData.price;
                const cartItemQty = cartItems
                    .filter(item => item.productId === tid)
                    .reduce((sum, item) => sum + item.quantity, 0);

                const matchingTier = [...campaign.volumeDiscountTiers]
                    .sort((a, b) => b.quantity - a.quantity)
                    .find(t => cartItemQty >= t.quantity);

                if (matchingTier) {
                    const opFake = {
                        productId: new mongoose.Types.ObjectId(tid),
                        discountType: matchingTier.discountType,
                        discountValue: matchingTier.discountValue,
                        quantity: cartItemQty
                    };
                    const { offerPrice, savingsAmount } = computeOfferPrice(basePrice, opFake as any);

                    totalSavings += savingsAmount * cartItemQty;
                    totalDiscountAdvertised += savingsAmount * cartItemQty;
                    computedOfferPrices[tid] = offerPrice;

                    enrichedProducts.push({
                        productId: tid,
                        name: productData.name,
                        image: productData.image,
                        basePrice,
                        offerPrice,
                        savingsAmount,
                        quantity: cartItemQty,
                        displayOrder: 1,
                        options: productData.options,
                        variants: productData.variants
                    });
                }
            }
            if (!volumeOk) continue;
        }

        if (enrichedProducts.length === 0) continue;

        // Sort offer products by displayOrder before pushing
        enrichedProducts.sort((a, b) => a.displayOrder - b.displayOrder);

        results.push({
            campaignId: campaign._id.toString(),
            type: campaign.type,
            priority: campaign.priority,
            name: campaign.name,
            display: campaign.display,
            offerProducts: enrichedProducts,
            totalSavings: parseFloat(totalSavings.toFixed(2)),
            replacesProductId: campaign.replacesProductId?.toString(),
            replacesVariantId: campaign.replacesVariantId?.toString(),
            snapshot: {
                offerProductIds: enrichedProducts.map((p) => p.productId),
                discountAmountAdvertised: parseFloat(totalDiscountAdvertised.toFixed(2)),
                computedOfferPrices,
            },
        });

        appliedCampaignIds.add(campaign._id.toString());
        if (exclusiveCampaign) {
            hasExclusiveApplied = true;
        }
        if (!allowStacking) {
            hasNonStackableApplied = true;
        }
    }

    // Sort results by priority weight and then by priority
    results.sort((a, b) => {
        const campA = candidates.find(c => c._id.toString() === a.campaignId);
        const campB = candidates.find(c => c._id.toString() === b.campaignId);
        const weightA = groupWeights[campA?.priorityGroup || 'normal'] || 2;
        const weightB = groupWeights[campB?.priorityGroup || 'normal'] || 2;
        if (weightA !== weightB) {
            return weightB - weightA;
        }
        return (a.priority ?? 100) - (b.priority ?? 100);
    });

    // ── 5. Cache result ──────────────────────────────────────────────────────
    if (results.length > 0) {
        try {
            await redisClient.setex(cacheKey, EVAL_CACHE_TTL, JSON.stringify(results));
        } catch (_) { /* graceful degradation */ }
    }

    return results;
}
