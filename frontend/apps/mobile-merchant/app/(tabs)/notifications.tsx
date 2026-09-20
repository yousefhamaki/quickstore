import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GradientHeader } from '../../components/GradientHeader';
import { Card } from '../../components/Card';
import { PressableScale } from '../../components/PressableScale';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import { colors, layout, motion, radius, spacing, typography } from '../../constants/theme';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../lib/services/notifications';
import { NotificationEntry } from '../../lib/types';
import { useNotificationCount } from '../../lib/notificationCountContext';

export default function NotificationsScreen() {
  const { refresh: refreshUnreadCount } = useNotificationCount();
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getNotifications();
      setEntries(data.entries);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshUnreadCount();
    }, [load, refreshUnreadCount])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePress = async (entry: NotificationEntry) => {
    if (!entry.isRead) {
      setEntries((prev) => prev.map((e) => (e._id === entry._id ? { ...e, isRead: true } : e)));
      try {
        await markNotificationRead(entry._id);
        refreshUnreadCount();
      } catch {
        // Non-critical — a re-fetch would recover the correct state.
      }
    }
  };

  const handleMarkAllRead = async () => {
    setEntries((prev) => prev.map((e) => ({ ...e, isRead: true })));
    try {
      await markAllNotificationsRead();
      refreshUnreadCount();
    } catch {
      load();
    }
  };

  return (
    <View style={styles.screen}>
      <GradientHeader title="Notifications" />
      <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllRow}>
        <Text style={styles.markAllText}>Mark all as read</Text>
      </TouchableOpacity>

      {loading ? (
        <LoadingState label="Loading notifications…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
          ListEmptyComponent={
            <EmptyState icon="notifications-outline" title="You're all caught up" message="New activity on your store will show up here." />
          }
          renderItem={({ item, index }) => (
            <PressableScale onPress={() => handlePress(item)}>
              <Card style={[styles.card, !item.isRead && styles.cardUnread]} delay={Math.min(index, 6) * motion.stagger}>
                <View style={styles.row}>
                  {!item.isRead ? <View style={styles.dot} /> : null}
                  <Text style={styles.title}>{item.title}</Text>
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              </Card>
            </PressableScale>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  markAllRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  markAllText: {
    ...typography.bodyBold,
    color: colors.textInverse,
    fontSize: 13,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: layout.tabBarClearance,
    gap: spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  cardUnread: {
    borderColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  title: {
    ...typography.h2,
    fontSize: 15,
    color: colors.text,
  },
  message: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  date: {
    ...typography.caption,
    fontWeight: '400',
    fontSize: 11,
    color: colors.textFaint,
    marginTop: spacing.sm,
  },
});
