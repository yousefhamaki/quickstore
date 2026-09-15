import PlatformConfig, { PLATFORM_CONFIG_SINGLETON_ID } from '../../models/PlatformConfig';
import { logAdminAction } from './audit.service';
import { invalidateSignupGiftCache } from '../platformConfigService';

/**
 * Admin read/write side of the signup-gift PlatformConfig — mirrors
 * services/admin/plan.service.ts's pattern: mutate the doc, audit-log
 * before/after via logAdminAction, then invalidate the read-side cache.
 */

export const getSignupGiftSettings = async () => {
    const doc = await PlatformConfig.findById(PLATFORM_CONFIG_SINGLETON_ID);
    if (!doc) {
        // No admin has ever touched this — report the schema defaults
        // without materializing a document (that happens on first write).
        return { enabled: true, amount: 500, updatedBy: null, updatedAt: null };
    }
    return {
        enabled: doc.signupGift.enabled,
        amount: doc.signupGift.amount,
        updatedBy: doc.updatedBy || null,
        updatedAt: doc.updatedAt,
    };
};

export const updateSignupGiftSettings = async (
    data: { enabled?: boolean; amount?: number },
    actorId: string,
    reason: string,
    ipAddress?: string
) => {
    if (data.amount !== undefined && (typeof data.amount !== 'number' || !Number.isFinite(data.amount) || data.amount < 0)) {
        throw new Error('amount must be a non-negative number');
    }
    if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
        throw new Error('enabled must be a boolean');
    }

    let doc = await PlatformConfig.findById(PLATFORM_CONFIG_SINGLETON_ID);
    const beforeState = doc
        ? { signupGift: { enabled: doc.signupGift.enabled, amount: doc.signupGift.amount } }
        : { signupGift: { enabled: true, amount: 500 } };

    if (!doc) {
        doc = new PlatformConfig({ _id: PLATFORM_CONFIG_SINGLETON_ID });
    }

    if (data.enabled !== undefined) {
        doc.signupGift.enabled = data.enabled;
    }
    if (data.amount !== undefined) {
        doc.signupGift.amount = data.amount;
    }
    doc.updatedBy = actorId as any;

    await doc.save();

    await invalidateSignupGiftCache();

    await logAdminAction(
        actorId,
        'settings.signup_gift.update',
        'PlatformConfig',
        PLATFORM_CONFIG_SINGLETON_ID,
        beforeState,
        { signupGift: doc.signupGift },
        reason,
        ipAddress
    );

    return {
        enabled: doc.signupGift.enabled,
        amount: doc.signupGift.amount,
        updatedBy: doc.updatedBy,
        updatedAt: doc.updatedAt,
    };
};
