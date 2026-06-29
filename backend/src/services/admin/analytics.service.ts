import User from '../../models/User';
import Store from '../../models/Store';
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

    const ledgerAgg = await WalletLedger.aggregate([
        { $match: { type: 'debit', reason: { $in: ['plan_payment', 'addon_purchase', 'order_commission', 'order_fee'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const revenue = ledgerAgg[0]?.total || 0;

    const activeMerchants = await User.find({
        subscriptionStatus: 'active',
        subscriptionPlan: { $ne: null }
    }).populate('subscriptionPlan');

    let mrr = 0;
    for (const merchant of activeMerchants) {
        const plan = merchant.subscriptionPlan as any;
        if (plan && typeof plan.price === 'number') {
            mrr += plan.price;
        }
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
