import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../lib/authContext';
import { colors, layout, radius } from '../../constants/theme';
import { useNotificationCount } from '../../lib/notificationCountContext';
import { useStore } from '../../lib/storeContext';
import { LoadingState } from '../../components/LoadingState';

// Navigation structure (see report for the full rationale): the bottom bar
// stays at the 5 highest-frequency destinations — Home, Orders, Products,
// Notifications, Profile — rather than growing a tab per new feature.
// Store Settings, Coupons and the analytics deep-dive all live one level
// down, reachable from the Profile tab's "Store" hub (app/(tabs)/profile),
// which is the standard "Profile & Settings" pattern for exactly this case.
export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  // Shared across the whole (tabs) group (see lib/notificationCountContext.tsx)
  // — NOT fetched locally here, since this layout stays mounted/"focused"
  // across sibling tab switches and would otherwise never notice a
  // mark-read/mark-all-read action taken inside the Notifications screen.
  const { unreadCount } = useNotificationCount();
  const { initialized: storesInitialized, needsSelection } = useStore();

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Wait for the merchant's store list before deciding whether to render the
  // tabs or send them to the picker — `initialized` only flips once per
  // session (not on every later refresh()), so this never flickers on a
  // pull-to-refresh or a store-settings save elsewhere in the app.
  if (isAuthenticated && !storesInitialized) {
    return <LoadingState label="Loading your store…" />;
  }

  if (isAuthenticated && needsSelection) {
    return <Redirect href="/select-store" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: colors.textInverseFaint,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => (
          <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        // Bottom-tabs v7: a soft cross-fade between tabs instead of an
        // instant hard cut — the "smooth tab-switch transition" ask.
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: layout.tabBarBottomOffset,
    height: layout.tabBarHeight,
    borderRadius: radius.xl,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    elevation: 0,
    paddingHorizontal: 4,
  },
  tabItem: {
    paddingVertical: 8,
  },
});
