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
        let shippingFee = 50;
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



            // Resolve Shipping Fee Hierarchy
            if (campaign.shippingFee !== undefined && campaign.shippingFee !== null) {
                shippingFee = campaign.shippingFee;
            } else {
                const zones = store.settings?.shipping?.zones || [];
                if (zones.length > 0) {
                    const matchedZone = zones.find((z: any) => z.cities.includes(shippingAddress.city));
                    shippingFee = matchedZone ? matchedZone.rate : zones[0].rate;
                }
            }

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
                    state: shippingAddress.city, // Defaulting state to city for MVP
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

            // Stock check (if tracking enabled)
            if (product.trackInventory) {
                if (item.variantId) {
                    const variant = product.variants.find((v: any) => v._id.toString() === item.variantId.toString());
                    if (!variant || variant.isDeleted) {
                        return res.status(400).json({ success: false, message: `Selected variant for ${product.name} no longer exists.` });
                    }
                    const available = (variant.inventory || 0) - (variant.reserved || 0);
                    if (available < item.quantity) {
                        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name} (${variant.name}). Only ${available} left.` });
                    }
                } else {
                    const available = (product.inventory.quantity || 0) - (product.inventory.reserved || 0);
                    if (available < item.quantity) {
                        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}. Only ${available} left.` });
                    }
                }
            }
        }

        // Generate unique order number
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randomStr = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `QS-${dateStr}-${randomStr}`;

                const numericTotal = Number(totalAmount);
        const resolvedShippingFee = campaignId ? shippingFee : 50;
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
            // Verify Coupon if provided
            if (couponCode) {
                const coupon = await Coupon.findOne({
                    storeId: oidStoreId,
                    code: couponCode.toUpperCase(),
                    isActive: true
                });

                if (coupon) {
                    // Verify limits again for security
                    const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                    const limitReached = coupon.maxUsage !== -1 && coupon.usageCount >= coupon.maxUsage;

                    const cartSubtotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);
                    const minPriceMet = !coupon.minOrderAmount || cartSubtotal >= coupon.minOrderAmount;

                    if (!isExpired && !limitReached && minPriceMet) {
                        // Recalculate discount based on items to prevent manipulation
                        let calculatedDiscount = 0;

                        if (coupon.type === 'percentage') {
                            calculatedDiscount = (cartSubtotal * coupon.value) / 100;
                        } else if (coupon.type === 'fixed') {
                            calculatedDiscount = coupon.value;
                        } else if (coupon.type === 'free_shipping') {
                            calculatedDiscount = resolvedShippingFee;
                        }

                        // Use the calculated discount
                        finalDiscount = calculatedDiscount;

                        // Increment usage count
                        coupon.usageCount += 1;
                        await coupon.save({ session: session || undefined });
                    }
                }
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
                    name: item.name,
                    quantity: Number(item.quantity),
                    price: Number(item.price),
                    image: item.image,
                    variant: item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : undefined
                })),
                subtotal: (numericTotal - resolvedShippingFee + finalDiscount),
                shipping: resolvedShippingFee,
                discount: finalDiscount,
                total: numericTotal,
                couponCode: couponCode || undefined,
                transactionFee,
                status: 'pending',
                paymentStatus: 'pending',
                paymentMethod: paymentMethod === 'COD' ? 'Cash on Delivery' : paymentMethod,
                shippingAddress: {
                    fullName: `${customerData.firstName} ${customerData.lastName}`,
                    phone: customerData.phone,
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    state: shippingAddress.city,
                    postalCode: shippingAddress.zipCode || '00000',
                    country: 'Egypt'
                },
                billingAddress: {
                    fullName: `${customerData.firstName} ${customerData.lastName}`,
                    phone: customerData.phone,
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    state: shippingAddress.city,
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
