import Store from '../../models/Store';
import User from '../../models/User';
import SubscriptionPlan from '../../models/SubscriptionPlan';
import { logAdminAction } from './audit.service';
import { publishAdminEvent } from '../../queues/adminQueue';

export const getAllStores = async (filters: { status?: string } = {}) => {
    const query: any = {};
    if (filters.status) {
        query.status = filters.status;
    }
    return Store.find(query)
        .populate('ownerId', 'name email role')
        .sort({ createdAt: -1 });
};

export const overrideSubscription = async (
    storeId: string,
    planId: string,
    durationDays: number,
    actorId: string,
    reason: string,
    ipAddress?: string
) => {
    const store = await Store.findById(storeId);
    if (!store) {
        throw new Error('Store not found');
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
        throw new Error('Subscription plan not found');
    }

    const beforeState = {
        subscriptionPlan: (store as any).subscriptionPlan,
        expiryDate: (store as any).expiryDate
    };

    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + durationDays);

    const storeUpdate: any = {
        subscriptionStatus: 'active',
        subscriptionPlan: plan._id,
        expiryDate: newExpiry
    };
    const updatedStore = await Store.findByIdAndUpdate(storeId, storeUpdate, { new: true });

    const beforeUser = await User.findById(store.ownerId);
    if (beforeUser) {
        await User.findByIdAndUpdate(store.ownerId, {
            subscriptionStatus: 'active',
            subscriptionPlan: plan._id,
            subscriptionExpiry: newExpiry
        });
    }

    await logAdminAction(
        actorId,
        'store.subscription',
        'Store',
        storeId,
        beforeState,
        { subscriptionPlan: plan._id, expiryDate: newExpiry },
        reason,
        ipAddress
    );

    return updatedStore;
};

export const toggleStoreStatus = async (
    storeId: string,
    status: 'draft' | 'live' | 'paused',
    actorId: string,
    reason: string,
    ipAddress?: string
) => {
    const store = await Store.findById(storeId);
    if (!store) {
        throw new Error('Store not found');
    }

    const beforeState = { status: store.status };
    store.status = status;
    await store.save();

    await logAdminAction(
        actorId,
        'store.status',
        'Store',
        storeId,
        beforeState,
        { status },
        reason,
        ipAddress
    );

    if (status === 'paused') {
        await publishAdminEvent('store.suspended', {
            storeId,
            reason
        });
    }

    return store;
};
