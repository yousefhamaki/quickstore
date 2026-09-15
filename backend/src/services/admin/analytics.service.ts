import User from '../../models/User';
import Store from '../../models/Store';
import Subscription from '../../models/Subscription';
import WalletLedger from '../../models/WalletLedger';
import AdminAnalyticsSnapshot from '../../models/AdminAnalyticsSnapshot';

export const getLatestSnapshot = async (period: 'hourly' | 'daily' | 'monthly' = 'daily') => {
    const snapshot = await AdminAnalyticsSnapshot.findOne({ period }).sort({ date: -1 });
    if (snapshot) {
        // Regenerate the snapshot if it is older than 5 minutes to show fresh data in dev/staging
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (snapshot.date && new Date(snapshot.date) >= fiveMinutesAgo) {
            return snapshot;
        }
    }
    return generateSnapshot(period);
};

export const generateSnapshot = async (period: 'hourly' | 'daily' | 'monthly' = 'daily') => {
    const now = new Date();

    const merchants = await User.countDocuments({ role: 'merchant' });
    const stores = await Store.countDocuments({});

    let rangeStart = new Date();
    if (period === 'hourly') {
        rangeStart.setHours(rangeStart.getHours() - 1);
    } else if (period === 'daily') {
        rangeStart.setHours(0, 0, 0, 0);
    } else {
        rangeStart.setDate(1);
        rangeStart.setHours(0, 0, 0, 0);
    }
    const registrations = await Store.countDocuments({ createdAt: { $gte: rangeStart } });

    // NOTE: 'plan_upgrade' and 'plan_renewal' were previously missing here,
    // which meant every prorated plan-upgrade payment and every automatic
    // renewal charge was silently excluded from the revenue total shown on
    // the admin analytics snapshot.
    const ledgerAgg = await WalletLedger.aggregate([
        { $match: { type: 'debit', reason: { $in: ['plan_payment', 'plan_upgrade', 'plan_renewal', 'addon_purchase', 'order_commission', 'order_fee'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const revenue = ledgerAgg[0]?.total || 0;

    // MRR is sourced live from the Subscription collection, not the
    // denormalized User.subscriptionStatus/subscriptionPlan fields — those
    // are never updated by the wallet-based subscribe/upgrade/renew flows
    // (see billingController.ts / SubscriptionRenewalService.ts), so they
    // drift out of sync with reality and previously made this MRR figure
    // silently stale (merchant.service.ts's getAllMerchants was already
    // fixed to do the same live join for the same reason).
    const activeSubscriptions = await Subscription.find({ status: 'active' }).populate('planId').lean();

    let mrr = 0;
    for (const sub of activeSubscriptions) {
        const plan = sub.planId as any;
        if (!plan || plan.type === 'free') continue;
        const price = plan.monthlyPrice || plan.price;
        if (typeof price !== 'number') continue;

        // Normalize to a monthly-equivalent contribution so yearly
        // subscribers (billed once, at a 20% discount) don't inflate MRR by
        // their full annual charge.
        mrr += sub.billingCycle === 'yearly' ? (price * 12 * 0.8) / 12 : price;
    }

    const snapshot = await AdminAnalyticsSnapshot.create({
        date: now,
        period,
        mrr,
        revenue,
        merchants,
        stores,
        registrations
    });

    return snapshot;
};
