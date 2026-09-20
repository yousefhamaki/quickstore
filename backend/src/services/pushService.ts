import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import DeviceToken from '../models/DeviceToken';

const expo = new Expo();

/**
 * Sends a push notification to every device registered for this user, via
 * Expo's push service (the mobile-merchant Expo app registers its device
 * token through POST /api/notifications/register-device).
 *
 * MUST NEVER THROW — called fire-and-forget from
 * notificationService.createNotification(), which is itself never awaited
 * into any business-flow critical path (order creation, refunds, etc). An
 * invalid/expired push token, an unreachable Expo API, or simply no
 * registered devices are all expected, routine outcomes here, not errors
 * that should propagate.
 */
export async function sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<void> {
    try {
        const devices = await DeviceToken.find({ userId }).lean();
        if (!devices.length) return;

        const messages: ExpoPushMessage[] = [];
        for (const device of devices) {
            if (!Expo.isExpoPushToken(device.expoPushToken)) {
                // Not a real Expo push token (e.g. a placeholder/fake token
                // used in dev/testing) — skip it silently rather than
                // letting expo-server-sdk throw for the whole batch.
                continue;
            }
            messages.push({
                to: device.expoPushToken,
                sound: 'default',
                title,
                body,
                data: data || {},
            });
        }
        if (!messages.length) return;

        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                // Delivery-receipt tickets are intentionally not tracked
                // further here (no follow-up "was it actually delivered"
                // pass) — this slice only needs the send call itself to
                // never break the caller, which try/catch per-chunk covers.
                await expo.sendPushNotificationsAsync(chunk);
            } catch (err) {
                console.error('[PushService] Failed to send a push notification chunk:', err);
            }
        }
    } catch (error) {
        console.error('[PushService] sendPushToUser failed:', error);
    }
}
