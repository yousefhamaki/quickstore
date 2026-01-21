import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import Subscription from '../models/Subscription';
import Plan from '../models/Plan';
import Wallet from '../models/Wallet';
import mongoose from 'mongoose';

/**
 * Attaches the user's current subscription and wallet to the request.
 * Handles Trial and Grace Period logic.
 */
export const billingContext = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const now = new Date();

        // 1. Fetch Subscription & Plan
        const sub = await Subscription.findOne({ userId: req.user._id })
            .populate('planId');

        // 2. Fetch Wallet
        const wallet = await Wallet.findOne({ userId: req.user._id });

        req.subscription = sub;
        (req as any).wallet = wallet;

        next();
    } catch (error) {
        console.error('Billing Context Error:', error);
        res.status(500).json({ message: 'Internal billing check failed' });
    }
};

/**
 * Attaches merchant billing context based on storefront identifiers.
 */
export const storefrontBillingContext = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { storeId } = req.body || req.query;
        if (!storeId) return next();

        const Store = mongoose.model('Store');
        const store = await Store.findById(storeId);
        if (!store) return next();

        const sub = await Subscription.findOne({ userId: store.ownerId }).populate('planId');
        req.subscription = sub;

        next();
    } catch (error) {
        next();
    }
};

/**
 * Guard: Prevents store from going live if requirements aren't met.
 * Free plan: Wallet >= 250
 * Paid plan: Subscription active
 */
export const protectStorePublish = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const sub = req.subscription;
    const wallet = (req as any).wallet;

    if (!sub || !sub.planId) {
        return res.status(403).json({ message: 'Subscription required' });
    }

    const plan = sub.planId as any;

    // Check Plan Type Requirements
    if (plan.type === 'free') {
        const minBalance = 250;
        if (!wallet || wallet.balance < minBalance) {
            return res.status(403).json({
                message: `Free plan requires a minimum wallet balance of ${minBalance} EGP to go live.`,
                code: 'INSUFFICIENT_WALLET_BALANCE'
            });
        }
    } else {
        // Paid Plan
        if (sub.status !== 'active') {
            return res.status(403).json({
                message: 'Active subscription required for paid plans.',
                code: 'SUBSCRIPTION_INACTIVE'
            });
        }
    }

    next();
};

/**
 * Guard: Strictly checks limits for creating new stores.
 */
export const protectStoreLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const sub = req.subscription;
    if (!sub || !sub.planId) return res.status(403).json({ message: 'No active plan' });

    const plan = sub.planId as any;
    if (plan.storeLimit === -1) return next(); // Unlimited

    const Store = mongoose.model('Store');
    const storeCount = await Store.countDocuments({ ownerId: req.user._id });

    if (storeCount >= plan.storeLimit) {
        return res.status(403).json({
            message: `Your ${plan.name} plan allows only ${plan.storeLimit} stores.`,
            code: 'STORE_LIMIT_REACHED'
        });
    }

    next();
};

/**
 * Guard: Strictly checks limits for creating new products.
 */
export const protectProductLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const sub = req.subscription;
    if (!sub || !sub.planId) return res.status(403).json({ message: 'No active plan' });

    const plan = sub.planId as any;
    if (plan.productLimit === -1) return next(); // Unlimited

    // Use specific storeId from request
    const storeId = req.body.storeId || req.query.storeId;
    if (!storeId) return res.status(400).json({ message: 'storeId is required to check limits' });

    const Product = mongoose.model('Product');
    const productCount = await Product.countDocuments({ storeId });

    if (productCount >= plan.productLimit) {
        return res.status(403).json({
            message: `Store product limit reached (${plan.productLimit} products). Upgrade your plan for more.`,
            code: 'PRODUCT_LIMIT_REACHED'
        });
    }

    next();
};

/**
 * Logic Guard: Enforces Grace Period and Trial blocking
 */
export const checkServiceAvailability = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const sub = req.subscription;
    if (!sub) return next();

    const now = new Date();

    // Past Due or Expired (Grace Period Check)
    if (sub.status === 'past_due' || sub.status === 'expired') {
        if (sub.gracePeriodEnd && now > sub.gracePeriodEnd) {
            return res.status(403).json({
                message: 'Grace period expired. Please renew your subscription to resume service.',
                code: 'GRACE_PERIOD_EXPIRED'
            });
        }

        // During grace period, orders are blocked per requirement
        if (req.path.includes('/orders') && req.method === 'POST') {
            return res.status(403).json({
                message: 'Subscription payment pending. Order creation is temporarily blocked.',
                code: 'PAYMENT_PENDING'
            });
        }
    }

    next();
};
