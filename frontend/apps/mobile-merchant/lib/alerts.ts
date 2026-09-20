import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert` has no implementation on React Native Web (it silently
 * no-ops — confirmed live: clicking a "Delete" button wired only to
 * `Alert.alert(...)` never fires the destructive callback, and even a
 * plain info alert never shows). Since this app is verified via
 * `expo start --web` in addition to native, every alert/confirm goes
 * through these two helpers instead of calling Alert.alert directly, so
 * the same code path actually works on both.
 */

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAsync(title: string, message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
