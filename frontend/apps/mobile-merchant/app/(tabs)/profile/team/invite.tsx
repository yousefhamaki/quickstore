import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../../../components/Card';
import { GradientButton } from '../../../../components/GradientButton';
import { StaffInviteForm, StaffInviteFormValues } from '../../../../components/StaffInviteForm';
import { colors, layout, radius, spacing, typography } from '../../../../constants/theme';
import { notify } from '../../../../lib/alerts';
import { inviteStoreStaff } from '../../../../lib/services/staff';
import { useStore } from '../../../../lib/storeContext';

export default function InviteTeammateScreen() {
  const router = useRouter();
  const { storeId } = useStore();
  // Set only when the invite was created but the email failed to send — the
  // owner then needs the raw link to share manually (this was a real bug on
  // the web dashboard: a silent "Invitation sent" toast even when nothing
  // arrived). A successful send just toasts and goes back to the list, same
  // as the coupon create flow.
  const [fallback, setFallback] = useState<{ email: string; acceptUrl: string; emailError?: string } | null>(null);

  if (!storeId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No store found for this account yet.</Text>
      </View>
    );
  }

  const handleSubmit = async (values: StaffInviteFormValues) => {
    const result = await inviteStoreStaff(storeId, values);
    if (result.emailSent) {
      notify('Invitation sent', `${values.email} will get an email with a link to accept.`);
      router.replace('/(tabs)/profile/team');
    } else {
      // Stay on this screen and show the link instead of a generic toast.
      setFallback({ email: values.email, acceptUrl: result.acceptUrl, emailError: result.emailError });
    }
  };

  if (fallback) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.warningTitle}>Invite created, but the email didn&apos;t send</Text>
          <Text style={styles.warningBody}>
            {fallback.emailError
              ? `${fallback.email}: ${fallback.emailError}`
              : `We couldn't email ${fallback.email}.`}
            {' '}Share this link with them directly — it works the same as the email would have.
          </Text>
          <TextInput
            style={styles.linkInput}
            value={fallback.acceptUrl}
            editable={false}
            selectTextOnFocus
            multiline
          />
        </Card>
        <GradientButton
          title="Done"
          onPress={() => router.replace('/(tabs)/profile/team')}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    );
  }

  return <StaffInviteForm submitLabel="Send invite" onSubmit={handleSubmit} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  error: { ...typography.body, color: colors.textInverse, textAlign: 'center' },
  content: { padding: spacing.md, paddingBottom: layout.tabBarClearance, gap: spacing.md },
  warningTitle: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  warningBody: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  linkInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 13,
    backgroundColor: colors.glassFillStrong,
    color: colors.text,
  },
});
