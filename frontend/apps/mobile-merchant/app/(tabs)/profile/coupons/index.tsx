import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card } from '../../../../components/Card';
import { PressableScale } from '../../../../components/PressableScale';
import { LoadingState } from '../../../../components/LoadingState';
import { EmptyState, ErrorState } from '../../../../components/EmptyState';
import { colors, formatEGP, layout, motion, radius, spacing, typography } from '../../../../constants/theme';
import { getCoupons } from '../../../../lib/services/coupons';
import { useStore } from '../../../../lib/storeContext';
import { Coupon } from '../../../../lib/types';

function describeDiscount(coupon: Coupon): string {
  if (coupon.type === 'percentage') return `${coupon.value}% off`;
  if (coupon.type === 'fixed') return `${formatEGP(coupon.value)} off`;
  return 'Free shipping';
}

export default function CouponsListScreen() {
  const router = useRouter();
  const { storeId } = useStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setError(null);
    try {
      const data = await getCoupons(storeId);
      setCoupons(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load coupons.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{coupons.length} coupon{coupons.length === 1 ? '' : 's'}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(tabs)/profile/coupons/create')}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState label="Loading coupons…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFFFFF" />}
          ListEmptyComponent={
            <EmptyState icon="pricetags-outline" title="No coupons yet" message="Create a discount code to run a promotion." />
          }
          renderItem={({ item, index }) => (
            <PressableScale onPress={() => router.push(`/(tabs)/profile/coupons/${item._id}`)}>
              <Card style={styles.couponCard} delay={Math.min(index, 6) * motion.stagger}>
                <View style={styles.rowBetween}>
                  <Text style={styles.code}>{item.code}</Text>
                  <View style={[styles.statusPill, item.isActive ? styles.statusActive : styles.statusInactive]}>
                    <Text style={[styles.statusText, item.isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.discount}>{describeDiscount(item)}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.muted}>
                    Used {item.usageCount}{item.maxUsage >= 0 ? `/${item.maxUsage}` : ''}
                  </Text>
                  {item.expiresAt ? (
                    <Text style={styles.muted}>Expires {new Date(item.expiresAt).toLocaleDateString()}</Text>
                  ) : (
                    <Text style={styles.muted}>No expiry</Text>
                  )}
                </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  addButtonText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: layout.tabBarClearance,
  },
  couponCard: {
    marginBottom: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: {
    ...typography.h2,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.text,
  },
  discount: {
    ...typography.bodyBold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  muted: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'none',
    fontWeight: '500',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusInactive: { backgroundColor: '#F1F5F9' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusActiveText: { color: '#166534' },
  statusInactiveText: { color: '#475569' },
});
