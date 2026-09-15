import { Response } from 'express';
import Store from '../models/Store';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import Customer from '../models/Customer';
import { AuthRequest } from '../middleware/authMiddleware';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { IMPLEMENTED_PAYMENT_PROVIDERS } from '../constants/paymentProviders';
import Subscription from '../models/Subscription';
import { DomainVerificationService } from '../services/domain/DomainVerificationService';
import EmailAccount from '../models/EmailAccount';
import EmailLedgerEntry from '../models/EmailLedgerEntry';
import { CampaignQuotaService } from '../services/CampaignQuotaService';
import { validateEmailBlocks } from '../utils/validateEmailBlocks';
import { applyEmailSenderUpdate } from '../utils/applyEmailSenderUpdate';
import nodemailer from 'nodemailer';

// @desc    Get all stores for logged-in merchant
// @route   GET /api/stores
// @access  Private/Merchant
export const getStores = async (req: AuthRequest, res: Response) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);

        const storesWithStats = await Store.aggregate([
            { $match: { ownerId: userId } },
            { $sort: { createdAt: -1 } },
            // Look up products count
            {
                $lookup: {
                    from: 'products',
                    let: { storeId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$storeId', '$$storeId'] },
                                        { $eq: ['$status', 'active'] }
                                    ]
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    as: 'productStats'
                }
            },
            // Look up orders count and revenue
            {
                $lookup: {
                    from: 'orders',
                    let: { storeId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$storeId', '$$storeId'] } } },
                        {
                            $group: {
                                _id: null,
                                totalOrders: { $sum: 1 },
                                totalRevenue: {
                                    $sum: {
                                        $cond: [
                                            { $not: [{ $in: ['$status', ['cancelled', 'refunded']] }] },
                                            '$total',
                                            0
                                        ]
                                    }
                                },
                                settledRevenue: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $or: [
                                                    { $eq: ["$status", "delivered"] },
                                                    { $eq: ["$paymentStatus", "paid"] }
                                                ]
                                            },
                                            "$total",
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    as: 'orderStats'
                }
            },
            // Look up customers count
            {
                $lookup: {
                    from: 'customers',
                    let: { storeId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$storeId', '$$storeId'] } } },
                        { $count: 'count' }
                    ],
                    as: 'customerStats'
                }
            },
            {
                $addFields: {
                    stats: {
                        totalProducts: { $ifNull: [{ $arrayElemAt: ['$productStats.count', 0] }, 0] },
                        totalOrders: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalOrders', 0] }, 0] },
                        totalCustomers: { $ifNull: [{ $arrayElemAt: ['$customerStats.count', 0] }, 0] },
                        totalRevenue: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalRevenue', 0] }, 0] },
                        settledRevenue: { $ifNull: [{ $arrayElemAt: ['$orderStats.settledRevenue', 0] }, 0] }
                    }
                }
            },
            {
                $project: {
                    productStats: 0,
                    orderStats: 0,
                    customerStats: 0
                }
            }
        ]);

        res.json(storesWithStats);
    } catch (error) {
        console.error('getStores Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

export const getStore = async (req: AuthRequest, res: Response) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const storeId = new mongoose.Types.ObjectId(req.params.id as string);

        const storeWithStats = await Store.aggregate([
            { $match: { _id: storeId, ownerId: userId } },
            // Look up subscription and plan.
            //
            // NOTE: Store.subscriptionId is never actually populated anywhere
            // in the app (confirmed live: 0 of 3 real stores have it set) —
            // subscriptions are tracked per-USER (Subscription.userId), not
            // per-store, the same way billingController/WhatsAppCreditService/
            // CampaignQuotaService already look them up. Joining on
            // Store.subscriptionId here used to always produce an empty
            // lookup, so every store silently showed as plan-less/Starter on
            // the frontend regardless of the owner's real plan — the "I'm on
            // Pro but Marketing Hub features are locked" bug. Join on
            // ownerId -> Subscription.userId instead. (Also fixed: the plan
            // lookup pointed at a stale 'plans' collection instead of the
            // real 'subscriptionplans' collection the SubscriptionPlan model
            // actually writes to — a second, independent bug in this same
            // pipeline.)
            {
                $lookup: {
                    from: 'subscriptions',
                    localField: 'ownerId',
                    foreignField: 'userId',
                    as: 'subscription'
                }
            },
            { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'subscriptionplans',
                    localField: 'subscription.planId',
                    foreignField: '_id',
                    as: 'subscription.planId'
                }
            },
            { $unwind: { path: '$subscription.planId', preserveNullAndEmptyArrays: true } },
            // Re-map subscription to subscriptionId to match FE expectations —
            // populate({path: 'subscriptionId', populate: {path: 'planId'}})
            // creates store.subscriptionId.planId.name, so this field name is
            // kept even though it's now sourced from the owner's subscription
            // rather than a (never-populated) Store.subscriptionId.
            {
                $addFields: {
                    subscriptionId: '$subscription'
                }
            },
            // Look up products count
            {
                $lookup: {
                    from: 'products',
                    let: { sId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$storeId', '$$sId'] },
                                        { $eq: ['$status', 'active'] }
                                    ]
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    as: 'productStats'
                }
            },
            // Look up orders count and revenue
            {
                $lookup: {
                    from: 'orders',
                    let: { sId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$storeId', '$$sId'] } } },
                        {
                            $group: {
                                _id: null,
                                totalOrders: { $sum: 1 },
                                totalRevenue: {
                                    $sum: {
                                        $cond: [
                                            { $not: [{ $in: ['$status', ['cancelled', 'refunded']] }] },
                                            '$total',
                                            0
                                        ]
                                    }
                                },
                                settledRevenue: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $or: [
                                                    { $eq: ["$status", "delivered"] },
                                                    { $eq: ["$paymentStatus", "paid"] }
                                                ]
                                            },
                                            "$total",
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    as: 'orderStats'
                }
            },
            // Look up customers count
            {
                $lookup: {
                    from: 'customers',
                    let: { sId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$storeId', '$$sId'] } } },
                        { $count: 'count' }
                    ],
                    as: 'customerStats'
                }
            },
            {
                $addFields: {
                    stats: {
                        totalProducts: { $ifNull: [{ $arrayElemAt: ['$productStats.count', 0] }, 0] },
                        totalOrders: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalOrders', 0] }, 0] },
                        totalCustomers: { $ifNull: [{ $arrayElemAt: ['$customerStats.count', 0] }, 0] },
                        totalRevenue: { $ifNull: [{ $arrayElemAt: ['$orderStats.totalRevenue', 0] }, 0] },
                        settledRevenue: { $ifNull: [{ $arrayElemAt: ['$orderStats.settledRevenue', 0] }, 0] }
                    }
                }
            },
            {
                $project: {
                    subscription: 0,
                    productStats: 0,
                    orderStats: 0,
                    customerStats: 0
                }
            }
        ]);

        if (storeWithStats.length === 0) {
            return res.status(404).json({ message: 'Store not found' });
        }

        res.json(storeWithStats[0]);
    } catch (error) {
        console.error('Get Store Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Create new store
// @route   POST /api/stores
// @access  Private/Merchant
export const createStore = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, category, contact, branding } = req.body;

        // Generate unique slug from name
        let slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        // Ensure slug uniqueness
        let uniqueSlug = slug;
        let counter = 1;
        while (await Store.findOne({ slug: uniqueSlug })) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }

        // Generate unique subdomain
        let subdomain = slug;
        let subdomainCounter = 1;
        while (await Store.findOne({ 'domain.subdomain': subdomain })) {
            subdomain = `${slug}-${subdomainCounter}`;
            subdomainCounter++;
        }

        const store = await Store.create({
            ownerId: req.user._id,
            name,
            slug: uniqueSlug,
            description,
            category,
            contact: contact || {},
            branding: branding || {},
            domain: {
                type: 'subdomain',
                subdomain,
                isVerified: true
            },
            status: 'draft',
            isPublished: false
        });

        // Add store to user's stores array
        await User.findByIdAndUpdate(req.user._id, {
            $push: { stores: store._id }
        });

        res.status(201).json(store);
    } catch (error) {
        console.error('Create Store Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Update store
// @route   PUT /api/stores/:id
// @access  Private/Merchant
export const updateStore = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Whitelist updates to prevent mass assignment of status, plans, isVerified, or subdomains
        const updateData: any = {};
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.category !== undefined) updateData.category = req.body.category;
        if (req.body.logo !== undefined) updateData.logo = req.body.logo;
        if (req.body.favicon !== undefined) updateData.favicon = req.body.favicon;
        if (req.body.branding !== undefined) updateData.branding = req.body.branding;
        if (req.body.contact !== undefined) updateData.contact = req.body.contact;
        if (req.body.settings !== undefined) {
            const requestedProvider = req.body.settings?.payment?.provider;
            if (requestedProvider && !IMPLEMENTED_PAYMENT_PROVIDERS.includes(requestedProvider)) {
                return res.status(400).json({
                    message: `Payment provider '${requestedProvider}' is not yet available. Currently supported: ${IMPLEMENTED_PAYMENT_PROVIDERS.join(', ')}.`
                });
            }
            const templates = req.body.settings?.emailNotifications?.templates;
            if (templates) {
                for (const key of ['orderConfirmation', 'orderStatusChanged', 'marketing'] as const) {
                    const check = validateEmailBlocks(templates[key]?.blocks);
                    if (!check.valid) {
                        return res.status(400).json({ message: `${key} template: ${check.error}` });
                    }
                }
            }

            updateData.settings = req.body.settings;

            // Carve-out: never trust a client-sent emailSender wholesale (see
            // applyEmailSenderUpdate's doc-comment) — encrypts a freshly
            // submitted plaintext SMTP password, preserves the existing
            // encrypted one when the field is left blank, and recomputes
            // verified/lastTestedAt/lastError server-side instead of
            // trusting whatever the client sent for them.
            if (req.body.settings.emailSender !== undefined) {
                updateData.settings.emailSender = applyEmailSenderUpdate(
                    store.settings?.emailSender,
                    req.body.settings.emailSender
                );
            }
        }
        if (req.body.theme !== undefined) {
            // Plan gating: SubscriptionPlan.features.allowHeroSlider must be
            // true to SAVE any slides. Checked here (not just hidden in the
            // dashboard UI) so a direct API call can't bypass it. Clearing
            // the slider (empty/absent slides array) is always allowed, so a
            // merchant whose plan lost access can still remove what's there.
            const requestedSlides = req.body.theme?.customizations?.heroSlider?.slides;
            if (Array.isArray(requestedSlides) && requestedSlides.length > 0) {
                const subscription = await Subscription.findOne({ userId: req.user._id }).populate('planId');
                const plan = subscription?.planId as any;
                if (!plan || !plan.features?.allowHeroSlider) {
                    return res.status(403).json({
                        message: 'The homepage hero slider is not included in your current plan.',
                        code: 'FEATURE_LOCKED'
                    });
                }
            }
            updateData.theme = req.body.theme;
        }
        if (req.body.seo !== undefined) updateData.seo = req.body.seo;

        // Custom domain changes intentionally do NOT go through this generic
        // endpoint — they go through setCustomDomain/verifyCustomDomain/
        // removeCustomDomain below, which enforce plan-gating and reset
        // domain verification. Letting a plain PUT here set customDomain
        // directly would bypass both.
        if (req.body.domain?.customDomain !== undefined) {
            return res.status(400).json({
                message: 'Use POST /stores/:id/domain to set a custom domain (it requires DNS ownership verification).'
            });
        }

        const updatedStore = await Store.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true, context: 'query' }
        );

        if (updatedStore) {
            const { redisClient } = await import('../config/redis');
            if (updatedStore.status === 'live') {
                // .toJSON() (not .toObject()) so EmailSenderSchema's toJSON
                // transform strips settings.emailSender.smtp.passwordEncrypted
                // before this reaches the cache — the public endpoint's
                // cache-hit path serves this blob straight to anonymous
                // visitors with no transform of its own.
                const cachePayload = JSON.stringify(updatedStore.toJSON());
                await redisClient.setex(`store_customization:${updatedStore.domain.subdomain}`, 3600, cachePayload);
                // Only warm the customDomain cache key once it's verified —
                // otherwise a public request for that (unverified) domain
                // would get served from this cache entry directly, bypassing
                // the isVerified check in publicController.getStoreBySubdomain.
                if (updatedStore.domain.customDomain && updatedStore.domain.isVerified) {
                    await redisClient.setex(`store_customization:${updatedStore.domain.customDomain}`, 3600, cachePayload);
                }
            } else {
                await redisClient.del(`store_customization:${updatedStore.domain.subdomain}`);
                if (updatedStore.domain.customDomain) {
                    await redisClient.del(`store_customization:${updatedStore.domain.customDomain}`);
                }
            }
        }

        res.json(updatedStore);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Connect a custom domain to a store — starts DNS ownership
//          verification, does not serve traffic on it yet.
// @route   POST /api/stores/:id/domain
// @access  Private/Merchant
export const setCustomDomain = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ _id: req.params.id, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const rawDomain = req.body.customDomain;
        if (typeof rawDomain !== 'string' || !rawDomain.trim()) {
            return res.status(400).json({ message: 'customDomain is required' });
        }
        const customDomain = rawDomain.trim().toLowerCase();

        // Not a full RFC validator — just enough to reject obviously
        // malformed input before generating a challenge token for it.
        const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;
        if (!DOMAIN_PATTERN.test(customDomain)) {
            return res.status(400).json({ message: 'That does not look like a valid domain (e.g. shop.example.com).' });
        }

        // Plan gating: SubscriptionPlan.features.customDomain must be true.
        const subscription = await Subscription.findOne({ userId: req.user._id }).populate('planId');
        const plan = subscription?.planId as any;
        if (!plan || !plan.features?.customDomain) {
            return res.status(403).json({
                message: 'Custom domains are not included in your current plan. Upgrade to a plan with custom domain support.',
                code: 'FEATURE_LOCKED'
            });
        }

        const collision = await Store.findOne({ 'domain.customDomain': customDomain, _id: { $ne: store._id } });
        if (collision) {
            return res.status(409).json({ message: 'This custom domain is already connected to another store.' });
        }

        const verificationToken = DomainVerificationService.generateVerificationToken();
        store.domain.customDomain = customDomain;
        store.domain.verificationToken = verificationToken;
        store.domain.isVerified = false;

        try {
            await store.save();
        } catch (saveError: any) {
            // Guards the (rare) race where two requests pass the collision
            // check above for the same domain before either saves.
            if (saveError?.code === 11000) {
                return res.status(409).json({ message: 'This custom domain is already connected to another store.' });
            }
            throw saveError;
        }

        res.json({
            message: 'Custom domain saved. Add the DNS record below, then click Verify.',
            customDomain,
            verification: {
                type: 'TXT',
                host: DomainVerificationService.getChallengeHostname(customDomain),
                value: verificationToken
            },
            isVerified: false
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Check the DNS TXT challenge and mark the custom domain verified
// @route   POST /api/stores/:id/domain/verify
// @access  Private/Merchant
export const verifyCustomDomain = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ _id: req.params.id, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (!store.domain.customDomain || !store.domain.verificationToken) {
            return res.status(400).json({ message: 'No custom domain pending verification for this store.' });
        }

        if (store.domain.isVerified) {
            return res.json({ isVerified: true, message: 'Already verified.' });
        }

        const result = await DomainVerificationService.verify(store.domain.customDomain, store.domain.verificationToken);

        if (!result.verified) {
            return res.status(400).json({ isVerified: false, message: result.error });
        }

        store.domain.isVerified = true;
        store.domain.type = 'custom';
        await store.save();

        res.json({
            isVerified: true,
            message: "Domain verified. Once its DNS is pointed at Buildora's servers, it will start serving your store."
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Disconnect a custom domain from a store
// @route   DELETE /api/stores/:id/domain
// @access  Private/Merchant
export const removeCustomDomain = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ _id: req.params.id, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const previousDomain = store.domain.customDomain;

        store.domain.customDomain = undefined;
        store.domain.verificationToken = undefined;
        store.domain.isVerified = false;
        store.domain.type = 'subdomain';
        await store.save();

        if (previousDomain) {
            const { redisClient } = await import('../config/redis');
            await redisClient.del(`store_customization:${previousDomain}`);
        }

        res.json({ message: 'Custom domain removed.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Delete store
// @route   DELETE /api/stores/:id
// @access  Private/Merchant
export const deleteStore = async (req: AuthRequest, res: Response) => {
    try {
        const { password, transferCreditsToStoreId } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'Password is required to confirm store deletion.' });
        }

        const user = await User.findById(req.user._id);
        if (!user || !user.passwordHash) {
            return res.status(400).json({ message: 'User verification failed.' });
        }

        const bcrypt = await import('bcryptjs');
        const isMatch = await bcrypt.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect account password. Store deletion denied.' });
        }

        const store = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check if store has products or orders
        const productCount = await Product.countDocuments({ storeId: store._id });
        if (productCount > 0) {
            return res.status(400).json({
                message: 'Cannot delete store with existing products. Please delete all products first.'
            });
        }

        // Email credits: previously deleteStore never looked at the store's
        // EmailAccount at all, so it stayed behind as an orphaned document
        // forever, silently taking any purchased credits down with it.
        const emailAccount = await EmailAccount.findOne({ storeId: store._id });
        if (emailAccount) {
            if (emailAccount.reserved > 0) {
                // A campaign send is mid-flight against this store's credits
                // — deleting now would leave a dangling reservation with no
                // store left to settle/release it against.
                return res.status(400).json({
                    message: 'Cannot delete store while an email campaign is in progress. Wait for it to finish, or cancel it first.'
                });
            }

            if (emailAccount.purchasedBalance > 0) {
                const otherStores = await Store.find({ ownerId: req.user._id, _id: { $ne: store._id } }).select('name');

                if (otherStores.length === 0) {
                    // Nothing to move it to — the merchant is deleting their
                    // only store, so the purchased balance is forfeited.
                    // Recorded on the ledger before the account (and store)
                    // disappear, so the loss is auditable rather than silent.
                    await EmailLedgerEntry.create({
                        storeId: store._id,
                        type: 'correction',
                        amount: -emailAccount.purchasedBalance,
                        description: `Forfeited ${emailAccount.purchasedBalance} purchased email credits — store deleted with no other store to transfer them to.`
                    });
                } else if (!transferCreditsToStoreId) {
                    // Ask the merchant where to send the credits instead of
                    // silently losing (or silently keeping, which isn't
                    // possible once the store is gone) real money they paid
                    // for.
                    return res.status(409).json({
                        code: 'EMAIL_CREDITS_TRANSFER_REQUIRED',
                        message: `This store has ${emailAccount.purchasedBalance} purchased email credits. Choose another store to move them to before deleting.`,
                        purchasedBalance: emailAccount.purchasedBalance,
                        otherStores: otherStores.map(s => ({ _id: s._id, name: s.name }))
                    });
                } else {
                    const destination = otherStores.find(s => s._id.toString() === transferCreditsToStoreId);
                    if (!destination) {
                        return res.status(404).json({ message: 'Destination store not found or unauthorized' });
                    }
                    await CampaignQuotaService.transferPurchasedCredits(store._id.toString(), transferCreditsToStoreId, emailAccount.purchasedBalance);
                }
            }

            await EmailAccount.deleteOne({ storeId: store._id });
        }

        // Remove store from user's stores array
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { stores: store._id }
        });

        await store.deleteOne();
        res.json({ message: 'Store deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Publish store (draft → live)
// @route   POST /api/stores/:id/publish
// @access  Private/Merchant
export const publishStore = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (store.isPublished) {
            return res.status(400).json({ message: 'Store is already published' });
        }

        // Pre-launch validation
        const productCount = await Product.countDocuments({ storeId: store._id, status: 'active' });

        const validationErrors = [];

        if (productCount === 0) {
            validationErrors.push('Add at least 1 active product');
        }

        if (!store.settings.payment.methods || store.settings.payment.methods.length === 0) {
            validationErrors.push('Configure at least one payment method');
        }

        if (!store.contact.email && !store.contact.phone) {
            validationErrors.push('Add contact email or phone number');
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: 'Cannot publish store. Please complete the following:',
                errors: validationErrors
            });
        }

        store.status = 'live';
        store.isPublished = true;
        store.publishedAt = new Date();
        await store.save();

        res.json({
            message: 'Store published successfully!',
            store,
            storeUrl: `https://${store.domain.subdomain}.quickstore.com`
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Unpublish store (live → draft)
// @route   POST /api/stores/:id/unpublish
// @access  Private/Merchant
export const unpublishStore = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        store.status = 'draft';
        store.isPublished = false;
        await store.save();

        res.json({ message: 'Store unpublished successfully', store });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Pause store temporarily
// @route   POST /api/stores/:id/pause
// @access  Private/Merchant
export const pauseStore = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        store.status = 'paused';
        await store.save();

        res.json({ message: 'Store paused successfully', store });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Resume paused store
// @route   POST /api/stores/:id/resume
// @access  Private/Merchant
export const resumeStore = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (store.status !== 'paused') {
            return res.status(400).json({ message: 'Store is not paused' });
        }

        store.status = 'live';
        await store.save();

        res.json({ message: 'Store resumed successfully', store });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Generate preview token for draft store
// @route   POST /api/stores/:id/preview-token
// @access  Private/Merchant
export const generatePreviewToken = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // In production, store this in Redis or a PreviewToken model
        // For now, we'll use a simple approach with JWT or similar

        res.json({
            token,
            expiresAt,
            previewUrl: `/preview/${store._id}?token=${token}`
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Check subdomain availability
// @route   GET /api/stores/check-subdomain/:subdomain
// @access  Private/Merchant
export const checkSubdomainAvailability = async (req: AuthRequest, res: Response) => {
    try {
        const subdomain = req.params.subdomain as string;

        // Validate subdomain format
        const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
        if (!subdomainRegex.test(subdomain)) {
            return res.json({
                available: false,
                message: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
            });
        }

        const existingStore = await Store.findOne({ 'domain.subdomain': subdomain });

        res.json({
            available: !existingStore,
            message: existingStore ? 'Subdomain already taken' : 'Subdomain available'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get store onboarding checklist
// @route   GET /api/stores/:id/checklist
// @access  Private/Merchant
export const getOnboardingChecklist = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const productCount = await Product.countDocuments({ storeId: store._id, status: 'active' });

        const checklist = {
            storeInfo: {
                completed: !!(store.name && store.description),
                label: 'Store information completed'
            },
            branding: {
                completed: !!(store.logo && store.branding.primaryColor),
                label: 'Logo and branding set'
            },
            products: {
                completed: productCount >= 5,
                label: 'Add at least 5 products',
                current: productCount,
                target: 5
            },
            payment: {
                completed: store.settings.payment.methods.length > 0,
                label: 'Configure payment methods'
            },
            shipping: {
                completed: store.settings.shipping.enabled && store.settings.shipping.zones.length > 0,
                label: 'Set up shipping zones'
            },
            policies: {
                completed: !!(store.settings.policies.returnPolicy || store.settings.policies.privacyPolicy),
                label: 'Add store policies'
            }
        };

        const completedCount = Object.values(checklist).filter(item => item.completed).length;
        const totalCount = Object.keys(checklist).length;

        res.json({
            checklist,
            progress: {
                completed: completedCount,
                total: totalCount,
                percentage: Math.round((completedCount / totalCount) * 100)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Upload store logo and generate favicon
// @route   POST /api/stores/:id/upload-logo
// @access  Private/Merchant
export const uploadStoreLogo = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ _id: req.params.id, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const logoUrl = req.file.path;
        const logoPublicId = req.file.filename;

        // Dynamic Cloudinary URL transform: 32x32 fill crop, auto format/quality
        // Regex replacement handles optional version tags (e.g. /upload/v12345/ or just /upload/)
        const faviconUrl = logoUrl.replace(/\/upload\/(v\d+\/)?/, '/upload/w_32,h_32,c_fill,g_auto,q_auto,f_png/$1');

        store.logo = { url: logoUrl, publicId: logoPublicId };
        store.favicon = { url: faviconUrl, publicId: logoPublicId };

        await store.save();

        // Zero Cache-Miss: Overwrite Redis cache if store is live, otherwise ensure it is deleted
        const { redisClient } = await import('../config/redis');
        if (store.status === 'live') {
            // .toJSON() (not .toObject()) — see identical rationale in
            // updateStore above.
            const cachePayload = JSON.stringify(store.toJSON());
            await redisClient.setex(`store_customization:${store.domain.subdomain}`, 3600, cachePayload);
            // Only warm the customDomain cache key once it's verified — see
            // the identical guard (and why) in updateStore above.
            if (store.domain.customDomain && store.domain.isVerified) {
                await redisClient.setex(`store_customization:${store.domain.customDomain}`, 3600, cachePayload);
            }
        } else {
            await redisClient.del(`store_customization:${store.domain.subdomain}`);
            if (store.domain.customDomain) {
                await redisClient.del(`store_customization:${store.domain.customDomain}`);
            }
        }

        res.json({
            message: 'Logo uploaded successfully',
            logo: store.logo,
            favicon: store.favicon
        });
    } catch (error) {
        console.error('Upload Logo Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Upload an image to embed in an email builder Image block
//          (transactional template or marketing campaign). Stateless —
//          unlike upload-logo, this never mutates/saves the Store
//          document; the URL is only persisted later when the template or
//          campaign itself is saved.
// @route   POST /api/stores/:id/email-blocks/upload-image
// @access  Private/Merchant
export const uploadEmailBlockImage = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ _id: req.params.id, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        res.json({ url: req.file.path, publicId: req.file.filename });
    } catch (error) {
        console.error('Upload Email Block Image Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Test a (possibly not-yet-saved) SMTP configuration by verifying
//          the connection and optionally sending a real test email to the
//          merchant's OWN account address (never an arbitrary address from
//          the request body). Stateless — never persists anything and
//          never touches the store's Buildora email-credit ledger, since
//          this exercises the merchant's own mail server, unrelated to
//          Resend/CampaignQuotaService. The merchant must still click Save
//          on the settings page to keep a working config.
// @route   POST /api/stores/:id/email-sender/test
// @access  Private/Merchant
export const testEmailSender = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ _id: req.params.id, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const { host, port, secure, username, password, fromEmail, fromName, sendTestEmail } = req.body;
        if (!host || !port || !username || !password) {
            return res.status(400).json({ message: 'Host, port, username, and password are all required to test a connection' });
        }

        const transporter = nodemailer.createTransport({
            host,
            port: Number(port),
            secure: !!secure,
            auth: { user: username, pass: password },
            connectionTimeout: 10000,
            socketTimeout: 10000
        });

        await transporter.verify();

        if (sendTestEmail) {
            const toEmail = req.user.email;
            await transporter.sendMail({
                from: `"${fromName || store.name}" <${fromEmail || username}>`,
                to: toEmail,
                subject: 'Test email from Buildora',
                html: `<p>This is a test email confirming your SMTP configuration for <strong>${store.name}</strong> is working. Once you save these settings, your store's order emails will be sent from this address.</p>`
            });
        }

        res.json({ ok: true });
    } catch (error: any) {
        console.error('Test Email Sender Error:', error);
        res.status(400).json({ ok: false, error: error?.message || 'Connection failed' });
    }
};
