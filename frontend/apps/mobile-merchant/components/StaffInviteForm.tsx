import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card } from './Card';
import { GradientButton } from './GradientButton';
import { colors, layout, radius, spacing, typography } from '../constants/theme';
import { StoreStaffRole } from '../lib/types';

export interface StaffInviteFormValues {
  email: string;
  role: StoreStaffRole;
}

const ROLE_OPTIONS: { label: string; value: StoreStaffRole; description: string }[] = [
  { label: 'Staff', value: 'staff', description: 'Products, orders & customers only.' },
  { label: 'Manager', value: 'manager', description: 'Everything except billing & team management.' },
];

export function StaffInviteForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (values: StaffInviteFormValues) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StoreStaffRole>('staff');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ email: trimmed, role });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send invite.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.sectionTitle}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="teammate@example.com"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Role</Text>
        {ROLE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.roleRow, role === opt.value && styles.roleRowActive]}
            onPress={() => setRole(opt.value)}
          >
            <View style={styles.radioOuter}>
              {role === opt.value ? <View style={styles.radioInner} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleLabel}>{opt.label}</Text>
              <Text style={styles.roleDescription}>{opt.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GradientButton title={submitLabel} onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.sm }} />
    </ScrollView>
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
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleRowActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  roleLabel: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  roleDescription: {
    ...typography.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
