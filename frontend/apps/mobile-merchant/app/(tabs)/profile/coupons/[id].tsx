import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { CouponForm, CouponFormValues } from '../../../../components/CouponForm';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/EmptyState';
import { colors, spacing, typography } from '../../../../constants/theme';
import { confirmAsync, notify } from '../../../../lib/alerts';
import { deleteCoupon, getCoupons, updateCoupon } from '../../../../lib/services/coupons';
import { useStore } from '../../../../lib/storeContext';
import { Coupon } from '../../../../lib/types';

function toFormValues(coupon: Coupon): CouponFormValues {
  return {
    code: coupon.code,
    type: coupon.type,
    value: String(coupon.value ?? ''),
    minOrderAmount: coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : '',
    maxUsage: coupon.maxUsage >= 0 ? String(coupon.maxUsage) : '',
    expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    isActive: coupon.isActive,
  };
}

export default function EditCouponScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { storeId } = useStore();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // There's no GET-one endpoint for coupons — find it in the store's list.
  const load = useCallback(async () => {
    if (!storeId) return;
    try {
      const coupons = await getCoupons(storeId);
      const match = coupons.find((c) => c._id === id) || null;
      if (!match) {
        setError('Coupon not found.');
      } else {
        setCoupon(match);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load coupon.');
    } finally {
      setLoading(false);
    }
  }, [storeId, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSubmit = async (values: CouponFormValues) => {
    if (!coupon) return;
    await updateCoupon(coupon._id, {
      code: values.code.trim(),
      type: values.type,
      value: values.type === 'free_shipping' ? 0 : Number(values.value) || 0,
      minOrderAmount: values.minOrderAmount ? Number(values.minOrderAmount) : undefined,
      maxUsage: values.maxUsage ? Number(values.maxUsage) : -1,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      isActive: values.isActive,
    });
    router.replace('/(tabs)/profile/coupons');
  };

  const handleDelete = async () => {
    if (!coupon) return;
    const confirmed = await confirmAsync('Delete coupon', `Delete ${coupon.code}? This can't be undone.`, 'Delete');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteCoupon(coupon._id);
      router.replace('/(tabs)/profile/coupons');
    } catch (err: any) {
      notify('Failed', err?.response?.data?.message || 'Could not delete this coupon.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingState label="Loading coupon…" />
      </View>
    );
  }

  if (error || !coupon) {
    return (
      <View style={styles.center}>
        <ErrorState message={error || 'Coupon not found.'} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CouponForm initialValues={toFormValues(coupon)} submitLabel="Save changes" onSubmit={handleSubmit} />
      <TouchableOpacity style={styles.deleteRow} onPress={handleDelete} disabled={deleting}>
        <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete coupon'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  deleteRow: { padding: spacing.lg, alignItems: 'center' },
  deleteText: { ...typography.bodyBold, color: colors.danger },
});
