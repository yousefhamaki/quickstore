import Notification, { NotificationType } from '../models/Notification';
import { sendPushToUser } from './pushService';

interface CreateNotificationInput {
    userId: string;
    storeId?: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
}

/**
 * Fire-and-forget by convention at every call site (never awaited into the
 * critical path of the request it's called from) — a notification failing
 * to write must never fail the order/review/refund-request/etc. it's
 * describing. Errors are caught and logged here so callers don't need a
 * .catch() at every call site.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
    try {
        await Notification.create({
            userId: input.userId,
            storeId: input.storeId,
            type: input.type,
            title: input.title,
            message: input.message,
            link: input.link,
        });
    } catch (error) {
        console.error('[NotificationService] Failed to create notification:', error);
    }

    // Fire-and-forget push send — this is the single chokepoint every
    // notification type funnels through, so hooking the push dispatcher in
    // here (rather than at each of the ~9 call sites) covers all of them.
    // Never awaited into the caller's flow, and sendPushToUser itself never
    // throws — but .catch() defensively anyway in case that contract ever
    // slips, since a push failure must never surface as an error here.
    sendPushToUser(input.userId, input.title, input.message, { link: input.link }).catch((err) => {
        console.error('[NotificationService] Push dispatch failed:', err);
    });
}
