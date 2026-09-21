import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerDevice, unregisterDevice } from './services/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let cachedExpoPushToken: string | null = null;

/**
 * Requests notification permission and registers this device's Expo push
 * token with the backend. Called right after a successful login (including
 * post-2FA) — see lib/authContext.tsx. Native permission prompts and actual
 * push delivery can only be verified on a real device/simulator, not via
 * `expo start --web` (the web platform has no push token concept at all),
 * so this silently no-ops there.
 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    if (Platform.OS === 'web') return; // no push tokens on web
    if (!Device.isDevice) return; // simulators/emulators without push capability

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    cachedExpoPushToken = tokenResponse.data;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await registerDevice(cachedExpoPushToken, platform);
  } catch (err) {
    // Push registration must never block login — log and move on.
    console.warn('[push] Failed to register for push notifications:', err);
  }
}

/**
 * Unregisters this device before logging out, so a signed-out device stops
 * receiving pushes meant for the account it's leaving.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    if (cachedExpoPushToken) {
      await unregisterDevice(cachedExpoPushToken);
      cachedExpoPushToken = null;
    }
  } catch (err) {
    console.warn('[push] Failed to unregister push token:', err);
  }
}
