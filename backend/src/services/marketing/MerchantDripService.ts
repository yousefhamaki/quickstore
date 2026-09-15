import User, { IUser } from '../../models/User';
import Store from '../../models/Store';
import Product from '../../models/Product';
import Subscription from '../../models/Subscription';
// Side-effect import: Subscription.findOne().populate('planId') below needs
// 'SubscriptionPlan' registered with Mongoose. This service (like
// SubscriptionRenewalService) is also invoked from a standalone script that
// may not have loaded it yet via normal server boot order.
import '../../models/SubscriptionPlan';
import MarketingEmailLog, { MarketingDripStep } from '../../models/MarketingEmailLog';
import {
    sendMerchantDripCreateStoreEmail,
    sendMerchantDripAddFirstProductEmail,
    sendMerchantDripPublishStoreEmail,
    sendMerchantDripUpgradePlanEmail,
} from '../emailService';

/**
 * Automated onboarding/activation drip for registered merchants who haven't
 * (yet) become active, paying customers — NOT the storefront-facing
 * Campaign/CampaignRecipient broadcast tool (models/Campaign.ts), which is a
 * merchant-to-shopper feature and stays untouched here.
 *
 * Every step is gated on real product/store state (not just elapsed time)
 * so a merchant who already did the thing never gets nagged about it:
 *
 *   1. create_store        — registered >=24h, still has zero stores.
 *   2. add_first_product   — has a store, registered >=3 days, that store
 *                             (or all of them) still has zero products.
 *   3. publish_store       — has added >=1 product, registered >=5 days,
 *                             but the store is still `status: 'draft'`.
 *   4. upgrade_plan        — a store has been `status: 'live'` for >=7 days
 *                             and the merchant has no active paid
 *                             subscription (no Subscription, or its plan is
 *                             `type: 'free'`).
 *
 * Each step fires at most once per user ever, enforced by MarketingEmailLog's
 * unique (userId, step) index plus the claim-before-send pattern below,
 * which makes overlapping/duplicate sweep runs safe.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const ELIGIBLE_USER_FILTER = {
    role: 'merchant',
    isVerified: true,
    isBlocked: false,
    marketingOptOut: { $ne: true },
};

export interface DripSweepSummary {
    sent: Record<MarketingDripStep, number>;
    skipped: Record<MarketingDripStep, number>;
    failed: number;
}

const emptySummary = (): DripSweepSummary => ({
    sent: { create_store: 0, add_first_product: 0, publish_store: 0, upgrade_plan: 0 },
    skipped: { create_store: 0, add_first_product: 0, publish_store: 0, upgrade_plan: 0 },
    failed: 0,
});

/**
 * Atomically claims a (userId, step) pair before sending, so two overlapping
 * sweep runs can never both send the same step to the same user. Returns
 * true if this call is the one that gets to send (i.e. no prior log
 * existed); false if it was already sent (or already claimed by a
 * concurrent run).
 */
const claimDripStep = async (userId: any, step: MarketingDripStep): Promise<boolean> => {
    const previous = await MarketingEmailLog.findOneAndUpdate(
        { userId, step },
        { $setOnInsert: { userId, step, sentAt: new Date() } },
        { upsert: true, new: false }
    );
    return previous === null;
};

/** Releases a claim after a failed send, so the next sweep retries it. */
const releaseDripStep = async (userId: any, step: MarketingDripStep) => {
    await MarketingEmailLog.deleteOne({ userId, step }).catch(() => {});
};

const sendStep = async (
    user: Pick<IUser, '_id' | 'email' | 'name'>,
    step: MarketingDripStep,
    summary: DripSweepSummary,
    send: () => Promise<unknown>
) => {
    const claimed = await claimDripStep(user._id, step);
    if (!claimed) {
        summary.skipped[step]++;
        return;
    }
    try {
        await send();
        summary.sent[step]++;
    } catch (err) {
        console.error(`[MerchantDripService] Failed sending "${step}" to ${user.email}:`, err);
        await releaseDripStep(user._id, step);
        summary.failed++;
    }
};

const alreadySent = async (userId: any, step: MarketingDripStep): Promise<boolean> => {
    const existing = await MarketingEmailLog.exists({ userId, step });
    return !!existing;
};

/** Step 1: create_store */
const runCreateStoreStep = async (summary: DripSweepSummary) => {
    const cutoff = new Date(Date.now() - DAY_MS);
    const candidates = await User.find({
        ...ELIGIBLE_USER_FILTER,
        createdAt: { $lte: cutoff },
        $or: [{ stores: { $exists: false } }, { stores: { $size: 0 } }],
    }).select('_id name email');

    for (const user of candidates) {
        if (await alreadySent(user._id, 'create_store')) continue;
        await sendStep(user, 'create_store', summary, () =>
            sendMerchantDripCreateStoreEmail(user.email, user.name, (user._id as any).toString())
        );
    }
};

/** Step 2: add_first_product */
const runAddFirstProductStep = async (summary: DripSweepSummary) => {
    const cutoff = new Date(Date.now() - 3 * DAY_MS);
    const candidates = await User.find({
        ...ELIGIBLE_USER_FILTER,
        createdAt: { $lte: cutoff },
        stores: { $exists: true, $not: { $size: 0 } },
    }).select('_id name email stores');

    for (const user of candidates) {
        if (await alreadySent(user._id, 'add_first_product')) continue;
        const productCount = await Product.countDocuments({ storeId: { $in: user.stores } });
        if (productCount > 0) continue;
        await sendStep(user, 'add_first_product', summary, () =>
            sendMerchantDripAddFirstProductEmail(user.email, user.name, (user._id as any).toString())
        );
    }
};

/** Step 3: publish_store */
const runPublishStoreStep = async (summary: DripSweepSummary) => {
    const cutoff = new Date(Date.now() - 5 * DAY_MS);
    const draftStores = await Store.find({ status: 'draft', createdAt: { $lte: cutoff } }).select('_id ownerId name');

    for (const store of draftStores) {
        const productCount = await Product.countDocuments({ storeId: store._id });
        if (productCount === 0) continue;

        const user = await User.findOne({ _id: store.ownerId, ...ELIGIBLE_USER_FILTER }).select('_id name email');
        if (!user) continue;
        if (await alreadySent(user._id, 'publish_store')) continue;

        await sendStep(user, 'publish_store', summary, () =>
            sendMerchantDripPublishStoreEmail(user.email, user.name, store.name, (user._id as any).toString())
        );
    }
};

/** Step 4: upgrade_plan */
const runUpgradePlanStep = async (summary: DripSweepSummary) => {
    const cutoff = new Date(Date.now() - 7 * DAY_MS);
    const liveStores = await Store.find({ status: 'live', publishedAt: { $lte: cutoff } }).select('_id ownerId name');

    for (const store of liveStores) {
        const user = await User.findOne({ _id: store.ownerId, ...ELIGIBLE_USER_FILTER }).select('_id name email');
        if (!user) continue;
        if (await alreadySent(user._id, 'upgrade_plan')) continue;

        const activeSub = await Subscription.findOne({ userId: user._id, status: 'active' }).populate('planId');
        const planType = (activeSub?.planId as any)?.type;
        if (planType === 'paid') continue; // already upgraded — nothing to nudge

        await sendStep(user, 'upgrade_plan', summary, () =>
            sendMerchantDripUpgradePlanEmail(user.email, user.name, store.name, (user._id as any).toString())
        );
    }
};

export const runMerchantDripSweep = async (): Promise<DripSweepSummary> => {
    const summary = emptySummary();

    await runCreateStoreStep(summary);
    await runAddFirstProductStep(summary);
    await runPublishStoreStep(summary);
    await runUpgradePlanStep(summary);

    console.log('[MerchantDripService] Sweep complete:', summary);
    return summary;
};
