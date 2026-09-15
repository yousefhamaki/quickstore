import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Subscription from '../models/Subscription';
import Wallet from '../models/Wallet';
import WalletLedger from '../models/WalletLedger';
import Plan from '../models/SubscriptionPlan';
import Receipt from '../models/Receipt';
import BillingProfile from '../models/BillingProfile';
import mongoose from 'mongoose';
import axios from 'axios';
import Transaction from '../models/Transaction';
import { sendInvoiceEmail } from '../services/emailService';
import Store from '../models/Store';
import EmailLedgerEntry from '../models/EmailLedgerEntry';
import EmailAccount from '../models/EmailAccount';
import { CampaignQuotaService } from '../services/CampaignQuotaService';
import { ProrationService } from '../services/billing/ProrationService';
import { WALLET_LEDGER_REASONS } from '../constants/walletLedgerReasons';
import { addBillingCycle } from '../utils/billingCycle';

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

        // Record welcome gift in the wallet ledger (previously this only wrote
        // to the now-deprecated WalletTransaction, so gifted balances never
        // showed up in the canonical ledger/audit trail).
        await WalletLedger.create({
            userId,
            type: 'credit',
            amount: 500,
            reason: WALLET_LEDGER_REASONS.SIGNUP_GIFT,
            referenceId: wallet._id,
            balanceAfter: wallet.balance
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

            // 2. Log to the wallet ledger (canonical source of truth)
            await WalletLedger.create([{
                userId,
                type: 'debit',
                amount: price,
                reason: WALLET_LEDGER_REASONS.PLAN_PAYMENT,
                referenceId: sub._id,
                balanceAfter: wallet.balance
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

            // Trigger invoice email notification asynchronously
            if (req.user && req.user.email) {
                const invoiceDetails = {
                    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                    buyerName: req.user.name || 'Merchant',
                    amount: price,
                    currency: 'EGP',
                    date: new Date().toISOString(),
                    paymentMethod: 'Buildora Wallet',
                    items: [
                        {
                            name: `${plan.name} Subscription - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
                            quantity: 1,
                            price: price
                        }
                    ]
                };
                sendInvoiceEmail(req.user.email, 'Buildora SaaS', invoiceDetails).catch(err => {
                    console.error('[BillingController] Failed to send subscription payment invoice email:', err);
                });
            }

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

        const transactions = await WalletLedger.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await WalletLedger.countDocuments({ userId: req.user._id });

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
export const subscribePreview = async (req: AuthRequest, res: Response) => {
    try {
        const { planId, billingCycle } = req.body;
        const userId = req.user._id;

        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        const currentSub = await Subscription.findOne({ userId }).populate('planId');

        let targetPrice = plan.monthlyPrice || plan.price;
        if (billingCycle === 'yearly') {
            targetPrice = targetPrice * 12 * 0.8;
        }

        // Case 1: No active paid subscription
        if (!currentSub || currentSub.status !== 'active' || (currentSub.planId as any).type === 'free') {
            const currentExpiryDate = new Date();
            if (billingCycle === 'yearly') {
                currentExpiryDate.setFullYear(currentExpiryDate.getFullYear() + 1);
            } else {
                currentExpiryDate.setMonth(currentExpiryDate.getMonth() + 1);
            }

            return res.json({
                isUpgrade: true,
                isDowngrade: false,
                proration: {
                    currentPlanPrice: 0,
                    newPlanPrice: targetPrice,
                    usedDays: 0,
                    remainingDays: billingCycle === 'yearly' ? 365 : 30,
                    currentPlanUsage: 0,
                    unusedCredit: 0,
                    remainingNewPlanCost: targetPrice,
                    amountToPay: targetPrice,
                    currentExpiryDate,
                    nextRenewalPrice: targetPrice
                }
            });
        }

        // Case 2: Active paid subscription
        const currentPlan = currentSub.planId as any;
        let currentPrice = currentPlan.monthlyPrice || currentPlan.price;
        if (currentSub.billingCycle === 'yearly') {
            currentPrice = currentPrice * 12 * 0.8;
        }

        // Switching cadence (monthly<->yearly) resets expiresAt to a fresh
        // cycle from today regardless of tier change — see the identical
        // isCycleChange logic (and the "why" comment) in subscribe() below.
        // The preview must show the SAME date the actual subscribe call will
        // end up setting, or the confirmation UI lies to the merchant.
        const isCycleChange = currentSub.billingCycle !== billingCycle;
        const projectedExpiryDate = isCycleChange ? addBillingCycle(new Date(), billingCycle) : currentSub.expiresAt;

        if (targetPrice > currentPrice) {
            // Upgrade
            const proration = ProrationService.calculatePlanChange({
                currentPlanPrice: currentPrice,
                newPlanPrice: targetPrice,
                startedAt: currentSub.startedAt,
                expiresAt: currentSub.expiresAt
            });
            proration.currentExpiryDate = projectedExpiryDate;

            return res.json({
                isUpgrade: true,
                isDowngrade: false,
                isCycleChange,
                proration
            });
        } else if (targetPrice < currentPrice) {
            // Downgrade
            return res.json({
                isUpgrade: false,
                isDowngrade: true,
                isCycleChange,
                message: isCycleChange
                    ? "You are about to downgrade your subscription.\nYour current subscription benefits will be removed immediately.\nAny unused value remaining in your current subscription will be forfeited.\nSince you're also changing your billing cycle, your renewal date will be reset to a new cycle starting today.\nThis action cannot be undone."
                    : "You are about to downgrade your subscription.\nYour current subscription benefits will be removed immediately.\nAny unused value remaining in your current subscription will be forfeited.\nYour subscription renewal date will remain unchanged.\nThis action cannot be undone.",
                nextRenewalPrice: targetPrice,
                currentExpiryDate: projectedExpiryDate
            });
        } else {
            // Same tier/price migration
            return res.json({
                isUpgrade: false,
                isDowngrade: false,
                isCycleChange,
                proration: {
                    currentPlanPrice: currentPrice,
                    newPlanPrice: targetPrice,
                    usedDays: 0,
                    remainingDays: 0,
                    currentPlanUsage: 0,
                    unusedCredit: 0,
                    remainingNewPlanCost: 0,
                    amountToPay: 0,
                    currentExpiryDate: projectedExpiryDate,
                    nextRenewalPrice: targetPrice
                }
            });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to calculate proration preview', error: error.message });
    }
};

export const subscribe = async (req: AuthRequest, res: Response) => {
    const userId = req.user._id;
    const lockKey = `lock:subscription:${userId}`;

    try {
        const { planId, billingCycle, confirmDowngrade } = req.body;
        
        // Concurrency Lock: Prevent duplicate requests & double upgrades.
        // Uses acquireLock (fails closed if Redis can't confirm the lock)
        // rather than the general-purpose cached redisClient.set, which
        // fails OPEN (reports success) under Redis degradation — fine for
        // a cache write, not for a lock guarding against a double-charge.
        const { redisClient, acquireLock } = await import('../config/redis');
        const acquired = await acquireLock(lockKey, 10);
        if (!acquired) {
            return res.status(409).json({ message: 'A plan change transaction is already in progress. Please wait.' });
        }

        const plan = await Plan.findById(planId);
        if (!plan) {
            await redisClient.del(lockKey);
            return res.status(404).json({ message: 'Plan not found' });
        }

        const wallet = await ensureWallet(userId.toString());
        let targetPrice = plan.monthlyPrice || plan.price;
        if (billingCycle === 'yearly') {
            targetPrice = targetPrice * 12 * 0.8;
        }

        const currentSub = await Subscription.findOne({ userId }).populate('planId');

        // Check if there is an active paid subscription to prorate
        if (currentSub && currentSub.status === 'active' && (currentSub.planId as any).type === 'paid') {
            const currentPlan = currentSub.planId as any;
            let currentPrice = currentPlan.monthlyPrice || currentPlan.price;
            if (currentSub.billingCycle === 'yearly') {
                currentPrice = currentPrice * 12 * 0.8;
            }

            // Was captured BEFORE we ever assign currentSub.billingCycle =
            // billingCycle below, in any of the three branches — used to
            // detect an actual cadence change (monthly<->yearly), not just a
            // tier change.
            const previousBillingCycle = currentSub.billingCycle;
            const isCycleChange = previousBillingCycle !== billingCycle;

            if (targetPrice > currentPrice) {
                // 1. Upgrade Flow
                const proration = ProrationService.calculatePlanChange({
                    currentPlanPrice: currentPrice,
                    newPlanPrice: targetPrice,
                    startedAt: currentSub.startedAt,
                    expiresAt: currentSub.expiresAt
                });

                if (wallet.balance < proration.amountToPay) {
                    await redisClient.del(lockKey);
                    return res.status(400).json({
                        message: `Insufficient wallet balance. Price is ${proration.amountToPay.toFixed(2)} EGP, but your balance is ${wallet.balance.toFixed(2)} EGP.`,
                        proration
                    });
                }

                const session = await mongoose.startSession();
                session.startTransaction();
                try {
                    // Deduct from wallet
                    wallet.balance -= proration.amountToPay;
                    await wallet.save({ session });

                    // Log to the wallet ledger (canonical source of truth)
                    await WalletLedger.create([{
                        userId,
                        type: 'debit',
                        amount: proration.amountToPay,
                        reason: WALLET_LEDGER_REASONS.PLAN_UPGRADE,
                        referenceId: currentSub._id,
                        balanceAfter: wallet.balance
                    }], { session });

                    // Update subscription plan (keep expiry unchanged UNLESS
                    // the billing cadence itself is changing — e.g. monthly
                    // -> yearly. ProrationService only charges for the
                    // remaining days of the CURRENT cycle at the new price,
                    // so leaving expiresAt as-is is correct when the cadence
                    // stays the same. But if it changes, the old expiresAt no
                    // longer means anything (it was computed assuming a
                    // monthly-length cycle, say) — this is exactly the bug
                    // reported as "my plan is yearly but the renewal date
                    // looks like a month away": switching cadence updated
                    // billingCycle but never touched expiresAt.
                    currentSub.planId = plan._id;
                    currentSub.billingCycle = billingCycle;
                    if (isCycleChange) {
                        currentSub.expiresAt = addBillingCycle(new Date(), billingCycle);
                    }
                    await currentSub.save({ session });

                    // Create receipt
                    await Receipt.create([{
                        userId,
                        referenceId: currentSub._id,
                        type: 'wallet_recharge',
                        amount: proration.amountToPay,
                        currency: 'EGP'
                    }], { session });

                    await session.commitTransaction();
                    session.endSession();

                    // Trigger invoice email notification asynchronously
                    if (req.user && req.user.email) {
                        const invoiceDetails = {
                            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                            buyerName: req.user.name || 'Merchant',
                            amount: proration.amountToPay,
                            currency: 'EGP',
                            date: new Date().toISOString(),
                            paymentMethod: 'Buildora Wallet',
                            items: [
                                {
                                    name: `${plan.name} Upgrade - Remaining Cycle`,
                                    quantity: 1,
                                    price: proration.amountToPay
                                }
                            ]
                        };
                        sendInvoiceEmail(req.user.email, 'Buildora SaaS', invoiceDetails).catch(err => {
                            console.error('[BillingController] Failed to send upgrade invoice email:', err);
                        });
                    }

                    await redisClient.del(lockKey);
                    return res.json({
                        message: 'Subscription upgraded successfully',
                        proration,
                        subscription: currentSub
                    });
                } catch (err) {
                    await session.abortTransaction();
                    session.endSession();
                    await redisClient.del(lockKey);
                    throw err;
                }
            } else if (targetPrice < currentPrice) {
                // 2. Downgrade Flow
                if (confirmDowngrade !== true) {
                    await redisClient.del(lockKey);
                    return res.status(400).json({
                        actionRequired: 'confirm_downgrade',
                        message: isCycleChange
                            ? "You are about to downgrade your subscription.\nYour current subscription benefits will be removed immediately.\nAny unused value remaining in your current subscription will be forfeited.\nSince you're also changing your billing cycle, your renewal date will be reset to a new cycle starting today.\nThis action cannot be undone."
                            : "You are about to downgrade your subscription.\nYour current subscription benefits will be removed immediately.\nAny unused value remaining in your current subscription will be forfeited.\nYour subscription renewal date will remain unchanged.\nThis action cannot be undone."
                    });
                }

                const session = await mongoose.startSession();
                session.startTransaction();
                try {
                    // Update subscription plan (keep expiry/started dates
                    // UNLESS the billing cadence itself changed — see the
                    // identical comment on the upgrade branch above.
                    currentSub.planId = plan._id;
                    currentSub.billingCycle = billingCycle;
                    if (isCycleChange) {
                        currentSub.expiresAt = addBillingCycle(new Date(), billingCycle);
                    }
                    await currentSub.save({ session });

                    // No wallet ledger entry here on purpose: a downgrade moves
                    // zero money, and WalletLedger requires amount > 0 (it's a
                    // ledger of balance movements, not a general activity log).
                    // The plan change itself is captured on the Subscription
                    // document's updatedAt/planId.

                    await session.commitTransaction();
                    session.endSession();

                    await redisClient.del(lockKey);
                    return res.json({
                        message: 'Subscription downgraded successfully',
                        subscription: currentSub
                    });
                } catch (err) {
                    await session.abortTransaction();
                    session.endSession();
                    await redisClient.del(lockKey);
                    throw err;
                }
            } else {
                // 3. Same-tier Migration (only relevant when isCycleChange is
                // true — same plan, different billing cadence)
                const session = await mongoose.startSession();
                session.startTransaction();
                try {
                    currentSub.billingCycle = billingCycle;
                    if (isCycleChange) {
                        currentSub.expiresAt = addBillingCycle(new Date(), billingCycle);
                    }
                    await currentSub.save({ session });
                    await session.commitTransaction();
                    session.endSession();

                    await redisClient.del(lockKey);
                    return res.json({
                        message: 'Subscription updated successfully',
                        subscription: currentSub
                    });
                } catch (err) {
                    await session.abortTransaction();
                    session.endSession();
                    await redisClient.del(lockKey);
                    throw err;
                }
            }
        }

        // Legacy / Inactive subscription full activation flow
        if (plan.type === 'paid' && wallet.balance < targetPrice) {
            await redisClient.del(lockKey);
            return res.status(400).json({
                message: `Insufficient wallet balance. Price is ${targetPrice.toFixed(0)} EGP, but your balance is ${wallet.balance.toFixed(0)} EGP.`
            });
        }

        if (plan.type === 'paid') {
            const subscription = await autoSubscribeRecord(userId.toString(), planId, billingCycle);

            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                wallet.balance -= targetPrice;
                await wallet.save({ session });

                await WalletLedger.create([{
                    userId,
                    type: 'debit',
                    amount: targetPrice,
                    reason: WALLET_LEDGER_REASONS.PLAN_PAYMENT,
                    referenceId: subscription._id,
                    balanceAfter: wallet.balance
                }], { session });

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

                await Receipt.create([{
                    userId,
                    referenceId: subscription._id,
                    type: 'wallet_recharge',
                    amount: targetPrice,
                    currency: 'EGP'
                }], { session });

                await session.commitTransaction();
                session.endSession();

                if (req.user && req.user.email) {
                    const invoiceDetails = {
                        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                        buyerName: req.user.name || 'Merchant',
                        amount: targetPrice,
                        currency: 'EGP',
                        date: new Date().toISOString(),
                        paymentMethod: 'Buildora Wallet',
                        items: [
                            {
                                name: `${plan.name} Subscription - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
                                quantity: 1,
                                price: targetPrice
                            }
                        ]
                    };
                    sendInvoiceEmail(req.user.email, 'Buildora SaaS', invoiceDetails).catch(err => {
                        console.error('[BillingController] Failed to send auto-subscribe invoice email:', err);
                    });
                }

                await redisClient.del(lockKey);
                return res.json({
                    message: 'Subscription updated and paid successfully from wallet',
                    subscription,
                    canPayWithWallet: true,
                    price: targetPrice
                });
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                await redisClient.del(lockKey);
                throw error;
            }
        }

        // Free plan activation fallback
        const subscription = await autoSubscribeRecord(userId.toString(), planId, billingCycle);
        await redisClient.del(lockKey);
        res.json({
            message: 'Plan updated successfully',
            subscription,
            canPayWithWallet: false
        });

    } catch (error: any) {
        await redisClient.del(lockKey);
        res.status(500).json({ message: 'Subscription failed', error: error.message });
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

            if (wallet) {
                await WalletLedger.create([{
                    userId: req.user._id,
                    type: 'credit',
                    amount,
                    reason: WALLET_LEDGER_REASONS.RECHARGE,
                    referenceId: wallet._id,
                    balanceAfter: wallet.balance
                }]);
            }

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

    // Ensure a wallet exists (same idempotent helper used everywhere else in
    // this file) instead of a bare findOne. Previously, if a merchant somehow
    // reached order-fee time with no Wallet document at all, findOneAndUpdate
    // below (no upsert) would silently return null: no balance was deducted,
    // no ledger entry was written, yet a Receipt was still created and this
    // function still returned `success: true` — charging a "fee" that never
    // actually left any wallet.
    const wallet = await ensureWallet(userId);

    // SAFEGUARD: Free plan must have prepaid balance
    if (planType === 'free' && wallet.balance < fee) {
        throw new Error('Insufficient wallet balance (Free plan requires prepaid fees)');
    }

    // Deduct Balance
    const updatedWallet = await WalletModel.findOneAndUpdate(
        { userId },
        { $inc: { balance: -fee } },
        { new: true, session }
    );

    if (!updatedWallet) {
        // Should be unreachable now that ensureWallet() ran above, but fail
        // loudly rather than silently charging a Receipt for an undeducted fee.
        throw new Error(`Wallet not found for user ${userId} during order-fee deduction`);
    }

    const orderIdObj = typeof orderId === 'string' ? new mongoose.Types.ObjectId(orderId) : orderId;

    // LEDGER: Create the canonical wallet ledger entry
    await WalletLedger.create([{
        userId: new mongoose.Types.ObjectId(userId),
        type: 'debit',
        amount: fee,
        reason: WALLET_LEDGER_REASONS.ORDER_FEE,
        referenceId: orderIdObj,
        balanceAfter: updatedWallet.balance
    }], session ? { session } : {});

    // LEDGER: Create Receipt (only reached once the deduction is confirmed)
    await ReceiptModel.create([{
        userId,
        referenceId: orderIdObj,
        type: 'order',
        amount: fee,
        currency: 'EGP'
    }], { session });

    return { success: true, newBalance: updatedWallet.balance };
};

/**
 * @desc    Get email quota details & balance overview for a merchant store
 * @route   GET /api/billing/:storeId/email-account
 * @access  Private/Merchant
 */
export const getEmailAccountBalance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const { storeId } = req.params;
        const storeIdStr = storeId as string;

        // Verify store belongs to merchant
        const store = await Store.findOne({ _id: storeIdStr, ownerId: userId });
        if (!store) {
            return res.status(404).json({ message: 'Store not found or unauthorized' });
        }

        const balanceInfo = await CampaignQuotaService.getCreditBalance(storeIdStr);

        // Fetch ledger history (limit 50)
        const ledgerHistory = await EmailLedgerEntry.find({ storeId: storeIdStr })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            balance: balanceInfo.balance,
            planBalance: balanceInfo.planBalance,
            purchasedBalance: balanceInfo.purchasedBalance,
            reserved: balanceInfo.reserved,
            ledgerHistory
        });
    } catch (error) {
        console.error('Get Email Account Balance Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

const EMAIL_PACKAGES = [
    { count: 50, price: 70 },
    { count: 100, price: 120 },
    { count: 250, price: 250 },
    { count: 500, price: 400 }
];

/**
 * @desc    Purchase email credits package using wallet balance
 * @route   POST /api/billing/:storeId/email-account/buy-add-on
 * @access  Private/Merchant
 */
export const buyEmailAddOn = async (req: AuthRequest, res: Response) => {
    const { storeId } = req.params;
    const { emailCount } = req.body;
    const storeIdStr = storeId as string;

    const count = Number(emailCount);
    const pkg = EMAIL_PACKAGES.find(p => p.count === count);
    if (!pkg) {
        return res.status(400).json({ message: 'Invalid email package selection' });
    }

    try {
        // Initialize/verify email account and refresh allowance before starting transaction
        await CampaignQuotaService.getCreditBalance(storeIdStr);
    } catch (err: any) {
        return res.status(500).json({ message: err.message || 'Failed to initialize email account balance' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userId = req.user._id;

        // Verify store belongs to merchant
        const store = await Store.findOne({ _id: storeIdStr, ownerId: userId }).session(session);
        if (!store) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Store not found or unauthorized' });
        }

        // Fetch Wallet
        const wallet = await Wallet.findOne({ userId }).session(session);
        if (!wallet || wallet.balance < pkg.price) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                message: `Insufficient wallet balance. Package costs ${pkg.price} EGP, but your balance is ${wallet?.balance || 0} EGP.` 
            });
        }

        // Deduct from wallet
        wallet.balance -= pkg.price;
        await wallet.save({ session });

        // Log to the wallet ledger (canonical source of truth). Note: this
        // used to also write a WalletTransaction with reason 'addon_purchase',
        // which is NOT in that model's rigid enum — every add-on purchase was
        // silently failing with a ValidationError that aborted this whole
        // transaction. WalletLedger's reason is free-text, so this is fixed
        // by consolidating onto it.
        const ledgerTx = await WalletLedger.create([{
            userId,
            type: 'debit',
            amount: pkg.price,
            reason: WALLET_LEDGER_REASONS.ADDON_PURCHASE,
            referenceId: store._id,
            balanceAfter: wallet.balance
        }], { session });

        // Record receipt
        await Receipt.create([{
            userId,
            referenceId: ledgerTx[0]._id,
            type: 'wallet_recharge',
            amount: pkg.price,
            currency: 'EGP'
        }], { session });

        // Update EmailAccount
        let emailAccount = await EmailAccount.findOne({ storeId: storeIdStr }).session(session);
        if (!emailAccount) {
            emailAccount = new EmailAccount({
                storeId: storeIdStr,
                planBalance: 0,
                purchasedBalance: count,
                balance: count,
                reserved: 0
            });
        } else {
            emailAccount.purchasedBalance += count;
            emailAccount.balance = emailAccount.planBalance + emailAccount.purchasedBalance;
        }
        await emailAccount.save({ session });

        // Write ledger entry
        await EmailLedgerEntry.create([{
            storeId: storeIdStr,
            type: 'purchase',
            amount: count,
            referenceId: ledgerTx[0]._id.toString(),
            description: `Purchased email credit add-on: ${count} emails (${pkg.price} EGP)`
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // Trigger invoice email notification asynchronously after successful commit
        if (req.user && req.user.email) {
            const invoiceDetails = {
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                buyerName: req.user.name || 'Merchant',
                amount: pkg.price,
                currency: 'EGP',
                date: new Date().toISOString(),
                paymentMethod: 'Buildora Wallet',
                items: [
                    {
                        name: `Email Campaign Credits Add-On - ${count} Emails`,
                        quantity: 1,
                        price: pkg.price
                    }
                ]
            };
            sendInvoiceEmail(req.user.email, 'Buildora SaaS Add-On', invoiceDetails).catch(err => {
                console.error('[BillingController] Failed to send email add-on invoice email:', err);
            });
        }

        res.json({
            message: `Successfully purchased ${count} emails!`,
            balance: emailAccount.balance,
            planBalance: emailAccount.planBalance,
            purchasedBalance: emailAccount.purchasedBalance,
            walletBalance: wallet.balance
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Buy Email Add-on Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

/**
 * @desc    Move purchased email credits from one of the merchant's stores to
 *          another. Only the purchased add-on balance is transferable (not
 *          the monthly plan allowance) — see
 *          CampaignQuotaService.transferPurchasedCredits for why.
 * @route   POST /api/billing/:storeId/email-account/transfer
 * @access  Private/Merchant
 */
export const transferEmailCredits = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const { storeId: fromStoreId } = req.params;
        const { toStoreId, amount } = req.body;

        if (!toStoreId) {
            return res.status(400).json({ message: 'toStoreId is required' });
        }
        const parsedAmount = Number(amount);
        if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'amount must be a positive whole number' });
        }

        // Verify BOTH stores belong to the requesting merchant — moving
        // credits into a store you don't own (or out of one you don't own)
        // must never be possible.
        const [fromStore, toStore] = await Promise.all([
            Store.findOne({ _id: fromStoreId, ownerId: userId }),
            Store.findOne({ _id: toStoreId, ownerId: userId })
        ]);
        if (!fromStore) {
            return res.status(404).json({ message: 'Source store not found or unauthorized' });
        }
        if (!toStore) {
            return res.status(404).json({ message: 'Destination store not found or unauthorized' });
        }

        const { from, to } = await CampaignQuotaService.transferPurchasedCredits(fromStoreId as string, toStoreId, parsedAmount);

        res.json({
            message: `Transferred ${parsedAmount} email credits to ${toStore.name}`,
            from: { storeId: fromStoreId, balance: from.balance, purchasedBalance: from.purchasedBalance },
            to: { storeId: toStoreId, balance: to.balance, purchasedBalance: to.purchasedBalance }
        });
    } catch (error: any) {
        console.error('Transfer Email Credits Error:', error);
        res.status(400).json({ message: error.message || 'Server Error' });
    }
};


