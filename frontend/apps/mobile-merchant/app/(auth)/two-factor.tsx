import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GradientHeader } from '../../components/GradientHeader';
import { GradientButton } from '../../components/GradientButton';
import { Card } from '../../components/Card';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../lib/authContext';
import * as authService from '../../lib/services/auth';
import { LoginSuccess } from '../../lib/types';

export default function TwoFactorScreen() {
  const router = useRouter();
  const { completeLogin } = useAuth();
  const { challengeToken, method } = useLocalSearchParams<{ challengeToken: string; method: string }>();
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Enter the verification code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await authService.verifyTwoFactorLogin(
        challengeToken,
        useBackupCode ? { backupCode: code.trim() } : { code: code.trim() }
      );
      await completeLogin(response as LoginSuccess);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.flex}>
      <GradientHeader
        title="Two-factor verification"
        subtitle={method === 'email' ? 'Enter the code sent to your email' : 'Enter the code from your authenticator app'}
      />
      <View style={styles.form}>
        <Card>
          <Text style={styles.label}>{useBackupCode ? 'Backup code' : 'Verification code'}</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder={useBackupCode ? 'XXXX-XXXX' : '123456'}
            placeholderTextColor={colors.textFaint}
            keyboardType={useBackupCode ? 'default' : 'number-pad'}
            autoCapitalize="none"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton title="Verify" onPress={handleVerify} loading={loading} style={{ marginTop: spacing.lg }} />
        </Card>

        <Text style={styles.switchLink} onPress={() => setUseBackupCode((v) => !v)}>
          {useBackupCode ? 'Use a verification code instead' : 'Use a backup code instead'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: {
    padding: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: 4,
    backgroundColor: colors.glassFillStrong,
    color: colors.text,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  switchLink: {
    ...typography.bodyBold,
    color: colors.textInverse,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
