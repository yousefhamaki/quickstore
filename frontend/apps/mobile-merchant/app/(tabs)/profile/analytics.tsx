import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { Card } from '../../../components/Card';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/EmptyState';
import { colors, formatEGP, layout, motion, radius, spacing, typography } from '../../../constants/theme';
import { getRevenueSeries, getTopProducts, getCustomerAnalytics } from '../../../lib/services/analytics';
import { useStore } from '../../../lib/storeContext';
import { AnalyticsPeriod, CustomersAnalytics, RevenuePoint, TopProduct } from '../../../lib/types';

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pointLabel(point: RevenuePoint, period: AnalyticsPeriod): string {
  if (period === 'monthly') return MONTH_ABBR[(point._id.month || 1) - 1] || '';
  if (period === 'weekly') return `W${point._id.week ?? ''}`;
  return point._id.day != null ? `${point._id.day}/${point._id.month}` : '';
}

export default function AnalyticsScreen() {
  const { storeId } = useStore();
  const [period, setPeriod] = useState<AnalyticsPeriod>('daily');
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [customers, setCustomers] = useState<CustomersAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: AnalyticsPeriod) => {
    setError(null);
    try {
      const [rev, products, custs] = await Promise.all([getRevenueSeries(p), getTopProducts(5), getCustomerAnalytics()]);
      setRevenue(rev);
      setTopProducts(products);
      setCustomers(custs);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    // `storeId` re-triggers this the instant the merchant switches their
    // active store, even if this screen was already focused when they did.
    useCallback(() => {
      setLoading(true);
      load(period);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, storeId])
  );

  const totalRevenue = revenue.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const chartData = revenue.map((p) => ({
    value: p.revenue,
    label: pointLabel(p, period),
    dataPointText: '',
  }));

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.periodChip, period === p.value && styles.periodChipActive]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[styles.periodChipText, period === p.value && styles.periodChipTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingState label="Crunching the numbers…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          <Card delay={0}>
            <Text style={styles.sectionTitle}>Revenue</Text>
            <Text style={styles.bigNumber}>{formatEGP(totalRevenue)}</Text>
            <Text style={styles.muted}>
              Across {revenue.length} {period === 'monthly' ? 'months' : period === 'weekly' ? 'weeks' : 'days'}
            </Text>
            {chartData.length > 1 ? (
              <View style={{ marginTop: spacing.md, marginLeft: -spacing.sm }}>
                <LineChart
                  data={chartData}
                  height={160}
                  color={colors.primary}
                  thickness={3}
                  areaChart
                  startFillColor={colors.gradientStart}
                  endFillColor={colors.gradientEnd}
                  startOpacity={0.35}
                  endOpacity={0.02}
                  hideDataPoints
                  hideRules
                  xAxisColor="rgba(15,23,42,0.15)"
                  yAxisColor="transparent"
                  yAxisTextStyle={{ color: colors.textFaint, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textFaint, fontSize: 9 }}
                  noOfSections={3}
                  curved
                  initialSpacing={8}
                  spacing={Math.max(28, 260 / Math.max(chartData.length, 1))}
                />
              </View>
            ) : (
              <Text style={styles.muted}>Not enough data yet for a trend line.</Text>
            )}
          </Card>

          <Card style={styles.section} delay={motion.stagger}>
            <Text style={styles.sectionTitle}>Top products</Text>
            {topProducts.length === 0 ? (
              <Text style={styles.muted}>No sales yet.</Text>
            ) : (
              topProducts.map((p, idx) => (
                <View key={p._id} style={[styles.topProductRow, idx > 0 && styles.topProductBorder]}>
                  {p.productImage ? (
                    <Image source={{ uri: p.productImage }} style={styles.topProductImage} />
                  ) : (
                    <View style={[styles.topProductImage, styles.topProductPlaceholder]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.value} numberOfLines={1}>
                      {p.productName}
                    </Text>
                    <Text style={styles.muted}>{p.totalSold} sold</Text>
                  </View>
                  <Text style={styles.value}>{formatEGP(p.revenue)}</Text>
                </View>
              ))
            )}
          </Card>

          <Card style={styles.section} delay={motion.stagger * 2}>
            <Text style={styles.sectionTitle}>Customers</Text>
            <Text style={styles.bigNumber}>{customers?.totalCustomers ?? 0}</Text>
            <Text style={styles.muted}>Total customers to date</Text>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: {
    padding: spacing.md,
    paddingBottom: layout.tabBarClearance,
    gap: spacing.md,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.glassFillSubtle,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodChipText: {
    ...typography.caption,
    color: colors.textInverseMuted,
    textTransform: 'none',
  },
  periodChipTextActive: {
    color: '#FFFFFF',
  },
  section: { marginTop: 0 },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  bigNumber: {
    ...typography.h1,
    fontSize: 26,
    color: colors.text,
  },
  muted: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  value: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  topProductBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  topProductImage: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
  },
  topProductPlaceholder: {
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
});
