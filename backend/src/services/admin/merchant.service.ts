import User from '../../models/User';
import Wallet from '../../models/Wallet';
import { logAdminAction } from './audit.service';
import { publishAdminEvent } from '../../queues/adminQueue';

export const getAllMerchants = async (filters: { isVerified?: boolean; subscriptionStatus?: string } = {}) => {
    const query: any = { role: 'merchant' };
    if (filters.isVerified !== undefined) {
        query.isVerified = filters.isVerified;
    }
    if (filters.subscriptionStatus) {
        query.subscriptionStatus = filters.subscriptionStatus;
    }

    const merchants = await User.find(query)
        .populate('subscriptionPlan')
        .populate('stores', 'name slug domain status')
        .sort({ createdAt: -1 });

    const merchantListWithWallets = await Promise.all(merchants.map(async (m) => {
        const wallet = await Wallet.findOne({ userId: m._id });
        return {
            ...m.toObject(),
            walletBalance: wallet ? wallet.balance : 0
        };
    }));

    return merchantListWithWallets;
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
