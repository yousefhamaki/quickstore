import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Subscription from '../models/Subscription';
import Wallet from '../models/Wallet';
import WalletTransaction from '../models/WalletTransaction';
import Plan from '../models/Plan';
import Receipt from '../models/Receipt';
import BillingProfile from '../models/BillingProfile';
import mongoose from 'mongoose';

/**
 * Idempotent Wallet Creation Helper
 */
export const ensureWallet = async (userId: string) => {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        // Create with zero balance if missing
        wallet = await Wallet.create({
            userId,
            balance: 0,
            currency: 'EGP'
        });
        console.log(`Initialized missing wallet for user ${userId}`);
    }
    return wallet;
};

/**
 * @desc    Get billing overview (Plan, Wallet, Limits, Usage)
 * @route   GET /api/billing/overview
 */
export const getBillingOverview = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;

        // 1. Ensure Wallet exists (Idempotent)
        const wallet = await ensureWallet(userId.toString());

        // 2. Get Subscription & Plan (With Safe Defaults)
        let subscription = await Subscription.findOne({ userId }).populate('planId');

        // If no subscription, get the Free plan as default
        if (!subscription) {
            const freePlan = await Plan.findOne({ type: 'free' });
            if (freePlan) {
                // Auto-create free subscription if missing as a fallback
                subscription = await Subscription.create({
                    userId,
                    planId: freePlan._id,
                    status: 'active',
                    expiresAt: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000) // 10 years for free
                });
                subscription = await subscription.populate('planId');
            }
        }

        const plan = (subscription?.planId as any) || {
            name: 'No Plan',
            type: 'free',
            monthlyPrice: 0,
            storeLimit: 0,
            productLimit: 0,
            features: { dropshipping: false, customDomain: false }
        };

        // 3. Usage Stats
        const Store = mongoose.model('Store');
        const Product = mongoose.model('Product');

        const storeCount = await Store.countDocuments({ ownerId: userId });

        // Aggregate products across all stores
        const stores = await Store.find({ ownerId: userId }).select('_id');
        const storeIds = stores.map(s => s._id);
        const productCount = await Product.countDocuments({ storeId: { $in: storeIds } });

        // 4. Blocking Reasons
        let blockingReason = null;
        if (plan.type === 'free' && wallet.balance < 250) {
            blockingReason = "LOW_WALLET";
        } else if (subscription?.status === 'past_due' || subscription?.status === 'expired') {
            blockingReason = "SUBSCRIPTION_EXPIRED";
        }

        res.json({
            wallet: {
                balance: wallet.balance,
                currency: wallet.currency
            },
            plan: {
                name: plan.name,
                type: plan.type,
                monthlyPrice: plan.monthlyPrice,
                features: plan.features
            },
            subscription: {
                status: subscription?.status || 'inactive',
                startedAt: subscription?.startedAt,
                expiresAt: subscription?.expiresAt,
                trialExpiresAt: subscription?.trialExpiresAt,
                gracePeriodEnd: subscription?.gracePeriodEnd,
                renewalDate: subscription?.expiresAt
            },
            usage: {
                storesUsed: storeCount,
                storeLimit: plan.storeLimit,
                productsUsed: productCount,
                productLimit: plan.productLimit
            },
            blockingReason
        });
    } catch (error) {
        console.error('Overview Error:', error);
        res.status(500).json({ message: 'Error fetching billing overview', error });
    }
};

/**
 * @desc    Get Wallet Transaction History
 * @route   GET /api/billing/transactions
 */
export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const transactions = await WalletTransaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await WalletTransaction.countDocuments({ userId: req.user._id });

        res.json({
            transactions,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
};

/**
 * @desc    Get Receipts
 * @route   GET /api/billing/receipts
 */
export const getReceipts = async (req: AuthRequest, res: Response) => {
    try {
        const receipts = await Receipt.find({ userId: req.user._id })
            .sort({ issuedAt: -1 });

        res.json(receipts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching receipts', error });
    }
};

/**
 * @desc    Subscribe to a plan (Restricted Logic)
 * @route   POST /api/billing/subscribe
 */
export const subscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { planId } = req.body;
        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        const wallet = await Wallet.findOne({ userId: req.user._id });

        // Security: Prevent switching to a paid plan if wallet has 0 or insufficient balance
        if (plan.type === 'paid' && (!wallet || wallet.balance < plan.monthlyPrice)) {
            return res.status(400).json({
                message: `Insufficient wallet balance. You need ${plan.monthlyPrice} EGP to activate the ${plan.name} plan.`
            });
        }

        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        // Security: Paid plans start as "inactive" (pending webhook confirmation)
        const initialStatus = plan.type === 'free' ? 'active' : 'inactive';

        const subscription = await Subscription.findOneAndUpdate(
            { userId: req.user._id },
            {
                planId: plan._id,
                status: initialStatus,
                expiresAt,
                startedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({
            message: plan.type === 'free' ? 'Plan updated successfully' : 'Subscription pending payment',
            subscription
        });
    } catch (error) {
        res.status(500).json({ message: 'Subscription failed', error });
    }
};

/**
 * @desc    Update billing profile
 */
export const updateBillingProfile = async (req: AuthRequest, res: Response) => {
    try {
        const profile = await BillingProfile.findOneAndUpdate(
            { userId: req.user._id },
            { ...req.body, userId: req.user._id },
            { upsert: true, new: true }
        );
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Error updating billing profile', error });
    }
};

/**
 * @desc    Get all available plans
 */
export const getPlans = async (req: Request, res: Response) => {
    try {
        const plans = await Plan.find({ isActive: true });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching plans', error });
    }
};

/**
 * @desc    Get current user subscription
 * @route   GET /api/billing/subscription
 */
export const getCurrentSubscription = async (req: AuthRequest, res: Response) => {
    try {
        const subscription = await Subscription.findOne({ userId: req.user._id }).populate('planId');
        res.json(subscription);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subscription', error });
    }
};

/**
 * @desc    Recharge wallet
 */
export const rechargeWallet = async (req: AuthRequest, res: Response) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid recharge amount' });

        // DEVELOPMENT MODE: If Paymob keys are missing, simulate an instant success for testing
        if (!process.env.PAYMOB_API_KEY || process.env.NODE_ENV === 'development') {
            const wallet = await Wallet.findOneAndUpdate(
                { userId: req.user._id },
                { $inc: { balance: amount } },
                { new: true, upsert: true }
            );

            // Create ledger entry for the simulation
            await WalletTransaction.create({
                userId: req.user._id,
                type: 'credit',
                amount,
                reason: 'recharge',
                referenceId: new mongoose.Types.ObjectId()
            });

            return res.json({
                success: true,
                message: 'SIMULATED SUCCESS: Since Paymob keys are not configured, balance has been added directly for testing.',
                newBalance: wallet.balance
            });
        }

        // Production: Redirect to Paymob
        const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=PRODUCTION_TOKEN_HERE`;
        res.json({ success: true, paymentUrl });
    } catch (error) {
        console.error('Recharge Error:', error);
        res.status(500).json({ message: 'Recharge failed', error });
    }
};

/**
 * Internal Logic: Deduct Order Fee with MongoDB Transaction
 */
export const processOrderFee = async (userId: string, orderId: any, session?: mongoose.ClientSession) => {
    const WalletModel = mongoose.model('Wallet');
    const WalletTransactionModel = mongoose.model('WalletTransaction');
    const ReceiptModel = mongoose.model('Receipt');
    const SubscriptionModel = mongoose.model('Subscription');

    const sub = await SubscriptionModel.findOne({ userId }).populate('planId');
    if (!sub) throw new Error('Subscription not found');

    const plan = sub.planId as any;
    const fee = plan.orderFee || 0.5;

    const wallet = await WalletModel.findOne({ userId });

    // SAFEGUARD: Free plan must have prepaid balance
    if (plan.type === 'free' && (!wallet || wallet.balance < fee)) {
        throw new Error('Insufficient wallet balance (Free plan requires prepaid fees)');
    }

    // Deduct Balance
    const updatedWallet = await WalletModel.findOneAndUpdate(
        { userId },
        { $inc: { balance: -fee } },
        { new: true, session }
    );

    const orderIdObj = typeof orderId === 'string' ? new mongoose.Types.ObjectId(orderId) : orderId;

    // LEDGER: Create Transaction Entry
    await WalletTransactionModel.create([{
        userId,
        type: 'debit',
        amount: fee,
        reason: 'order_fee',
        referenceId: orderIdObj
    }], { session });

    // LEDGER: Create Receipt
    await ReceiptModel.create([{
        userId,
        referenceId: orderIdObj,
        type: 'order',
        amount: fee,
        currency: 'EGP'
    }], { session });

    return { success: true, newBalance: updatedWallet?.balance };
};
