import Notification, { NotificationType } from '../models/Notification';

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
}
