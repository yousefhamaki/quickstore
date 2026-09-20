import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Card } from '../../../components/Card';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/EmptyState';
import { colors, formatEGP, radius, spacing, typography } from '../../../constants/theme';
import { getOrder, updateOrderStatus } from '../../../lib/services/orders';
import { Order, OrderStatus } from '../../../lib/types';

const NEXT_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleStatusChange = async (status: OrderStatus) => {
    if (!order || status === order.status) return;
    setUpdating(status);
    try {
      const updated = await updateOrderStatus(order._id, status);
      setOrder(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState label="Loading order…" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <ErrorState message={error || 'Order not found.'} />
      </View>
    );
  }

  const customer = typeof order.customerId === 'object' ? order.customerId : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <StatusBadge status={order.status} />
        </View>
        <Text style={styles.muted}>{new Date(order.createdAt).toLocaleString()}</Text>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={styles.value}>
          {customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown' : 'Unknown'}
        </Text>
        {customer?.email ? <Text style={styles.muted}>{customer.email}</Text> : null}
        {customer?.phone ? <Text style={styles.muted}>{customer.phone}</Text> : null}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.value}>{item.name}</Text>
              {item.variant ? <Text style={styles.muted}>{item.variant}</Text> : null}
              <Text style={styles.muted}>Qty {item.quantity}</Text>
            </View>
            <Text style={styles.value}>{formatEGP(item.price * item.quantity)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.itemRow}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text style={styles.muted}>{formatEGP(order.subtotal)}</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.muted}>Shipping</Text>
          <Text style={styles.muted}>{formatEGP(order.shipping)}</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatEGP(order.total)}</Text>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping address</Text>
        <Text style={styles.value}>{order.shippingAddress?.fullName}</Text>
        <Text style={styles.muted}>{order.shippingAddress?.phone}</Text>
        <Text style={styles.muted}>
          {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state}
        </Text>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Update status</Text>
        <View style={styles.statusGrid}>
          {NEXT_STATUSES.map((status) => (
            <TouchableOpacity
              key={status}
              disabled={updating === status || status === order.status}
              onPress={() => handleStatusChange(status)}
              style={[
                styles.statusOption,
                status === order.status && styles.statusOptionActive,
              ]}
            >
              {updating === status ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.statusOptionText,
                    status === order.status && styles.statusOptionTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    ...typography.h1,
    fontSize: 20,
    color: colors.text,
  },
  section: {
    marginTop: 0,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  value: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  muted: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  totalValue: {
    ...typography.h2,
    color: colors.primary,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 92,
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusOptionText: {
    ...typography.caption,
    color: colors.text,
    textTransform: 'none',
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
  },
});
