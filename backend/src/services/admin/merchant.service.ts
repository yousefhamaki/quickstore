import User from '../../models/User';
import Wallet from '../../models/Wallet';
import Subscription from '../../models/Subscription';
import { logAdminAction } from './audit.service';
import { publishAdminEvent } from '../../queues/adminQueue';

export const getAllMerchants = async (filters: { isVerified?: boolean; subscriptionStatus?: string } = {}) => {
    const query: any = { role: 'merchant' };
    if (filters.isVerified !== undefined) {
        query.isVerified = filters.isVerified;
    }

    const merchants = await User.find(query)
        .populate('stores', 'name slug domain status')
        .sort({ createdAt: -1 });

    const results = await Promise.all(merchants.map(async (m) => {
        const [wallet, sub] = await Promise.all([
            Wallet.findOne({ userId: m._id }).lean(),
            Subscription.findOne({ userId: m._id }).populate('planId').lean()
        ]);

        return {
            ...m.toObject(),
            walletBalance: wallet ? wallet.balance : 0,
            // Live subscription data from the Subscription collection (updated by billing engine)
            subscriptionPlan: sub?.planId ?? null,
            subscriptionStatus: sub?.status ?? 'inactive',
            subscriptionExpiry: sub?.expiresAt ?? null,
            billingCycle: sub?.billingCycle ?? null,
        };
    }));

    // Apply subscriptionStatus filter after join (since it lives on Subscription, not User)
    if (filters.subscriptionStatus) {
        return results.filter(m => m.subscriptionStatus === filters.subscriptionStatus);
    }

    return results;
};

export const toggleMerchantStatus = async (
    merchantId: string,
    isBlocked: boolean,
    actorId: string,
    reason: string,
    ipAddress?: string
) => {
    const merchant = await User.findById(merchantId);
    if (!merchant) {
        throw new Error('Merchant user not found');
    }

    const beforeState = { isBlocked: merchant.isBlocked };
    merchant.isBlocked = isBlocked;
    await merchant.save();

    await logAdminAction(
        actorId,
        isBlocked ? 'merchant.blocked' : 'merchant.unblocked',
        'User',
        merchantId,
        beforeState,
        { isBlocked },
        reason,
        ipAddress
    );

    if (isBlocked) {
        await publishAdminEvent('merchant.blocked', {
            email: merchant.email,
            name: merchant.name,
            reason
        });
    }

    return merchant;
};
