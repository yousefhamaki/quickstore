import { Request, Response } from 'express';
import Store from '../models/Store';
import User from '../models/User';
import PaymentReceipt from '../models/PaymentReceipt';
import SubscriptionPlan from '../models/SubscriptionPlan';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Create/Setup store (DEPRECATED - use /api/stores instead)
// @route   POST /api/merchants/store
// @access  Private (Merchant)
export const setupStore = async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;

    try {
        // Generate slug from name
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

        const store = await Store.create({
            name,
            slug: uniqueSlug,
            description,
            ownerId: req.user._id,
            domain: {
                type: 'subdomain',
                subdomain: uniqueSlug,
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
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};

// @desc    Upload payment receipt
// @route   POST /api/merchants/subscribe
// @access  Private (Merchant)
export const submitSubscription = async (req: AuthRequest, res: Response) => {
    const { planId, paymentMethod, storeId } = req.body;
    const receiptImage = req.file?.path;

    if (!receiptImage) {
        return res.status(400).json({ message: 'Please upload a payment receipt' });
    }

    try {
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Subscription plan not found' });
        }

        const receipt = await PaymentReceipt.create({
            merchantId: req.user._id,
            storeId,
            planId,
            receiptImage,
            paymentMethod,
            status: 'pending',
        });

        // Update user subscription status to pending
        await User.findByIdAndUpdate(req.user._id, {
            subscriptionStatus: 'pending',
            subscriptionPlan: planId
        });

        res.status(201).json(receipt);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};

// @desc    Get merchant's stores (DEPRECATED - use /api/stores instead)
// @route   GET /api/merchants/store
// @access  Private (Merchant)
export const getMyStore = async (req: AuthRequest, res: Response) => {
    try {
        const stores = await Store.find({ ownerId: req.user._id });
        if (!stores || stores.length === 0) {
            return res.status(404).json({ message: 'No stores found' });
        }
        // Return first store for backward compatibility
        res.json(stores[0]);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};
