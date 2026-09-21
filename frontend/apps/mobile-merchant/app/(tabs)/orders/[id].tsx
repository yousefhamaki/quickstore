import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Card } from '../../../components/Card';
import { GradientButton } from '../../../components/GradientButton';
import { StatusBadge } from '../../../components/StatusBadge';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/EmptyState';
import { colors, formatEGP, layout, motion, radius, spacing, typography } from '../../../constants/theme';
import { notify } from '../../../lib/alerts';
import { getOrder, issueRefund, updateOrderStatus } from '../../../lib/services/orders';
import { generateWaybill, setManualTracking, trackShipment } from '../../../lib/services/shipping';
import { useStore } from '../../../lib/storeContext';
import { Order, OrderStatus } from '../../../lib/types';

const NEXT_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { store } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [generatingWaybill, setGeneratingWaybill] = useState(false);
  const [checkingTracking, setCheckingTracking] = useState(false);
  const [liveStatus, setLiveStatus] = useState<{ status: string; statusDate: string } | null>(null);

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

  const handleGenerateWaybill = async () => {
    if (!order) return;
    setGeneratingWaybill(true);
    try {
      await generateWaybill(order._id);
      await load();
      notify('Waybill generated', 'The shipment was created and tracking info was saved to this order.');
    } catch (err: any) {
      notify('Could not generate waybill', err?.response?.data?.message || 'The shipping provider request failed.');
    } finally {
      setGeneratingWaybill(false);
    }
  };

  const handleCheckTracking = async () => {
    if (!order) return;
    setCheckingTracking(true);
    try {
      const status = await trackShipment(order._id);
      setLiveStatus(status);
    } catch (err: any) {
      notify('Could not refresh tracking', err?.response?.data?.message || 'Failed to reach the shipping provider.');
    } finally {
      setCheckingTracking(false);
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
  const remainingBalance = Math.max(0, order.total - (order.refundedAmount || 0));
  const canRefund = order.paymentStatus === 'paid' || order.paymentStatus === 'partially_refunded';

  return (
    <>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <Card delay={0}>
          <View style={styles.headerRow}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
            <StatusBadge status={order.status} />
          </View>
          <Text style={styles.muted}>{new Date(order.createdAt).toLocaleString()}</Text>
        </Card>

        <Card style={styles.section} delay={motion.stagger}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.value}>
            {customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown' : 'Unknown'}
          </Text>
          {customer?.email ? <Text style={styles.muted}>{customer.email}</Text> : null}
          {customer?.phone ? <Text style={styles.muted}>{customer.phone}</Text> : null}
        </Card>

        <Card style={styles.section} delay={motion.stagger * 2}>
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
          {(order.refundedAmount || 0) > 0 ? (
            <View style={styles.itemRow}>
              <Text style={[styles.muted, { color: colors.danger }]}>Refunded</Text>
              <Text style={[styles.value, { color: colors.danger }]}>-{formatEGP(order.refundedAmount || 0)}</Text>
            </View>
          ) : null}
        </Card>

        <Card style={styles.section} delay={motion.stagger * 3}>
          <Text style={styles.sectionTitle}>Shipping address</Text>
          <Text style={styles.value}>{order.shippingAddress?.fullName}</Text>
          <Text style={styles.muted}>{order.shippingAddress?.phone}</Text>
          <Text style={styles.muted}>
            {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state}
          </Text>
        </Card>

        <ShippingCard
          order={order}
          isBosta={!!store?.settings?.shipping?.enabled && store?.settings?.shipping?.provider === 'bosta'}
          liveStatus={liveStatus}
          generatingWaybill={generatingWaybill}
          checkingTracking={checkingTracking}
          onGenerateWaybill={handleGenerateWaybill}
          onCheckTracking={handleCheckTracking}
          onEditTracking={() => setTrackingModalOpen(true)}
        />

        <Card style={styles.section} delay={motion.stagger * 4}>
          <Text style={styles.sectionTitle}>Update status</Text>
          <View style={styles.statusGrid}>
            {NEXT_STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                disabled={updating === status || status === order.status}
                onPress={() => handleStatusChange(status)}
                style={[styles.statusOption, status === order.status && styles.statusOptionActive]}
              >
                {updating === status ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.statusOptionText, status === order.status && styles.statusOptionTextActive]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.section} delay={motion.stagger * 5}>
          <Text style={styles.sectionTitle}>Refunds</Text>
          {order.refunds && order.refunds.length > 0 ? (
            order.refunds.map((refund, idx) => (
              <View key={idx} style={styles.refundRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.value}>{formatEGP(refund.amount)}</Text>
                  <Text style={styles.muted}>{refund.reason}</Text>
                </View>
                <Text style={styles.muted}>{new Date(refund.refundedAt).toLocaleDateString()}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No refunds issued for this order.</Text>
          )}

          {canRefund && remainingBalance > 0 ? (
            <GradientButton title="Issue refund" onPress={() => setRefundOpen(true)} style={{ marginTop: spacing.md }} />
          ) : !canRefund ? (
            <Text style={[styles.muted, { marginTop: spacing.sm }]}>
              This order can't be refunded from its current payment status ({order.paymentStatus}).
            </Text>
          ) : (
            <Text style={[styles.muted, { marginTop: spacing.sm }]}>This order has already been fully refunded.</Text>
          )}
        </Card>
      </ScrollView>

      <RefundModal
        visible={refundOpen}
        onClose={() => setRefundOpen(false)}
        remainingBalance={remainingBalance}
        onSubmit={async (amount, reason) => {
          await issueRefund(order._id, amount, reason);
          // Re-fetch via getOrder (which populates customerId) rather than
          // trusting the refund endpoint's own response — it returns the
          // raw saved Order document without that population, which would
          // otherwise regress the Customer section to "Unknown" right after
          // a refund.
          await load();
          setRefundOpen(false);
        }}
      />

      <TrackingModal
        visible={trackingModalOpen}
        initialCarrier={order.shippingProvider || ''}
        initialTrackingNumber={order.trackingNumber || ''}
        initialTrackingUrl={order.trackingUrl || ''}
        onClose={() => setTrackingModalOpen(false)}
        onSubmit={async (carrierName, trackingNumber, trackingUrl) => {
          await setManualTracking(order._id, carrierName, trackingNumber, trackingUrl);
          await load();
          setTrackingModalOpen(false);
        }}
      />
    </>
  );
}

function ShippingCard({
  order,
  isBosta,
  liveStatus,
  generatingWaybill,
  checkingTracking,
  onGenerateWaybill,
  onCheckTracking,
  onEditTracking,
}: {
  order: Order;
  isBosta: boolean;
  liveStatus: { status: string; statusDate: string } | null;
  generatingWaybill: boolean;
  checkingTracking: boolean;
  onGenerateWaybill: () => void;
  onCheckTracking: () => void;
  onEditTracking: () => void;
}) {
  const hasTracking = !!order.trackingNumber;

  return (
    <Card style={styles.section} delay={motion.stagger * 3.5}>
      <Text style={styles.sectionTitle}>Shipping</Text>

      {hasTracking ? (
        <>
          <View style={styles.itemRow}>
            <Text style={styles.muted}>Carrier</Text>
            <Text style={styles.value}>{order.shippingProvider || 'Unknown'}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.muted}>Tracking number</Text>
            <Text style={styles.value}>{order.trackingNumber}</Text>
          </View>
          {order.shippingStatus ? (
            <View style={[styles.itemRow, { alignItems: 'center' }]}>
              <Text style={styles.muted}>Status</Text>
              <StatusBadge status={order.shippingStatus} />
            </View>
          ) : null}
          {liveStatus ? (
            <View style={styles.itemRow}>
              <Text style={styles.muted}>Live status</Text>
              <Text style={styles.value}>
                {liveStatus.status} · {new Date(liveStatus.statusDate).toLocaleDateString()}
              </Text>
            </View>
          ) : null}

          <View style={styles.shippingActionsRow}>
            {order.waybillUrl ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => Linking.openURL(order.waybillUrl as string)}
              >
                <Text style={styles.secondaryButtonText}>View waybill</Text>
              </TouchableOpacity>
            ) : null}
            {isBosta ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={onCheckTracking} disabled={checkingTracking}>
                {checkingTracking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Track shipment</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.secondaryButton} onPress={onEditTracking}>
                <Text style={styles.secondaryButtonText}>Edit tracking</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : isBosta ? (
        <>
          <Text style={styles.muted}>No waybill has been generated for this order yet.</Text>
          <GradientButton
            title="Generate waybill"
            onPress={onGenerateWaybill}
            loading={generatingWaybill}
            style={{ marginTop: spacing.md }}
          />
        </>
      ) : (
        <>
          <Text style={styles.muted}>No tracking info yet. Add it once the order ships.</Text>
          <TouchableOpacity style={[styles.secondaryButton, { marginTop: spacing.md }]} onPress={onEditTracking}>
            <Text style={styles.secondaryButtonText}>Add tracking info</Text>
          </TouchableOpacity>
        </>
      )}
    </Card>
  );
}

function TrackingModal({
  visible,
  initialCarrier,
  initialTrackingNumber,
  initialTrackingUrl,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initialCarrier: string;
  initialTrackingNumber: string;
  initialTrackingUrl: string;
  onClose: () => void;
  onSubmit: (carrierName: string, trackingNumber: string, trackingUrl?: string) => Promise<void>;
}) {
  const [carrierName, setCarrierName] = useState(initialCarrier);
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setCarrierName(initialCarrier);
      setTrackingNumber(initialTrackingNumber);
      setTrackingUrl(initialTrackingUrl);
      setError(null);
    }
  }, [visible, initialCarrier, initialTrackingNumber, initialTrackingUrl]);

  const handleSubmit = async () => {
    if (!carrierName.trim()) {
      setError('Carrier name is required.');
      return;
    }
    if (!trackingNumber.trim()) {
      setError('Tracking number is required.');
      return;
    }
    if (trackingUrl.trim() && !/^https?:\/\//i.test(trackingUrl.trim())) {
      setError('Tracking URL must start with http:// or https://');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(carrierName.trim(), trackingNumber.trim(), trackingUrl.trim() || undefined);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save tracking info.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={submitting ? undefined : onClose} />
        <Card style={styles.modalCard} intensity={50}>
          <Text style={styles.modalTitle}>Tracking info</Text>
          <Text style={styles.muted}>Enter this order's carrier and tracking number.</Text>

          <Text style={styles.label}>Carrier name</Text>
          <TextInput
            style={styles.input}
            value={carrierName}
            onChangeText={setCarrierName}
            placeholder="e.g. Local courier"
            placeholderTextColor={colors.textFaint}
          />

          <Text style={styles.label}>Tracking number</Text>
          <TextInput
            style={styles.input}
            value={trackingNumber}
            onChangeText={setTrackingNumber}
            placeholder="e.g. TRK-12345"
            placeholderTextColor={colors.textFaint}
          />

          <Text style={styles.label}>Tracking URL (optional)</Text>
          <TextInput
            style={styles.input}
            value={trackingUrl}
            onChangeText={setTrackingUrl}
            placeholder="https://…"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            keyboardType="url"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <GradientButton title="Save tracking" onPress={handleSubmit} loading={submitting} style={{ flex: 1 }} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

function RefundModal({
  visible,
  onClose,
  remainingBalance,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  remainingBalance: number;
  onSubmit: (amount: number, reason: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(remainingBalance.toFixed(2)));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setAmount(String(remainingBalance.toFixed(2)));
      setReason('');
      setError(null);
    }
  }, [visible, remainingBalance]);

  const handleSubmit = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid refund amount.');
      return;
    }
    if (numericAmount > remainingBalance) {
      setError(`Amount can't exceed the remaining balance of ${formatEGP(remainingBalance)}.`);
      return;
    }
    if (!reason.trim()) {
      setError('A reason is required to issue a refund.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(numericAmount, reason.trim());
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to issue refund.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={submitting ? undefined : onClose} />
        <Card style={styles.modalCard} intensity={50}>
          <Text style={styles.modalTitle}>Issue a refund</Text>
          <Text style={styles.muted}>Remaining refundable balance: {formatEGP(remainingBalance)}</Text>

          <Text style={styles.label}>Amount (EGP)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textFaint}
          />

          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Item arrived damaged"
            placeholderTextColor={colors.textFaint}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <GradientButton title="Confirm refund" onPress={handleSubmit} loading={submitting} style={{ flex: 1 }} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  content: {
    padding: spacing.md,
    paddingBottom: layout.tabBarClearance,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  shippingActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.primary,
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
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    ...typography.h1,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.glassFillStrong,
    color: colors.text,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    alignItems: 'stretch',
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.bodyBold,
    color: colors.textMuted,
  },
});
