import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { GradientHeader } from '../../../components/GradientHeader';
import { Card } from '../../../components/Card';
import { PressableScale } from '../../../components/PressableScale';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { EmptyState, ErrorState } from '../../../components/EmptyState';
import { colors, formatEGP, layout, motion, radius, spacing, typography } from '../../../constants/theme';
import { getOrders } from '../../../lib/services/orders';
import { Order, OrderStatus } from '../../../lib/types';

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

export default function OrdersListScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: OrderStatus | 'all') => {
    setError(null);
    try {
      const data = await getOrders(status === 'all' ? {} : { status });
      setOrders(data.orders);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(filter);
    }, [filter, load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(filter);
  };

  return (
    <View style={styles.screen}>
      <GradientHeader title="Orders" />

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterChipText, filter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingState label="Loading orders…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No orders yet"
              message="Orders placed on your store will show up here."
            />
          }
          renderItem={({ item, index }) => (
            <PressableScale onPress={() => router.push(`/(tabs)/orders/${item._id}`)}>
              <Card style={styles.orderCard} delay={Math.min(index, 6) * motion.stagger}>
                <View style={styles.orderRow}>
                  <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.orderTotal}>{formatEGP(item.total)}</Text>
                <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </Card>
            </PressableScale>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.glassFillSubtle,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.textInverseMuted,
    textTransform: 'none',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: layout.tabBarClearance,
  },
  orderCard: {
    marginBottom: spacing.sm,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    ...typography.h2,
    color: colors.text,
  },
  orderTotal: {
    ...typography.h1,
    fontSize: 20,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  orderDate: {
    ...typography.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
