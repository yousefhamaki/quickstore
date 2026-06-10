import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Subscription from '../models/Subscription';
import Wallet from '../models/Wallet';
import WalletTransaction from '../models/WalletTransaction';
import Plan from '../models/SubscriptionPlan';
import Receipt from '../models/Receipt';
import BillingProfile from '../models/BillingProfile';
import mongoose from 'mongoose';
import axios from 'axios';
import Transaction from '../models/Transaction';

/**
 * Idempotent Wallet Creation Helper
 */
export const ensureWallet = async (userId: string) => {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        // Create with 500 EGP balance as a signup gift
        wallet = await Wallet.create({
            userId,
            balance: 500,
            currency: 'EGP'
        });

        // Record welcome gift transaction in ledger
        await WalletTransaction.create({
            userId,
            type: 'credit',
            amount: 500,
            reason: 'gift',
            referenceId: wallet._id
        });

        console.log(`Initialized missing wallet for user ${userId} with 500 EGP gift`);
    }
    return wallet;
};

/**
 * Helper to record a subscription intention (used in signup or direct billing)
 */
export const autoSubscribeRecord = async (userId: string, planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    const plan = await Plan.findById(planId);
    if (!plan) throw new Error('Plan not found');

    const wallet = await Wallet.findOne({ userId });

    // For paid plans, we start as inactive until payment is received or balance is sufficient
    // Since this might be called during signup, balance is usually 0. 
    // We let them create the record as 'inactive'.
    const initialStatus = plan.type === 'free' ? 'active' : 'inactive';

    const expiresAt = new Date();
    if (billingCycle === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const subscription = await Subscription.findOneAndUpdate(
        { userId },
        {
            planId: plan._id,
            status: initialStatus,
            expiresAt,
            startedAt: new Date(),
            billingCycle
        },
        { upsert: true, new: true }
    );

    return subscription;
};

/**
 * Deducts plan price from wallet and activates subscription
 */
export const paySubscriptionWithWallet = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const sub = await Subscription.findOne({ userId }).populate('planId');

        if (!sub || !sub.planId) {
            return res.status(404).json({ message: 'No pending subscription found' });
        }

        const plan = sub.planId as any;
        if (sub.status === 'active') {
            return res.status(400).json({ message: 'Subscription is already active' });
        }

        if (plan.type === 'free') {
            sub.status = 'active';
            await sub.save();
            return res.json({ message: 'Free plan activated', subscription: sub });
        }

        const wallet = await ensureWallet(userId.toString());
        const billingCycle = (sub as any).billingCycle || 'monthly';
        let price = plan.monthlyPrice || plan.price;
        if (billingCycle === 'yearly') {
            price = price * 12 * 0.8; // Apply 20% discount for yearly billing
        }

        if (wallet.balance < price) {
            return res.status(400).json({
                message: `Insufficient balance. Plan price is ${price} EGP, but your balance is ${wallet.balance} EGP.`,
                required: price,
                current: wallet.balance
            });
        }

        // Transactional Update
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 1. Deduct from wallet
            wallet.balance -= price;
            await wallet.save({ session });

            // 2. Create transaction record
            await WalletTransaction.create([{
                userId,
                type: 'debit',
                amount: price,
                reason: 'plan_payment',
                referenceId: sub._id
            }], { session });

            // 3. Activate subscription
            sub.status = 'active';
            sub.startedAt = new Date();
            const expires = new Date();
            if (billingCycle === 'yearly') {
                expires.setFullYear(expires.getFullYear() + 1);
            } else {
                expires.setMonth(expires.getMonth() + 1);
            }
            sub.expiresAt = expires;
            await sub.save({ session });

            // 4. Create receipt
            await Receipt.create([{
                userId,
                referenceId: sub._id,
                type: 'wallet_recharge', // Or a new type 'subscription'
                amount: price,
                currency: 'EGP'
            }], { session });

            await session.commitTransaction();
            res.json({ message: 'Subscription paid successfully from wallet', subscription: sub });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('Wallet Payment Error:', error);
        res.status(500).json({ message: 'Payment failed', error: (error as any).message });
    }
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

        // Handle case where subscription exists but planId is null (e.g. after re-seeding)
        let plan = subscription?.planId as any;
        if (subscription && !plan) {
            const freePlan = await Plan.findOne({ type: 'free' });
            if (freePlan) {
                subscription.planId = freePlan._id as any;
                await subscription.save();
                plan = freePlan;
            }
        }

        if (!plan) {
            plan = {
                name: 'No Plan',
                type: 'free',
                monthlyPrice: 0,
                storeLimit: 0,
                productLimit: 0,
                features: { dropshipping: false, customDomain: false }
            };
        }

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

        // 5. Billing Profile
        const profile = await BillingProfile.findOne({ userId });

        res.json({
            wallet: {
                balance: wallet.balance,
                currency: wallet.currency
            },
            plan: {
                name: plan.name,
                name_en: plan.name_en || plan.name,
                name_ar: plan.name_ar || plan.name,
                type: plan.type,
                monthlyPrice: plan.monthlyPrice || (plan as any).price || 0,
                features: plan.features
            },
            subscription: {
                status: subscription?.status || 'inactive',
                startedAt: subscription?.startedAt,
                expiresAt: subscription?.expiresAt,
                trialExpiresAt: subscription?.trialExpiresAt,
                gracePeriodEnd: subscription?.gracePeriodEnd,
                renewalDate: subscription?.expiresAt,
                billingCycle: (subscription as any)?.billingCycle || 'monthly'
            },
            usage: {
                storesUsed: storeCount,
                storeLimit: plan.storeLimit,
                productsUsed: productCount,
                productLimit: plan.productLimit
            },
            blockingReason,
            profile // Added profile here
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
        const { planId, billingCycle } = req.body;
        const userId = req.user._id;
        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        const wallet = await ensureWallet(userId.toString());
        let price = plan.monthlyPrice || plan.price;
        if (billingCycle === 'yearly') {
            price = price * 12 * 0.8;
        }

        if (plan.type === 'paid' && wallet.balance < price) {
            return res.status(400).json({
                message: `Insufficient wallet balance. Price is ${price.toFixed(0)} EGP, but your balance is ${wallet.balance.toFixed(0)} EGP.`
            });
        }

        // Auto-activate subscription if paid and wallet has sufficient balance
        if (plan.type === 'paid') {
            const subscription = await autoSubscribeRecord(userId.toString(), planId, billingCycle);

            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                // 1. Deduct from wallet
                wallet.balance -= price;
                await wallet.save({ session });

                // 2. Create transaction record
                await WalletTransaction.create([{
                    userId,
                    type: 'debit',
                    amount: price,
                    reason: 'plan_payment',
                    referenceId: subscription._id
                }], { session });

                // 3. Activate subscription
                subscription.status = 'active';
                subscription.startedAt = new Date();
                const expires = new Date();
                if (billingCycle === 'yearly') {
                    expires.setFullYear(expires.getFullYear() + 1);
                } else {
                    expires.setMonth(expires.getMonth() + 1);
                }
                subscription.expiresAt = expires;
                await subscription.save({ session });

                // 4. Create receipt
                await Receipt.create([{
                    userId,
                    referenceId: subscription._id,
                    type: 'wallet_recharge',
                    amount: price,
                    currency: 'EGP'
                }], { session });

                await session.commitTransaction();
                session.endSession();

                return res.json({
                    message: 'Subscription updated and paid successfully from wallet',
                    subscription,
                    canPayWithWallet: true,
                    price
                });
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error;
            }
        }

        // Free plan auto-activation
        const subscription = await autoSubscribeRecord(userId.toString(), planId, billingCycle);
        res.json({
            message: 'Plan updated successfully',
            subscription,
            canPayWithWallet: false
        });
    } catch (error) {
        res.status(500).json({ message: 'Subscription failed', error: (error as any).message });
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

import { redisClient } from '../config/redis';

/**
 * @desc    Get all available plans
 */
export const getPlans = async (req: Request, res: Response) => {
    try {
        const cacheKey = 'plans:active';

        let cachedPlans = null;
        try {
            cachedPlans = await redisClient.get(cacheKey);
        } catch (redisErr) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`);
        }

        if (cachedPlans) {
            return res.json(JSON.parse(cachedPlans));
        }

        const plans = await Plan.find({ isActive: true });

        try {
            const cache = await redisClient.setex(cacheKey, 86400, JSON.stringify(plans)); // 24 hour cache
            console.log(cache);
        } catch (redisErr) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`);
        }

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
        const { amount, method, walletNumber } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid recharge amount' });
        if (!['card', 'wallet', 'fawry'].includes(method)) return res.status(400).json({ message: 'Invalid payment method' });
        if (method === 'wallet' && !walletNumber) return res.status(400).json({ message: 'Wallet number is required' });

        const apiKey = process.env.PAYMOB_API_KEY;
        if (!apiKey && process.env.NODE_ENV === 'development') {
            // Development fallback for testing without Paymob
            const wallet = await Wallet.findOneAndUpdate(
                { userId: req.user._id },
                { $inc: { balance: amount } },
                { new: true, upsert: true }
            );

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
                newBalance: wallet?.balance
            });
        } else if (!apiKey) {
           return res.status(500).json({ message: 'Payment gateway not configured correctly' });
        }

        const integrationIds: Record<string, string> = {
            card: process.env.PAYMOB_CARD_INTEGRATION_ID || '111111',
            wallet: process.env.PAYMOB_WALLET_INTEGRATION_ID || '222222',
            fawry: process.env.PAYMOB_FAWRY_INTEGRATION_ID || '333333'
        };

        const integrationId = integrationIds[method];

        // 1. Authentication Request
        const authRes = await axios.post('https://accept.paymob.com/api/auth/tokens', {
            api_key: apiKey
        });
        const token = authRes.data.token;

        // 2. Order Registration
        const orderRes = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
            auth_token: token,
            delivery_needed: "false",
            amount_cents: Math.round(amount * 100).toString(),
            currency: "EGP",
            items: []
        });
        const paymobOrderId = orderRes.data.id;

        // Create Pending Transaction in DB
        await Transaction.create({
            userId: req.user._id,
            orderId: paymobOrderId.toString(),
            amount,
            method,
            status: 'pending'
        });

        // 3. Payment Key Generation
        const paymentKeyRes = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
            auth_token: token,
            amount_cents: Math.round(amount * 100).toString(),
            expiration: 3600,
            order_id: paymobOrderId,
            billing_data: {
                apartment: "NA",
                email: req.user.email || "user@quickstore.local",
                floor: "NA",
                first_name: req.user.name?.split(' ')[0] || "Customer",
                street: "NA",
                building: "NA",
                phone_number: walletNumber || "+20100000000",
                shipping_method: "NA",
                postal_code: "NA",
                city: "NA",
                country: "EG",
                last_name: req.user.name?.split(' ')[1] || "Name",
                state: "NA"
            },
            currency: "EGP",
            integration_id: parseInt(integrationId, 10)
        });

        const paymentToken = paymentKeyRes.data.token;

        // Handle Response based on Method
        if (method === 'card') {
            const iframeId = process.env.PAYMOB_IFRAME_ID || '000000';
            const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;
            return res.json({ success: true, paymentUrl });
        } else if (method === 'wallet') {
            const payRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
                source: {
                    identifier: walletNumber,
                    subtype: "WALLET"
                },
                payment_token: paymentToken
            });
            return res.json({ success: true, paymentUrl: payRes.data.redirect_url });
        } else if (method === 'fawry') {
            const payRes = await axios.post('https://accept.paymob.com/api/acceptance/payments/pay', {
                source: {
                    identifier: "AGGREGATOR",
                    subtype: "AGGREGATOR"
                },
                payment_token: paymentToken
            });
            
            // For Fawry, the ref code is typically in data.bill_reference
            let referenceCode = '';
            if (payRes.data.data && payRes.data.data.bill_reference) {
                referenceCode = payRes.data.data.bill_reference.toString();
            } else if (payRes.data.id) {
                referenceCode = payRes.data.id.toString();
            }

            return res.json({ success: true, referenceCode });
        }

    } catch (error: any) {
        console.error('Recharge Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Recharge failed', error: error.message });
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

    let fee = 5; // Default fallback fee
    let planType = 'unknown';

    try {
        const plan = sub.planId;
        console.log(`[processOrderFee] userId: ${userId}, plan:`, plan ? "Exists" : "Null/Undefined");

        if (plan && typeof plan === 'object') {
            const anyPlan = plan as any;
            fee = typeof anyPlan.orderFee === 'number' ? anyPlan.orderFee : 5;
            planType = anyPlan.type || 'unknown';
        } else {
            console.warn(`[processOrderFee] Plan is missing or unpopulated for subscription ${sub._id}`);
        }
    } catch (innerError) {
        console.error(`[processOrderFee] Crash while reading plan properties:`, innerError);
        // We continue with fee = 5 as fallback
    }

    const wallet = await WalletModel.findOne({ userId });

    // SAFEGUARD: Free plan must have prepaid balance
    if (planType === 'free' && (!wallet || wallet.balance < fee)) {
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
