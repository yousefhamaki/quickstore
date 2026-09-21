import { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import Store from '../models/Store';
import Coupon from '../models/Coupon';
import mongoose from 'mongoose';
import Customer from '../models/Customer';
import OfferCampaign from '../models/OfferCampaign';
import OfferImpression from '../models/OfferImpression';
import { processOrderFee } from './billingController';
import InventoryLog from '../models/InventoryLog';
import { PaymentFactory } from '../services/payment/PaymentFactory';
import { clearStoreProductCaches } from './productController';
import { redisClient } from '../config/redis';
import { createNotification } from '../services/notificationService';
import { sendGatedCustomerEmail } from '../services/orderEmailService';
import { sendGatedWhatsAppMessage } from '../services/whatsapp/whatsappMessageService';
import { sendNewOrderOwnerEmail } from '../services/emailService';
import User from '../models/User';
import { getStoreSalePrice } from '../utils/storeSale';
import { isCouponEligible, computeCouponDiscount } from '../utils/couponPricing';
import { resolveGovernorateKey } from '../constants/egyptianGovernorates';

/**
 * Single shared shipping-fee resolution used by BOTH the campaign
 * (bundle/offer) and standard checkout paths below — previously these had
 * diverged: only the campaign path ever consulted
 * store.settings.shipping.zones at all, and even then its zone-matching
 * fell back to whichever zone happened to be first in the array when
 * nothing matched the customer's city. Standard (non-campaign) checkouts —
 * the vast majority of real orders — ignored zones entirely and always
 * charged a hardcoded 50 EGP.
 *
 * Resolution order:
 *   1. An explicit campaign.shippingFee override (campaign checkouts only,
 *      unchanged existing behavior — campaigns can still override
 *      everything).
 *   2. A zone whose `governorate` matches shippingAddress.state (primary,
 *      canonical match going forward — case-insensitive, normalized
 *      against EGYPTIAN_GOVERNORATES's keys/names).
 *   3. A zone whose legacy `cities` list includes shippingAddress.city
 *      (backward compatibility for zones a merchant manually created
 *      before the governorate picker existed).
 *   4. store.settings.shipping.standardRate — the merchant-configured
 *      default — NOT an arbitrary zones[0].rate fallback.
 */
export function resolveShippingFee(
    store: any,
    shippingAddress: { city?: string; state?: string } | undefined,
    campaign?: any
): number {
    if (campaign && campaign.shippingFee !== undefined && campaign.shippingFee !== null) {
        return campaign.shippingFee;
    }

    const standardRate = store?.settings?.shipping?.standardRate ?? 50;
    const zones: any[] = store?.settings?.shipping?.zones || [];
    if (zones.length === 0) {
        return standardRate;
    }

    const rawState = shippingAddress?.state;
    if (rawState) {
        const normalizedState = resolveGovernorateKey(rawState) || rawState.toString().trim().toLowerCase();
        const governorateZone = zones.find((z) =>
            z.governorate && z.governorate.toString().trim().toLowerCase() === normalizedState
        );
        if (governorateZone) {
            return governorateZone.rate;
        }
    }

    const city = shippingAddress?.city;
    if (city) {
        const cityZone = zones.find((z) => Array.isArray(z.cities) && z.cities.includes(city));
        if (cityZone) {
            return cityZone.rate;
        }
    }

    return standardRate;
}

// @desc    Create new order from storefront
// @route   POST /api/public/orders
// @access  Public
export const createPublicOrder = async (req: Request, res: Response) => {
    try {
        const {
            storeId,
            campaignId,
            selectedQuantity,
            variantId,
            customer: customerData,
            shippingAddress,
            paymentMethod,
            couponCode,
            discountAmount
        } = req.body;

        let { items, totalAmount } = req.body;
        let campaign: any = null;
        let resolvedSubtotal = 0;
        let resolvedUnitPrice = 0;
        let qty = 1;
        let shippingFee = 0;
        let campaignProductOriginalPrice = 0;

        // If campaignId is provided, perform campaign-specific lookup and validations
        if (campaignId) {
            if (!mongoose.Types.ObjectId.isValid(storeId)) {
                return res.status(400).json({ message: 'Invalid store ID' });
            }
            if (!mongoose.Types.ObjectId.isValid(campaignId)) {
                return res.status(400).json({ message: 'Invalid campaign ID' });
            }

            // Validate phone number format (Egyptian format checks)
            const phoneRegex = /^01[0125]\d{8}$/;
            if (!phoneRegex.test(customerData?.phone)) {
                return res.status(400).json({ message: 'Invalid Egyptian phone number. Must be 11 digits starting with 010, 011, 012, or 015.' });
            }

            // Validate store exists
            const oidStoreId = new mongoose.Types.ObjectId(storeId);
            const store = await Store.findById(oidStoreId).populate({
                path: 'subscriptionId',
                populate: { path: 'planId' }
            });
            if (!store) {
                return res.status(404).json({ message: 'Store not found' });
            }

            // Load active campaign matching tenant context and schedules
            const now = new Date();
            campaign = await OfferCampaign.findOne({
                _id: new mongoose.Types.ObjectId(campaignId),
                storeId: oidStoreId,
                status: 'active',
                $and: [
                    { $or: [{ 'schedule.startAt': { $exists: false } }, { 'schedule.startAt': { $lte: now } }] },
                    { $or: [{ 'schedule.endAt': { $exists: false } }, { 'schedule.endAt': { $gte: now } }] }
                ]
            });
            if (!campaign) {
                return res.status(404).json({ message: 'Campaign not found, inactive, or outside schedule constraints.' });
            }

            // Verify quantity matches pricing tiers
            qty = Number(selectedQuantity || 1);
            const matchedTier = campaign.pricingTiers?.find((t: any) => t.quantity === qty);
            if (!matchedTier) {
                return res.status(400).json({ message: 'Invalid quantity bundle selected. Pricing is only configured for specific quantity tiers.' });
            }
            resolvedSubtotal = matchedTier.totalPrice;
            resolvedUnitPrice = Number((resolvedSubtotal / qty).toFixed(2));

            // Load product and validate variant ownership + active status
            const product = await Product.findById(campaign.offerProducts[0].productId);
            if (!product || product.status !== 'active') {
                return res.status(400).json({ message: 'Product is no longer available.' });
            }
            campaignProductOriginalPrice = product.price;
            if (product.storeId.toString() !== storeId.toString()) {
                return res.status(400).json({ message: 'Product does not belong to this store.' });
            }

            // Resolve selectedVariants array
            let resolvedVariants: { variantId?: string; quantity: number }[] = [];
            if (req.body.selectedVariants && Array.isArray(req.body.selectedVariants) && req.body.selectedVariants.length > 0) {
                resolvedVariants = req.body.selectedVariants;
            } else {
                resolvedVariants = [{ variantId: variantId || undefined, quantity: qty }];
            }

            // Verify sum of quantities matches qty
            const totalQtySelected = resolvedVariants.reduce((sum, rv) => sum + Number(rv.quantity), 0);
            if (totalQtySelected !== qty) {
                return res.status(400).json({ message: 'Total quantity of selected variants must match the bundle quantity.' });
            }

            // Validate each variant
            for (const rv of resolvedVariants) {
                if (rv.variantId) {
                    const variant = product.variants.find((v: any) => v._id.toString() === rv.variantId && !v.isDeleted);
                    if (!variant) {
                        return res.status(400).json({ message: 'One or more selected variants is invalid or no longer available.' });
                    }
                } else if (product.variants && product.variants.some((v: any) => !v.isDeleted)) {
                    return res.status(400).json({ message: 'Please select a product variant for each unit.' });
                }
            }



            // Resolve Shipping Fee Hierarchy — shared with the standard
            // checkout path below via resolveShippingFee() (see top of
            // file). `store` here is the same store already loaded above
            // for this campaign checkout.
            shippingFee = resolveShippingFee(store, shippingAddress, campaign);

            // Calculate taxes
            const taxRate = store.settings?.tax?.enabled ? store.settings.tax.rate / 100 : 0;
            const taxAmount = parseFloat((resolvedSubtotal * taxRate).toFixed(2));

            // Calculate final totalAmount
            totalAmount = resolvedSubtotal + shippingFee + taxAmount - Number(discountAmount || 0);

            // Construct standard items list for subsequent processing
            items = resolvedVariants.map(rv => {
                const matchedVariant = rv.variantId 
                    ? product.variants.find((v: any) => v._id.toString() === rv.variantId)
                    : null;
                return {
                    _id: product._id.toString(),
                    name: product.name,
                    quantity: Number(rv.quantity),
                    price: resolvedUnitPrice,
                    image: product.images?.[0]?.url,
                    variantId: rv.variantId || undefined,
                    selectedOptions: matchedVariant?.options || undefined,
                    trackInventory: product.trackInventory
                };
            });
        }

        // Standard order validations (for general checkouts without campaign)
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            return res.status(400).json({ message: 'Invalid store ID' });
        }

        const oidStoreId = new mongoose.Types.ObjectId(storeId);

        // Validate store exists
        const store = campaignId ? null : await Store.findById(oidStoreId).populate({
            path: 'subscriptionId',
            populate: { path: 'planId' }
        });

        if (!campaignId && !store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const activeStore = campaignId ? (await Store.findById(oidStoreId).populate({
            path: 'subscriptionId',
            populate: { path: 'planId' }
        })) : store;

        if (!activeStore) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Find or create customer
        let customer = await Customer.findOne({ storeId: oidStoreId, email: customerData.email });
        if (!customer) {
            customer = new Customer({
                storeId: oidStoreId,
                firstName: customerData.firstName,
                lastName: customerData.lastName,
                email: customerData.email,
                phone: customerData.phone,
                addresses: [{
                    fullName: `${customerData.firstName} ${customerData.lastName}`,
                    phone: customerData.phone,
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    // The checkout form now collects a real governorate
                    // selector (see Task 4 doc-comment on the checkout page)
                    // which populates `state`; fall back to city for older
                    // clients that never sent one.
                    state: shippingAddress.state || shippingAddress.city,
                    postalCode: shippingAddress.zipCode || '00000',
                    country: 'Egypt',
                    isDefault: true
                }]
            });
            await customer.save();
        }

        // Pre-check products and inventory
        for (const item of items) {
            const product = await Product.findById(item._id);
            if (!product) {
                return res.status(400).json({ success: false, message: `Product ${item.name} no longer exists.` });
            }
            if (product.status !== 'active') {
                return res.status(400).json({ success: false, message: `Product ${item.name} is no longer available.` });
            }

            let matchedVariant: any = null;
            if (item.variantId) {
                matchedVariant = product.variants.find((v: any) => v._id.toString() === item.variantId.toString());
            }

            // Stock check (if tracking enabled)
            if (product.trackInventory) {
                if (item.variantId) {
                    if (!matchedVariant || matchedVariant.isDeleted) {
                        return res.status(400).json({ success: false, message: `Selected variant for ${product.name} no longer exists.` });
                    }
                    const available = (matchedVariant.inventory || 0) - (matchedVariant.reserved || 0);
                    if (available < item.quantity) {
                        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name} (${matchedVariant.name}). Only ${available} left.` });
                    }
                } else {
                    const available = (product.inventory.quantity || 0) - (product.inventory.reserved || 0);
                    if (available < item.quantity) {
                        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}. Only ${available} left.` });
                    }
                }
            }

            // ================================================================
            // PRICING INTEGRITY FIX: never trust the client-submitted
            // item.price for the amount actually charged/recorded. Campaign
            // checkouts (campaignId set) already computed an authoritative
            // unit price above from the campaign's own pricing tier — that
            // intentionally-discounted bundle price must NOT be overwritten
            // here. Standard storefront checkouts previously trusted
            // req.body's item.price verbatim, so a tampered client request
            // could charge/record any price it liked; resolve the real price
            // from the selected variant (if any) or the base product instead.
            // ================================================================
            if (!campaignId) {
                const resolvedBasePrice = (matchedVariant && typeof matchedVariant.price === 'number')
                    ? matchedVariant.price
                    : product.price;

                // ============================================================
                // STOREWIDE SALE: applied on top of whichever price was just
                // resolved above (base or variant), at this SAME authoritative
                // price-resolution point — never computed only for display.
                // Respects the store's excluded-category list and optional
                // schedule window; a fixed discount larger than the price
                // floors at 0 (see utils/storeSale.ts). Skipped entirely for
                // campaign/offer checkouts (out of scope — those already have
                // their own intentionally-discounted tier pricing).
                // ============================================================
                const { price: saleAdjustedPrice } = getStoreSalePrice(
                    activeStore.settings?.storeSale as any,
                    product.categoryId,
                    resolvedBasePrice
                );
                item.price = saleAdjustedPrice;
            }

            // ================================================================
            // Same pricing-integrity treatment for optional paid extras
            // (Product.extras, e.g. "1-year extended warranty, +100 EGP"): a
            // client can request one by _id, but its price always comes from
            // the product's own extras array, never from the request body.
            // Unmatched/unknown ids (deleted extra, tampered id, etc.) are
            // silently dropped rather than failing the whole order. Their
            // prices are folded into item.price (per unit, like the base/
            // variant price) so they flow through existing quantity*price
            // revenue math (cart totals, analytics) for free — `resolvedExtras`
            // is kept separately only as an audit-trail snapshot for the order.
            // ================================================================
            let resolvedExtras: { name: string; price: number }[] = [];
            if (Array.isArray(item.selectedExtras) && item.selectedExtras.length > 0) {
                const requestedExtraIds = item.selectedExtras
                    .map((e: any) => (e && typeof e === 'object' ? e._id : e))
                    .filter(Boolean)
                    .map((id: any) => id.toString());
                resolvedExtras = (product.extras || [])
                    .filter((ex: any) => requestedExtraIds.includes(ex._id.toString()))
                    .map((ex: any) => ({ name: ex.name, price: ex.price }));
            }
            item.resolvedExtras = resolvedExtras;
            const extrasUnitTotal = resolvedExtras.reduce((sum, ex) => sum + Number(ex.price || 0), 0);
            item.price = Number(item.price) + extrasUnitTotal;

            // Snapshot cost-at-purchase for historical profit analytics (see
            // Order.ts IOrderItem.costAtPurchase and analyticsController.ts).
            // Only one cost field exists at the product level (no per-variant
            // cost yet), so it's used regardless of which variant was ordered.
            // Extras have no cost concept — they're pure add-on revenue and
            // never affect this.
            item.costAtPurchase = typeof product.costPerItem === 'number' ? product.costPerItem : undefined;
        }

        // Generate unique order number
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randomStr = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `QS-${dateStr}-${randomStr}`;

                // For campaign checkouts totalAmount was already computed
        // authoritatively above from the campaign's pricing tier. For
        // standard checkouts this client-submitted value is only a
        // placeholder — it gets recomputed from authoritative item prices
        // once the coupon discount is finalized below (see "PRICING
        // INTEGRITY FIX (continued)").
        let numericTotal = Number(totalAmount);
        // Standard (non-campaign) checkouts resolve their fee here, now
        // that `activeStore` is available — same shared resolveShippingFee()
        // used by the campaign branch above, so the two paths can never
        // diverge again. No campaign object passed here: `campaign` is only
        // ever set when campaignId is truthy, in which case shippingFee was
        // already resolved above.
        const resolvedShippingFee = campaignId ? shippingFee : resolveShippingFee(activeStore, shippingAddress);
        let finalDiscount = Number(discountAmount || 0);

        let session: mongoose.ClientSession | null = null;
        // Standalone MongoDB (common in local dev) does not support transactions.
        const isLocalStandalone = process.env.MONGODB_URI?.includes('localhost') && !process.env.MONGODB_URI?.includes('replicaSet');

        if (!isLocalStandalone) {
            try {
                session = await mongoose.startSession();
                session.startTransaction();
            } catch (e) {
                session = null;
            }
        }

        try {
            // ================================================================
            // Coupon resolution — reuses the exact same eligibility
            // (isCouponEligible) and discount (computeCouponDiscount) helpers
            // from utils/couponPricing.ts as validateCoupon and
            // getAutoApplyCoupon (publicController.ts), so nothing here can
            // diverge from what the shopper was shown at checkout. Never
            // trusts the client for which coupon applies or how much it's
            // worth — always recomputed from the DB coupon doc(s) and the
            // server-resolved cartSubtotal below.
            //
            // Precedence when BOTH a manually-typed code AND an eligible
            // auto-apply coupon exist: whichever yields the LARGER discount
            // wins; an exact tie favors the manually-typed code (a shopper
            // who bothered to type a code gets it, rather than being
            // silently switched to an auto-surfaced one of equal value).
            // Auto-apply coupons never stack with each other — at most one
            // coupon (manual or auto) ever applies to an order.
            // ================================================================
            const cartSubtotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);
            const customerEmail: string | undefined = customerData?.email;

            let manualCoupon: any = null;
            if (couponCode) {
                manualCoupon = await Coupon.findOne({
                    storeId: oidStoreId,
                    code: couponCode.toUpperCase(),
                    isActive: true
                }).session(session);
            }

            const autoApplyCoupons = await Coupon.find({
                storeId: oidStoreId,
                isActive: true,
                autoApply: true
            }).session(session);

            const candidates: any[] = [...(manualCoupon ? [manualCoupon] : []), ...autoApplyCoupons];
            let chosenCoupon: any = null;
            let bestDiscount = -1;
            for (const candidate of candidates) {
                if (!isCouponEligible(candidate, cartSubtotal, customerEmail)) continue;
                const discount = computeCouponDiscount(candidate, cartSubtotal, resolvedShippingFee);
                const isManual = manualCoupon && candidate._id.equals(manualCoupon._id);
                if (discount > bestDiscount || (discount === bestDiscount && isManual)) {
                    bestDiscount = discount;
                    chosenCoupon = candidate;
                }
            }

            let appliedCouponCode: string | undefined = couponCode || undefined;
            if (chosenCoupon) {
                finalDiscount = bestDiscount;
                appliedCouponCode = chosenCoupon.code;
                chosenCoupon.usageCount += 1;
                await chosenCoupon.save({ session: session || undefined });
            } else if (!campaignId) {
                // Standard checkout with no eligible coupon at all (manual or
                // auto-apply): never fall back to a client-submitted discount.
                finalDiscount = 0;
                appliedCouponCode = undefined;
            }
            // NOTE: a campaign (offer) checkout with no eligible coupon keeps
            // whatever discountAmount it already computed earlier from the
            // campaign's own pricing tier (out of scope — OfferCampaign is a
            // separate system, see module doc-comment at the top of this file).

            // ================================================================
            // PRICING INTEGRITY FIX (continued): for standard checkouts, the
            // order total must be derived from the authoritative per-item
            // prices resolved during the pre-check loop above, plus shipping,
            // minus the now-finalized coupon discount — never from the
            // client-submitted totalAmount, or a tampered request could set
            // totalAmount to whatever it wants regardless of what the items
            // actually cost. Campaign checkouts already computed an
            // authoritative totalAmount server-side earlier, so they're left
            // untouched here.
            // ================================================================
            if (!campaignId) {
                // cartSubtotal was already computed authoritatively above
                // (from the same resolved item prices) for the coupon check.
                numericTotal = Number((cartSubtotal + resolvedShippingFee - finalDiscount).toFixed(2));
            }

            // Calculate transaction fee based on plan
            const plan = (activeStore.subscriptionId as any)?.planId;
            const feePercent = plan?.transactionFeePercent || 0;
            const transactionFee = Number((numericTotal * (feePercent / 100)).toFixed(2));

            // Create the order
            const order = new Order({
                storeId: oidStoreId,
                customerId: customer._id,
                orderNumber,
                items: items.map((item: any) => ({
                    productId: new mongoose.Types.ObjectId(item._id),
                    // Previously never persisted, even though orderController.ts's
                    // cancel/fulfillment stock release relies on it to target the
                    // right variant — without this every variant order silently
                    // released/decremented base inventory instead.
                    variantId: item.variantId ? new mongoose.Types.ObjectId(item.variantId) : undefined,
                    name: item.name,
                    quantity: Number(item.quantity),
                    price: Number(item.price),
                    costAtPurchase: item.costAtPurchase,
                    extras: (item.resolvedExtras && item.resolvedExtras.length > 0) ? item.resolvedExtras : undefined,
                    image: item.image,
                    variant: item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : undefined
                })),
                subtotal: (numericTotal - resolvedShippingFee + finalDiscount),
                shipping: resolvedShippingFee,
                discount: finalDiscount,
                total: numericTotal,
                // Records whichever coupon actually applied (manual or
                // auto-apply) — NOT necessarily the client's submitted
                // couponCode — so a later cancel/refund correctly reverses
                // usageCount on the right coupon (see orderController's
                // updateOrderStatus) and the order's own history is accurate.
                couponCode: appliedCouponCode,
                transactionFee,
                status: 'pending',
                paymentStatus: 'pending',
                paymentMethod: paymentMethod === 'COD' ? 'Cash on Delivery' : paymentMethod,
                shippingAddress: {
                    fullName: `${customerData.firstName} ${customerData.lastName}`,
                    phone: customerData.phone,
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    state: shippingAddress.state || shippingAddress.city,
                    postalCode: shippingAddress.zipCode || '00000',
                    country: 'Egypt'
                },
                billingAddress: {
                    fullName: `${customerData.firstName} ${customerData.lastName}`,
                    phone: customerData.phone,
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    state: shippingAddress.state || shippingAddress.city,
                    postalCode: shippingAddress.zipCode || '00000',
                    country: 'Egypt'
                },
                timeline: [{
                    status: 'pending',
                    note: 'Order placed via storefront'
                }]
            });

            if (campaignId && campaign) {
                const offerProductConfig = campaign.offerProducts[0];
                order.offerAttribution = [{
                    campaignId: campaign._id,
                    campaignName: campaign.name,
                    offerType: 'offer_page',
                    productId: offerProductConfig.productId,
                    productName: items[0].name,
                    tierQuantity: qty,
                    tierPrice: resolvedSubtotal,
                    shippingFee: resolvedShippingFee,
                    orderSource: 'offer_page',
                    acceptedAt: new Date(),
                    revenueAdded: resolvedSubtotal,
                    savedAmount: Math.max(0, (campaignProductOriginalPrice * qty) - resolvedSubtotal),
                    campaignRevenue: campaignProductOriginalPrice * qty,
                    discountAmount: Math.max(0, (campaignProductOriginalPrice * qty) - resolvedSubtotal),
                    revenueSource: 'order',
                    analyticsReversed: false,
                    attributionVersion: 1,
                    placement: 'standalone'
                }];
            } else if (items && Array.isArray(items)) {
                // Storefront campaign attributions
                const campaignAttributions: Record<string, {
                    campaignId: string;
                    impressionId?: string;
                    placement?: string;
                    items: any[];
                }> = {};

                for (const item of items) {
                    if (item.campaignId) {
                        if (!campaignAttributions[item.campaignId]) {
                            campaignAttributions[item.campaignId] = {
                                campaignId: item.campaignId,
                                impressionId: item.impressionId,
                                placement: item.placement,
                                items: []
                            };
                        }
                        campaignAttributions[item.campaignId].items.push(item);
                    }
                }

                const attributionRecords = [];
                for (const [campIdStr, group] of Object.entries(campaignAttributions)) {
                    const camp = await OfferCampaign.findById(campIdStr).session(session);
                    if (!camp) continue;

                    let grossRevenue = 0;
                    let totalDiscount = 0;

                    for (const groupItem of group.items) {
                        const prod = await Product.findById(groupItem._id).session(session);
                        const originalPrice = prod ? prod.price : groupItem.price;
                        grossRevenue += originalPrice * groupItem.quantity;
                        totalDiscount += Math.max(0, originalPrice - groupItem.price) * groupItem.quantity;
                    }

                    let revenueSource: 'order' | 'upsell' | 'bogo' | 'threshold' | 'bundle' = 'bundle';
                    if (camp.type === 'upsell' || camp.type === 'down_sell') {
                        revenueSource = 'upsell';
                    } else if (camp.type === 'bogo') {
                        revenueSource = 'bogo';
                    } else if (camp.type === 'cart_threshold') {
                        revenueSource = 'threshold';
                    } else if (camp.type === 'volume_discount') {
                        revenueSource = 'bundle';
                    } else if (camp.type === 'offer_page') {
                        revenueSource = 'order';
                    }

                    attributionRecords.push({
                        campaignId: camp._id,
                        impressionId: group.impressionId ? new mongoose.Types.ObjectId(group.impressionId) : undefined,
                        offerType: camp.type,
                        revenueAdded: Math.max(0, grossRevenue - totalDiscount),
                        savedAmount: totalDiscount,
                        campaignRevenue: grossRevenue,
                        discountAmount: totalDiscount,
                        revenueSource,
                        analyticsReversed: false,
                        attributionVersion: 1,
                        placement: (group.placement || camp.placement || 'product_page') as any,
                        acceptedAt: new Date(),
                        campaignName: camp.name
                    });
                }

                if (attributionRecords.length > 0) {
                    order.offerAttribution = attributionRecords;
                }
            }

            const createdOrder = await order.save({ session: session || undefined });

            // Deduct Order Fee from Merchant Wallet (0.5 EGP)
            await processOrderFee(activeStore.ownerId.toString(), createdOrder._id, session || undefined);

            // Update Store Stats
            await Store.findByIdAndUpdate(oidStoreId, {
                $inc: {
                    "stats.totalOrders": 1,
                    "stats.totalRevenue": numericTotal
                }
            }, { session: session || undefined });

            // Increment campaign stats atomically
            if (campaignId && campaign) {
                await OfferCampaign.findByIdAndUpdate(
                    campaign._id,
                    {
                        $inc: {
                            totalAcceptances: 1,
                            'analytics.acceptances': 1,
                            'analytics.revenue': campaignProductOriginalPrice * qty,
                            'analytics.generatedOrders': 1
                        }
                    },
                    { session: session || undefined }
                );
            } else if (order.offerAttribution && order.offerAttribution.length > 0) {
                for (const attr of order.offerAttribution) {
                    await OfferCampaign.findByIdAndUpdate(
                        attr.campaignId,
                        {
                            $inc: {
                                totalAcceptances: 1,
                                'analytics.acceptances': 1,
                                'analytics.revenue': attr.campaignRevenue,
                                'analytics.generatedOrders': 1
                            }
                        },
                        { session: session || undefined }
                    );

                    if (attr.impressionId) {
                        await OfferImpression.findByIdAndUpdate(
                            attr.impressionId,
                            {
                                $set: {
                                    decision: 'accepted',
                                    decidedAt: new Date(),
                                    orderId: createdOrder._id
                                }
                            },
                            { session: session || undefined }
                        );
                    }
                }
            }

            // Update customer orders list
            await Customer.findByIdAndUpdate(customer._id, {
                $push: { orders: createdOrder._id }
            }, { session: session || undefined });

            // Atomic Stock Reservation & Movement Logging via OCC
            for (const item of items) {
                if (item.trackInventory === false) continue;

                let updatedProduct = null;
                let retries = 3;
                let success = false;

                while (retries > 0 && !success) {
                    const prodDoc = await Product.findById(item._id).session(session);
                    if (!prodDoc || prodDoc.status !== 'active') {
                        throw new Error(`Product ${item.name} is no longer available.`);
                    }

                    if (item.variantId) {
                        const variant = prodDoc.variants.find((v: any) => v._id.toString() === item.variantId.toString() && !v.isDeleted);
                        if (!variant) {
                            throw new Error(`Variant for ${item.name} is no longer available.`);
                        }
                        const available = (variant.inventory || 0) - (variant.reserved || 0);
                        if (available < item.quantity) {
                            throw new Error(`Insufficient stock for ${item.name} (${variant.name}). Only ${available} left.`);
                        }

                        const currentReserved = variant.reserved || 0;
                        const variantReservedQuery = currentReserved === 0
                            ? { 
                                variants: { 
                                    $elemMatch: { 
                                        _id: item.variantId, 
                                        $or: [{ reserved: 0 }, { reserved: { $exists: false } }] 
                                    } 
                                } 
                              }
                            : { 
                                variants: { 
                                    $elemMatch: { 
                                        _id: item.variantId, 
                                        reserved: currentReserved 
                                    } 
                                } 
                              };

                        updatedProduct = await Product.findOneAndUpdate(
                            {
                                _id: item._id,
                                ...variantReservedQuery
                            },
                            {
                                $inc: {
                                    "variants.$.reserved": Number(item.quantity),
                                    "inventory.reserved": Number(item.quantity)
                                }
                            },
                            { session: session || undefined, new: true }
                        );
                        if (updatedProduct) {
                            success = true;
                        } else {
                            retries--;
                        }
                    } else {
                        const available = (prodDoc.inventory.quantity || 0) - (prodDoc.inventory.reserved || 0);
                        if (available < item.quantity) {
                            throw new Error(`Insufficient stock for ${item.name}. Only ${available} left.`);
                        }

                        const currentReserved = prodDoc.inventory.reserved || 0;
                        const reservedQuery = currentReserved === 0
                            ? {
                                $or: [
                                    { "inventory.reserved": 0 },
                                    { "inventory.reserved": { $exists: false } }
                                ]
                              }
                            : { "inventory.reserved": currentReserved };

                        updatedProduct = await Product.findOneAndUpdate(
                            {
                                _id: item._id,
                                ...reservedQuery
                            },
                            {
                                $inc: { "inventory.reserved": Number(item.quantity) }
                            },
                            { session: session || undefined, new: true }
                        );
                        if (updatedProduct) {
                            success = true;
                        } else {
                            retries--;
                        }
                    }
                }

                if (!success) {
                    throw new Error(`Concurrency timeout reserving stock for product ${item.name}. Please try again.`);
                }

                if (updatedProduct) {
                    const variant = item.variantId
                        ? updatedProduct.variants.find((v: any) => v._id.toString() === item.variantId.toString())
                        : null;

                    await InventoryLog.create([{
                        storeId: oidStoreId,
                        productId: item._id,
                        variantId: item.variantId || undefined,
                        orderId: createdOrder._id,
                        type: 'RESERVATION',
                        amount: Number(item.quantity),
                        previousBalance: item.variantId
                            ? (variant?.inventory || 0) - (variant?.reserved || 0) + Number(item.quantity)
                            : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0) + Number(item.quantity),
                        newBalance: item.variantId
                            ? (variant?.inventory || 0) - (variant?.reserved || 0)
                            : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0),
                        reason: `Order #${orderNumber} reservation`
                    }], { session: session || undefined });

                    // -- CACHE INVALIDATION (Checkout Sync) --
                    
                    // Always wipe individual product cache to reflect exact remaining units on detail page
                    try {
                        await redisClient.unlink(`product:${item._id}`);
                    } catch (e) {
                        console.warn('Checkout cache wipe failed for individual product:', e);
                    }

                    // CACHE THRASHING PROTECTION: Only wipe the store list cache if stock drops to exactly 0 (Item Sold Out)
                    const calculatedNewBalance = item.variantId
                            ? (variant?.inventory || 0) - (variant?.reserved || 0)
                            : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0);
                            
                    if (calculatedNewBalance === 0) {
                        await clearStoreProductCaches(storeId);
                    }
                }
            }

            let paymentUrl = null;
            if (paymentMethod !== 'COD' && activeStore.settings?.payment?.provider && activeStore.settings.payment.provider !== 'manual') {
                try {
                    const paymentProvider = PaymentFactory.getProvider(activeStore);
                    const paymentIntent = await paymentProvider.initializePayment(createdOrder, activeStore);
                    
                    paymentUrl = paymentIntent.paymentUrl;
                    createdOrder.transactionId = paymentIntent.transactionId;
                    await createdOrder.save({ session: session || undefined });
                } catch (paymentErr) {
                    console.error('Failed to initialize Strategy payment gateway:', paymentErr);
                }
            }

            if (session) await session.commitTransaction();

            createNotification({
                userId: activeStore.ownerId.toString(),
                storeId: oidStoreId.toString(),
                type: 'order_created',
                title: 'New order received',
                message: `Order #${createdOrder.orderNumber} for ${numericTotal.toLocaleString()} EGP was just placed.`,
                link: `/dashboard/stores/${oidStoreId}/orders/${createdOrder._id}`,
            }).catch(() => {});

            // ================================================================
            // New-order owner email alert — FREE, UNGATED platform email (not
            // credit-gated like sendGatedCustomerEmail below). Merchants running
            // this as a website can't realistically keep the dashboard open, so
            // this is the reliable, fast-to-notice channel for a brand new
            // order. Must never block/delay the customer-facing response, and
            // (unlike the DB notification above) failures are logged since this
            // channel is meant to be dependable.
            // ================================================================
            (async () => {
                try {
                    const owner = await User.findById(activeStore.ownerId).select('email name').lean();
                    if (!owner?.email) {
                        console.error(`[publicOrderController] No owner email found for store ${oidStoreId}; new-order alert email not sent for order ${createdOrder.orderNumber}`);
                        return;
                    }

                    await sendNewOrderOwnerEmail({
                        ownerEmail: owner.email,
                        ownerName: owner.name,
                        storeName: activeStore.name,
                        orderNumber: createdOrder.orderNumber,
                        orderTotal: numericTotal,
                        currency: activeStore.settings?.currency || 'EGP',
                        customerName: `${customerData.firstName} ${customerData.lastName}`.trim(),
                        customerPhone: customerData.phone,
                        customerEmail: customerData.email,
                        items: items.map((item: any) => ({ name: item.name, quantity: Number(item.quantity) })),
                        orderLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/stores/${oidStoreId}/orders/${createdOrder._id}`,
                    });
                } catch (err) {
                    console.error('[publicOrderController] Failed to send new-order owner alert email:', err);
                }
            })();

            if (activeStore.settings?.emailNotifications?.sendOrderConfirmation !== false && customerData.email) {
                sendGatedCustomerEmail({
                    store: activeStore,
                    type: 'orderConfirmation',
                    customerEmail: customerData.email,
                    vars: {
                        customerName: `${customerData.firstName} ${customerData.lastName}`.trim(),
                        orderNumber: createdOrder.orderNumber,
                        total: numericTotal.toLocaleString(),
                    },
                    context: `Order confirmation for order #${createdOrder.orderNumber} to ${customerData.email}`,
                    ledgerDescription: `Order confirmation email for order #${createdOrder.orderNumber}`,
                    referenceId: createdOrder._id.toString(),
                }).catch(() => {});
            }

            if (activeStore.settings?.whatsappNotifications?.sendOrderConfirmation !== false && customerData.phone) {
                sendGatedWhatsAppMessage({
                    store: activeStore,
                    type: 'orderConfirmation',
                    customerPhone: customerData.phone,
                    vars: {
                        customerName: `${customerData.firstName} ${customerData.lastName}`.trim(),
                        orderNumber: createdOrder.orderNumber,
                        total: numericTotal.toLocaleString(),
                    },
                    context: `Order confirmation for order #${createdOrder.orderNumber} to ${customerData.phone}`,
                    ledgerDescription: `Order confirmation WhatsApp message for order #${createdOrder.orderNumber}`,
                    referenceId: createdOrder._id.toString(),
                }).catch(() => {});
            }

            res.status(201).json({
                success: true,
                orderNumber: createdOrder.orderNumber,
                orderId: createdOrder._id,
                paymentUrl
            });
        } catch (txnError: any) {
            if (session) await session.abortTransaction();
            throw txnError;
        } finally {
            if (session) session.endSession();
        }
    } catch (error: any) {
        console.error('Order creation error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Server Error',
            error
        });
    }
};

// @desc    Track order by order number
// @route   GET /api/public/orders/track/:orderNumber?storeId=...
// @access  Public
export const trackOrder = async (req: Request, res: Response) => {
    try {
        const { orderNumber } = req.params;
        const { storeId } = req.query;

        if (!storeId || !mongoose.Types.ObjectId.isValid(storeId as string)) {
            return res.status(400).json({ message: 'Invalid store ID' });
        }

        const order = await Order.findOne({
            orderNumber,
            storeId: new mongoose.Types.ObjectId(storeId as string)
        })
            .populate('items.productId', 'name images')
            .select('-transactionFee'); // Hide internal fees from public

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

export const getPublicOrderDetails = async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('items.productId', 'name images');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
