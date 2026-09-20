import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../lib/authContext';
import { NotificationCountProvider } from '../lib/notificationCountContext';

// Keep the native splash (app.json's expo-splash-screen config — a plain
// brand-dark background + centered icon, which is all the native mechanism
// can render) on screen until our own custom animated splash route
// (app/index.tsx) is mounted and ready to take over, so there's no blank
// flash in between. That route calls SplashScreen.hideAsync() once it has
// rendered its first frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationCountProvider>
          <StatusBar style="dark" />
          <Slot />
        </NotificationCountProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
