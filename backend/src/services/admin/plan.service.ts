import SubscriptionPlan from '../../models/SubscriptionPlan';
import { logAdminAction } from './audit.service';
import { publishAdminEvent } from '../../queues/adminQueue';

export const getAllPlans = async (includeInactive = true) => {
    const query = includeInactive ? {} : { isActive: true };
    return SubscriptionPlan.find(query).sort({ price: 1 });
};

export const createPlan = async (
    data: any,
    actorId: string,
    ipAddress?: string
) => {
    const plan = await SubscriptionPlan.create(data);

    await logAdminAction(
        actorId,
        'plan.create',
        'SubscriptionPlan',
        plan._id.toString(),
        {},
        plan.toObject(),
        'Created new subscription plan',
        ipAddress
    );

    await publishAdminEvent('plan.changed', { planId: plan._id });

    return plan;
};

export const updatePlan = async (
    planId: string,
    data: any,
    actorId: string,
    reason: string,
    ipAddress?: string
) => {
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
        throw new Error('Subscription plan not found');
    }

    const beforeState = plan.toObject();

    Object.assign(plan, data);
    await plan.save();

    await logAdminAction(
        actorId,
        'plan.update',
        'SubscriptionPlan',
        planId,
        beforeState,
        plan.toObject(),
        reason,
        ipAddress
    );

    await publishAdminEvent('plan.changed', { planId });

    return plan;
};

export const deletePlan = async (
    planId: string,
    actorId: string,
    reason: string,
    ipAddress?: string
) => {
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
        throw new Error('Subscription plan not found');
    }

    const beforeState = { isActive: plan.isActive };
    plan.isActive = false;
    await plan.save();

    await logAdminAction(
        actorId,
        'plan.delete',
        'SubscriptionPlan',
        planId,
        beforeState,
        { isActive: false },
        reason,
        ipAddress
    );

    await publishAdminEvent('plan.changed', { planId });

    return plan;
};
