import mongoose from 'mongoose';
import Subscription, { ISubscription } from '../../models/Subscription';
import Wallet from '../../models/Wallet';
import WalletLedger from '../../models/WalletLedger';
import Receipt from '../../models/Receipt';
import User from '../../models/User';
// Side-effect import: `Subscription.find().populate('planId')` below needs the
// 'SubscriptionPlan' model registered with Mongoose. In the main server this
// happens implicitly (billingController.ts etc. import it), but this service
// is also invoked from standalone scripts/workers that may not — so import it
// directly here rather than depend on load order elsewhere.
import '../../models/SubscriptionPlan';
import { redisClient, acquireLock } from '../../config/redis';
import { sendInvoiceEmail } from '../emailService';
import { createNotification } from '../notificationService';
import { WALLET_LEDGER_REASONS } from '../../constants/walletLedgerReasons';
import { addBillingCycle, addBillingCycleUntilFuture } from '../../utils/billingCycle';

/**
 * Automatic subscription renewal/expiry sweep.
 *
 * Before this existed, `Subscription.status` was only ever changed by a
 * user-initiated request (subscribe/upgrade/downgrade) — nothing in the
 * codebase ever looked at `expiresAt` and reacted to it, so a subscription
 * that ran out (paid or not) simply stayed `active` forever. This is the
 * missing piece: it's meant to be run on a recurring schedule (see
 * queues/billingQueue.ts) and drives the exact state machine every access
 * check in `billingMiddleware.ts` already assumes exists:
 *
 *   active --(expiresAt reached, wallet has funds)--> active (renewed, expiresAt advances)
 *   active --(expiresAt reached, insufficient funds)--> past_due (gracePeriodEnd set)
 *   past_due --(wallet topped up before gracePeriodEnd)--> active (renewed, expiresAt = now + cycle)
 *   past_due --(gracePeriodEnd passes, still insufficient funds)--> expired
 *
 * Free-plan subscriptions are never charged — they're just rolled forward
 * so they never get caught by the same expiry check (matches how free
 * subscriptions are already created elsewhere with a far-future expiresAt).
 */

const GRACE_PERIOD_DAYS = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS || '3', 10);

export interface RenewalSweepSummary {
    checkedDueActive: number;
    checkedPastDue: number;
    renewed: number;
    movedToPastDue: number;
    movedToExpired: number;
    stillPastDue: number;
    skippedLocked: number;
    failed: number;
}

const computeCyclePrice = (plan: any, billingCycle: 'monthly' | 'yearly' | undefined): number => {
    let price = plan.monthlyPrice || plan.price || 0;
    if (billingCycle === 'yearly') {
        price = price * 12 * 0.8; // Same 20% yearly discount used everywhere else in billing
    }
    return price;
};

// Standalone MongoDB (common in local dev) does not support multi-document
// transactions at all — this mirrors the exact guard already used in
// webhookController.ts's Paymob webhook handler.
const isLocalStandaloneMongo = (): boolean => {
    const uri = process.env.MONGODB_URI || '';
    return uri.includes('localhost') && !uri.includes('replicaSet');
};

/**
 * Runs `fn` inside a real Mongo transaction when the connected deployment
 * supports one, otherwise runs it without a session (best-effort, matching
 * how the rest of the codebase degrades on standalone local MongoDB).
 */
const withOptionalTransaction = async <T>(fn: (session?: mongoose.ClientSession) => Promise<T>): Promise<T> => {
    if (isLocalStandaloneMongo()) {
        return fn(undefined);
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const result = await fn(session);
        await session.commitTransaction();
        return result;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
};

/**
 * Attempts to charge the wallet for one billing cycle and, on success,
 * writes the ledger entry + receipt and returns the new wallet balance.
 * Returns `null` if the wallet balance is insufficient (no side effects).
 */
const tryChargeCycle = async (
    sub: ISubscription,
    price: number,
    session: mongoose.ClientSession | undefined
): Promise<number | null> => {
    const opts = session ? { session } : {};

    const wallet = await Wallet.findOne({ userId: sub.userId }).session(session ?? null);
    if (!wallet || wallet.balance < price) {
        return null;
    }

    wallet.balance -= price;
    await wallet.save(opts);

    await WalletLedger.create([{
        userId: sub.userId,
        type: 'debit',
        amount: price,
        reason: WALLET_LEDGER_REASONS.PLAN_RENEWAL,
        referenceId: sub._id,
        balanceAfter: wallet.balance
    }], opts);

    await Receipt.create([{
        userId: sub.userId,
        referenceId: sub._id,
        type: 'wallet_recharge',
        amount: price,
        currency: 'EGP'
    }], opts);

    return wallet.balance;
};

const sendRenewalEmail = (userId: mongoose.Types.ObjectId, planName: string, price: number, billingCycle: 'monthly' | 'yearly' | undefined) => {
    // Best-effort, never blocks the sweep.
    User.findById(userId).then((user) => {
        if (!user?.email) return;
        return sendInvoiceEmail(user.email, 'Buildora SaaS', {
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            buyerName: user.name || 'Merchant',
            amount: price,
            currency: 'EGP',
            date: new Date().toISOString(),
            paymentMethod: 'Buildora Wallet (auto-renewal)',
            items: [{
                name: `${planName} Subscription Renewal - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
                quantity: 1,
                price
            }]
        });
    }).catch((err) => {
        console.error('[SubscriptionRenewalService] Failed to send renewal invoice email:', err);
    });
};

/**
 * Handles a subscription whose `expiresAt` has just been reached while it
 * was still `active`.
 */
const processDueActiveSubscription = async (sub: ISubscription, now: Date, summary: RenewalSweepSummary) => {
    const plan = sub.planId as any;
    if (!plan) {
        console.warn(`[SubscriptionRenewalService] Subscription ${sub._id} has no populated plan, skipping.`);
        summary.failed++;
        return;
    }

    // Free plans are never charged — just roll the expiry forward so this
    // subscription doesn't keep tripping the "due" query every sweep.
    // addBillingCycleUntilFuture (not a single addBillingCycle) matters here
    // too: if this ran late, one cycle might not be enough to clear "now".
    if (plan.type === 'free') {
        await Subscription.updateOne(
            { _id: sub._id, status: 'active' },
            { $set: { expiresAt: addBillingCycleUntilFuture(sub.expiresAt, sub.billingCycle, now) } }
        );
        summary.renewed++;
        return;
    }

    const price = computeCyclePrice(plan, sub.billingCycle);

    try {
        await withOptionalTransaction(async (session) => {
            const newBalance = await tryChargeCycle(sub, price, session);
            const opts = session ? { session } : {};

            if (newBalance !== null) {
                // NOTE: this MUST guarantee a future date, not just "one
                // cycle later" — a subscription overdue by more than one
                // full cycle (e.g. the sweep didn't run for a while) would
                // otherwise still look "due" immediately after being
                // charged, letting the very next sweep tick charge it AGAIN
                // for the same catch-up. (This is exactly what happened
                // once during development: two sweep runs a couple of
                // minutes apart both found the same subscription due and
                // both charged it, because a single +1 cycle from a
                // long-stale expiresAt was still in the past.)
                const newExpiresAt = addBillingCycleUntilFuture(sub.expiresAt, sub.billingCycle, now);
                await Subscription.updateOne(
                    { _id: sub._id },
                    { $set: { expiresAt: newExpiresAt, gracePeriodEnd: undefined } },
                    opts
                );
                summary.renewed++;
                sendRenewalEmail(sub.userId, plan.name, price, sub.billingCycle);
                createNotification({
                    userId: sub.userId.toString(),
                    type: 'subscription_renewed',
                    title: 'Subscription renewed',
                    message: `Your ${plan.name} plan was renewed for ${price.toLocaleString()} EGP.`,
                    link: '/merchant/billing',
                }).catch(() => {});
            } else {
                const gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
                await Subscription.updateOne(
                    { _id: sub._id },
                    { $set: { status: 'past_due', gracePeriodEnd } },
                    opts
                );
                summary.movedToPastDue++;
                console.log(`[SubscriptionRenewalService] Subscription ${sub._id} moved to past_due (insufficient wallet balance). Grace period until ${gracePeriodEnd.toISOString()}.`);
                createNotification({
                    userId: sub.userId.toString(),
                    type: 'subscription_past_due',
                    title: 'Subscription payment failed',
                    message: `We couldn't renew your ${plan.name} plan due to insufficient wallet balance. Top up before ${gracePeriodEnd.toLocaleDateString()} to avoid losing access.`,
                    link: '/merchant/billing',
                }).catch(() => {});
            }
        });
    } catch (err) {
        console.error(`[SubscriptionRenewalService] Failed processing due subscription ${sub._id}:`, err);
        summary.failed++;
    }
};

/**
 * Retries a subscription that is already `past_due`: either the wallet now
 * has funds (recover to active) or the grace period has run out (expire).
 */
const processPastDueSubscription = async (sub: ISubscription, now: Date, summary: RenewalSweepSummary) => {
    const plan = sub.planId as any;
    if (!plan) {
        console.warn(`[SubscriptionRenewalService] Subscription ${sub._id} has no populated plan, skipping.`);
        summary.failed++;
        return;
    }

    const price = computeCyclePrice(plan, sub.billingCycle);

    try {
        const recovered = await withOptionalTransaction(async (session) => {
            const newBalance = await tryChargeCycle(sub, price, session);
            if (newBalance === null) return false;

            const opts = session ? { session } : {};
            // Recovered — anchor the new cycle on `now` rather than the
            // long-passed original expiresAt, since that cycle was already missed.
            const newExpiresAt = addBillingCycle(now, sub.billingCycle);
            await Subscription.updateOne(
                { _id: sub._id },
                { $set: { status: 'active', expiresAt: newExpiresAt, gracePeriodEnd: undefined } },
                opts
            );
            return true;
        });

        if (recovered) {
            summary.renewed++;
            sendRenewalEmail(sub.userId, plan.name, price, sub.billingCycle);
            createNotification({
                userId: sub.userId.toString(),
                type: 'subscription_renewed',
                title: 'Subscription renewed',
                message: `Your ${plan.name} plan was renewed for ${price.toLocaleString()} EGP.`,
                link: '/merchant/billing',
            }).catch(() => {});
            return;
        }

        if (sub.gracePeriodEnd && now > sub.gracePeriodEnd) {
            await Subscription.updateOne({ _id: sub._id }, { $set: { status: 'expired' } });
            summary.movedToExpired++;
            console.log(`[SubscriptionRenewalService] Subscription ${sub._id} expired (grace period elapsed with insufficient balance).`);
            createNotification({
                userId: sub.userId.toString(),
                type: 'subscription_expired',
                title: 'Subscription expired',
                message: `Your ${plan.name} plan has expired due to an unpaid renewal. Top up your wallet and resubscribe to restore access.`,
                link: '/merchant/plans',
            }).catch(() => {});
        } else {
            summary.stillPastDue++;
        }
    } catch (err) {
        console.error(`[SubscriptionRenewalService] Failed processing past_due subscription ${sub._id}:`, err);
        summary.failed++;
    }
};

export const runSubscriptionRenewalSweep = async (): Promise<RenewalSweepSummary> => {
    const now = new Date();
    const summary: RenewalSweepSummary = {
        checkedDueActive: 0,
        checkedPastDue: 0,
        renewed: 0,
        movedToPastDue: 0,
        movedToExpired: 0,
        stillPastDue: 0,
        skippedLocked: 0,
        failed: 0
    };

    const dueActiveSubs = await Subscription.find({ status: 'active', expiresAt: { $lte: now } }).populate('planId');
    summary.checkedDueActive = dueActiveSubs.length;

    for (const sub of dueActiveSubs) {
        const lockKey = `lock:subscription:${sub.userId}`;
        // acquireLock fails CLOSED if Redis can't confirm the lock — unlike
        // the general-purpose cached redisClient.set, which fails open
        // (reports success) under Redis degradation and would otherwise
        // let this sweep race a concurrent user-initiated plan change.
        const acquired = await acquireLock(lockKey, 30);
        if (!acquired) {
            // A user-initiated plan change is in flight for this user right
            // now — skip and pick it up on the next sweep rather than race it.
            summary.skippedLocked++;
            continue;
        }
        try {
            await processDueActiveSubscription(sub, now, summary);
        } finally {
            await redisClient.del(lockKey);
        }
    }

    const pastDueSubs = await Subscription.find({ status: 'past_due' }).populate('planId');
    summary.checkedPastDue = pastDueSubs.length;

    for (const sub of pastDueSubs) {
        const lockKey = `lock:subscription:${sub.userId}`;
        const acquired = await acquireLock(lockKey, 30);
        if (!acquired) {
            summary.skippedLocked++;
            continue;
        }
        try {
            await processPastDueSubscription(sub, now, summary);
        } finally {
            await redisClient.del(lockKey);
        }
    }

    console.log('[SubscriptionRenewalService] Sweep complete:', summary);
    return summary;
};
