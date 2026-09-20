import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { GradientHeader } from '../../components/GradientHeader';
import { Card } from '../../components/Card';
import { HeroStat } from '../../components/HeroStat';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/EmptyState';
import { colors, formatEGP, layout, motion, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../lib/authContext';
import { getAnalyticsOverview } from '../../lib/services/analytics';
import { getBillingOverview } from '../../lib/services/billing';
import { AnalyticsOverview, BillingOverview } from '../../lib/types';
import { useNotificationCount } from '../../lib/notificationCountContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const { unreadCount, refresh: refreshUnreadCount } = useNotificationCount();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [analyticsData, billingData] = await Promise.all([
        getAnalyticsOverview(30),
        getBillingOverview(),
        refreshUnreadCount(),
      ]);
      setAnalytics(analyticsData);
      setBilling(billingData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const firstName = user?.name?.trim().split(' ')[0];

  return (
    <View style={styles.screen}>
      <GradientHeader
        title={firstName ? `Hi, ${firstName}` : 'Welcome back'}
        subtitle="Here's how your store is doing"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
      >
        {loading ? (
          <LoadingState label="Loading your dashboard…" />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <HeroStat
              label="Total revenue"
              value={formatEGP(analytics?.totalRevenue || 0)}
              caption={`${formatEGP(analytics?.recentRevenue || 0)} in the last 30 days`}
            />

            <View style={styles.grid}>
              <StatCard label="Orders" value={String(analytics?.totalOrders ?? 0)} icon="receipt-outline" delay={motion.stagger} />
              <StatCard label="Low stock" value={String(analytics?.lowStockProducts ?? 0)} icon="alert-circle-outline" delay={motion.stagger * 2} />
              <StatCard label="Customers" value={String(analytics?.totalCustomers ?? 0)} icon="people-outline" delay={motion.stagger * 3} />
              <StatCard label="Unread alerts" value={String(unreadCount)} icon="notifications-outline" delay={motion.stagger * 4} />
            </View>

            <Text style={styles.sectionLabel}>Finances</Text>

            <Card delay={motion.stagger * 5}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.cardTitle}>Gross profit</Text>
                  <Text style={styles.bigNumber}>{formatEGP(analytics?.grossProfit || 0)}</Text>
                </View>
                <View style={styles.marginPill}>
                  <Text style={styles.marginPillText}>{(analytics?.marginPercent ?? 0).toFixed(1)}%</Text>
                </View>
              </View>
              <Text style={styles.caveat}>
                Estimated — orders placed before cost tracking existed count as 0 EGP cost, which can overstate profit.
              </Text>
            </Card>

            <Card style={{ marginTop: spacing.md }} delay={motion.stagger * 6}>
              <Text style={styles.cardTitle}>Wallet</Text>
              <Text style={styles.bigNumber}>{formatEGP(billing?.wallet.balance || 0)}</Text>
              <View style={styles.divider} />
              <View style={styles.rowBetween}>
                <Text style={styles.muted}>Plan</Text>
                <Text style={styles.value}>{billing?.plan.name || '—'}</Text>
              </View>
              <View style={[styles.rowBetween, { marginTop: spacing.xs }]}>
                <Text style={styles.muted}>Subscription</Text>
                <Text style={styles.value}>{billing?.subscription.status || '—'}</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, delay }: { label: string; value: string; icon: any; delay?: number }) {
  return (
    <Card style={styles.statCard} delay={delay}>
      <View style={styles.statIconCircle}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.md,
    paddingBottom: layout.tabBarClearance,
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h1,
    fontSize: 20,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'none',
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textFaint,
    marginTop: spacing.xs,
  },
  cardTitle: {
    ...typography.label,
    color: colors.textMuted,
  },
  bigNumber: {
    ...typography.h1,
    fontSize: 26,
    color: colors.text,
    marginTop: spacing.xs,
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
  },
  value: {
    ...typography.bodyBold,
    color: colors.text,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  marginPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  marginPillText: {
    ...typography.caption,
    color: '#166534',
  },
  caveat: {
    ...typography.body,
    fontSize: 12,
    color: colors.warning,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
