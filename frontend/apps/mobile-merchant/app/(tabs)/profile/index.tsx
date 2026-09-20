import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { GradientHeader } from '../../../components/GradientHeader';
import { GradientButton } from '../../../components/GradientButton';
import { Card } from '../../../components/Card';
import { PressableScale } from '../../../components/PressableScale';
import { HeroStat } from '../../../components/HeroStat';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/EmptyState';
import { colors, formatEGP, layout, motion, radius, spacing, typography } from '../../../constants/theme';
import { useAuth } from '../../../lib/authContext';
import { getBillingOverview } from '../../../lib/services/billing';
import { BillingOverview } from '../../../lib/types';

const MANAGE_ROWS: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; href: '/(tabs)/profile/analytics' | '/(tabs)/profile/store-settings' | '/(tabs)/profile/coupons' }[] = [
  { icon: 'bar-chart-outline', title: 'Analytics', subtitle: 'Revenue trends, top products & customers', href: '/(tabs)/profile/analytics' },
  { icon: 'storefront-outline', title: 'Store settings', subtitle: 'Branding, contact info & shipping zones', href: '/(tabs)/profile/store-settings' },
  { icon: 'pricetags-outline', title: 'Coupons', subtitle: 'Discount codes & promotions', href: '/(tabs)/profile/coupons' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getBillingOverview();
      setBilling(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load billing info.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.replace('/(auth)/login');
  };

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.screen}>
      <GradientHeader title="Profile & settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard} delay={0}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name || 'Merchant'}</Text>
            <Text style={styles.muted}>{user?.email}</Text>
          </View>
        </Card>

        {loading ? (
          <LoadingState label="Loading account info…" />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <HeroStat label="Wallet balance" value={formatEGP(billing?.wallet.balance || 0)} caption="Available for plan fees, order fees & top-ups" />

            <Card delay={motion.stagger}>
              <Text style={styles.sectionTitle}>Plan</Text>
              <Text style={styles.value}>{billing?.plan.name}</Text>
              <Text style={styles.muted}>
                {billing?.plan.type === 'paid' ? `${formatEGP(billing.plan.monthlyPrice)} / month` : 'Free plan'}
              </Text>
            </Card>

            <Card delay={motion.stagger * 2}>
              <Text style={styles.sectionTitle}>Subscription</Text>
              <View style={styles.rowBetween}>
                <Text style={styles.value}>{billing?.subscription.status}</Text>
                {billing?.subscription.expiresAt ? (
                  <Text style={styles.muted}>{new Date(billing.subscription.expiresAt).toLocaleDateString()}</Text>
                ) : null}
              </View>
            </Card>

            <Card delay={motion.stagger * 3}>
              <Text style={styles.sectionTitle}>Usage</Text>
              <View style={styles.usageRow}>
                <Text style={styles.muted}>Stores</Text>
                <Text style={styles.value}>
                  {billing?.usage.storesUsed}/{billing?.usage.storeLimit}
                </Text>
              </View>
              <View style={[styles.usageRow, { marginTop: spacing.xs }]}>
                <Text style={styles.muted}>Products</Text>
                <Text style={styles.value}>
                  {billing?.usage.productsUsed}/{billing?.usage.productLimit}
                </Text>
              </View>
            </Card>
          </>
        )}

        <Text style={styles.sectionLabel}>Manage</Text>
        {MANAGE_ROWS.map((row, idx) => (
          <PressableScale key={row.href} onPress={() => router.push(row.href)}>
            <Card style={styles.manageRow} delay={motion.stagger * (4 + idx)}>
              <View style={styles.manageIconCircle}>
                <Ionicons name={row.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageTitle}>{row.title}</Text>
                <Text style={styles.manageSubtitle}>{row.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Card>
          </PressableScale>
        ))}

        <GradientButton title="Log out" onPress={handleLogout} loading={loggingOut} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: {
    padding: spacing.md,
    paddingBottom: layout.tabBarClearance,
    gap: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h1,
    color: '#FFFFFF',
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textInverseFaint,
    marginTop: spacing.xs,
  },
  value: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 0,
  },
  manageIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  manageSubtitle: {
    ...typography.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
