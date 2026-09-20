import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card } from './Card';
import { GradientButton } from './GradientButton';
import { colors, layout, radius, spacing, typography } from '../constants/theme';
import { CouponType } from '../lib/types';

export interface CouponFormValues {
  code: string;
  type: CouponType;
  value: string;
  minOrderAmount: string;
  maxUsage: string; // blank = unlimited
  expiresAt: string; // YYYY-MM-DD, blank = never
  isActive: boolean;
}

const TYPE_OPTIONS: { label: string; value: CouponType }[] = [
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed amount', value: 'fixed' },
  { label: 'Free shipping', value: 'free_shipping' },
];

export function CouponForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues: CouponFormValues;
  submitLabel: string;
  onSubmit: (values: CouponFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CouponFormValues>(key: K, value: CouponFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!values.code.trim()) {
      setError('A coupon code is required.');
      return;
    }
    if (values.type === 'percentage') {
      const v = Number(values.value);
      if (!Number.isFinite(v) || v <= 0 || v > 100) {
        setError('Percentage value must be between 1 and 100.');
        return;
      }
    } else if (values.type === 'fixed') {
      const v = Number(values.value);
      if (!Number.isFinite(v) || v <= 0) {
        setError('Enter a valid fixed discount amount.');
        return;
      }
    }
    if (values.expiresAt && Number.isNaN(new Date(values.expiresAt).getTime())) {
      setError('Expiry date must look like YYYY-MM-DD.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.sectionTitle}>Code</Text>
        <TextInput
          style={styles.codeInput}
          value={values.code}
          onChangeText={(v) => set('code', v.toUpperCase())}
          placeholder="SAVE20"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="characters"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Discount type</Text>
        <View style={styles.chipRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, values.type === opt.value && styles.chipActive]}
              onPress={() => set('type', opt.value)}
            >
              <Text style={[styles.chipText, values.type === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {values.type !== 'free_shipping' ? (
          <Field
            label={values.type === 'percentage' ? 'Percentage off (%)' : 'Amount off (EGP)'}
            value={values.value}
            onChangeText={(v) => set('value', v)}
            keyboardType="decimal-pad"
          />
        ) : null}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Rules</Text>
        <Field label="Minimum order amount (EGP)" value={values.minOrderAmount} onChangeText={(v) => set('minOrderAmount', v)} keyboardType="decimal-pad" placeholder="0" />
        <Field label="Max uses (blank = unlimited)" value={values.maxUsage} onChangeText={(v) => set('maxUsage', v)} keyboardType="number-pad" placeholder="Unlimited" />
        <Field label="Expires on (YYYY-MM-DD)" value={values.expiresAt} onChangeText={(v) => set('expiresAt', v)} placeholder="Never" />
        <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
          <Text style={styles.label}>Active</Text>
          <Switch value={values.isActive} onValueChange={(v) => set('isActive', v)} trackColor={{ true: colors.primary }} />
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GradientButton title={submitLabel} onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: layout.tabBarClearance, gap: spacing.md },
  section: { marginTop: 0 },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
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
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: 2,
    backgroundColor: colors.glassFillStrong,
    color: colors.text,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'none',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
