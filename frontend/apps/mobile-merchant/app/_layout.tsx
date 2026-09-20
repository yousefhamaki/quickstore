import { DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AppBackground } from '../components/AppBackground';
import { colors } from '../constants/theme';
import { AuthProvider } from '../lib/authContext';
import { NotificationCountProvider } from '../lib/notificationCountContext';
import { StoreProvider } from '../lib/storeContext';

// Keep the native splash (app.json's expo-splash-screen config — a plain
// brand-dark background + centered icon, which is all the native mechanism
// can render) on screen until our own custom animated splash route
// (app/index.tsx) is mounted and ready to take over, so there's no blank
// flash in between. That route calls SplashScreen.hideAsync() once it has
// rendered its first frame.
SplashScreen.preventAutoHideAsync().catch(() => {});

// React Navigation's DefaultTheme paints every Stack/Tabs screen's content
// container with an opaque rgb(242,242,242) background — which otherwise
// sits between AppBackground and every screen's (transparent) content,
// completely hiding the atmosphere. Overriding just `colors.background` to
// transparent here (once, at the root) is what actually makes every nested
// navigator's screens see through to it.
const transparentNavigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {/* Mounted once, behind everything — every screen (existing and new)
            inherits the "layered glass with depth" atmosphere automatically
            instead of painting its own background. */}
        <AppBackground />
        <AuthProvider>
          <StoreProvider>
            <NotificationCountProvider>
              <StatusBar style="light" />
              <ThemeProvider value={transparentNavigationTheme}>
                <Slot />
              </ThemeProvider>
            </NotificationCountProvider>
          </StoreProvider>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgTop,
  },
});
