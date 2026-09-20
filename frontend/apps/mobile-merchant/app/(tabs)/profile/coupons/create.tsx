import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CouponForm, CouponFormValues } from '../../../../components/CouponForm';
import { colors, spacing, typography } from '../../../../constants/theme';
import { createCoupon } from '../../../../lib/services/coupons';
import { useStore } from '../../../../lib/storeContext';

const EMPTY_VALUES: CouponFormValues = {
  code: '',
  type: 'percentage',
  value: '',
  minOrderAmount: '',
  maxUsage: '',
  expiresAt: '',
  isActive: true,
};

export default function CreateCouponScreen() {
  const router = useRouter();
  const { storeId } = useStore();

  if (!storeId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No store found for this account yet.</Text>
      </View>
    );
  }

  const handleSubmit = async (values: CouponFormValues) => {
    await createCoupon({
      storeId,
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

  return <CouponForm initialValues={EMPTY_VALUES} submitLabel="Create coupon" onSubmit={handleSubmit} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  error: { ...typography.body, color: colors.textInverse, textAlign: 'center' },
});
