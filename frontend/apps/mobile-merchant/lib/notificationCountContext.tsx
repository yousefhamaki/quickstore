import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getUnreadNotificationCount } from './services/notifications';
import { useAuth } from './authContext';

interface NotificationCountContextValue {
  unreadCount: number;
  refresh: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

const NotificationCountContext = createContext<NotificationCountContextValue | undefined>(undefined);

/**
 * Single source of truth for the unread-notification badge shown on the
 * Notifications tab icon (see app/(tabs)/_layout.tsx). Deliberately hoisted
 * above the tab navigator rather than fetched locally inside the tab bar —
 * expo-router's Tabs layout stays mounted (and "focused") across sibling
 * tab switches, so a `useFocusEffect` in the layout itself only ever fires
 * once per app session and goes stale the moment a notification is marked
 * read from inside the Notifications screen. Both places now share this
 * context instead: the Notifications screen updates it optimistically on
 * mark-read/mark-all-read, and it re-fetches whenever a screen that cares
 * (Home, Notifications) comes into focus.
 */
export function NotificationCountProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Leave the last known count on a transient failure.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else setUnreadCount(0);
  }, [isAuthenticated, refresh]);

  const value = useMemo(() => ({ unreadCount, refresh, setUnreadCount }), [unreadCount, refresh]);

  return <NotificationCountContext.Provider value={value}>{children}</NotificationCountContext.Provider>;
}

export function useNotificationCount(): NotificationCountContextValue {
  const ctx = useContext(NotificationCountContext);
  if (!ctx) throw new Error('useNotificationCount must be used within NotificationCountProvider');
  return ctx;
}
