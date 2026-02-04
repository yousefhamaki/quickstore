import { Response } from 'express';
import Store from '../models/Store';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import Customer from '../models/Customer';
import { AuthRequest } from '../middleware/authMiddleware';
import crypto from 'crypto';
import mongoose from 'mongoose';

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
            // Look up subscription and plan
            {
                $lookup: {
                    from: 'subscriptions',
                    localField: 'subscriptionId',
                    foreignField: '_id',
                    as: 'subscription'
                }
            },
            { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'plans',
                    localField: 'subscription.planId',
                    foreignField: '_id',
                    as: 'subscription.planId'
                }
            },
            { $unwind: { path: '$subscription.planId', preserveNullAndEmptyArrays: true } },
            // Re-map subscription to subscriptionId to match FE expectations if needed
            // Actually, populate({path: 'subscriptionId', populate: {path: 'planId'}}) 
            // creates store.subscriptionId.planId.name
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

        // Don't allow changing slug or ownerId
        const { slug, ownerId, ...updateData } = req.body;

        const updatedStore = await Store.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.json(updatedStore);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Delete store
// @route   DELETE /api/stores/:id
// @access  Private/Merchant
export const deleteStore = async (req: AuthRequest, res: Response) => {
    try {
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
