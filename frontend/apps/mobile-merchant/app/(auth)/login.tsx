import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from '../../components/GradientButton';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';
import { useAuth } from '../../lib/authContext';
import * as authService from '../../lib/services/auth';
import { LoginSuccess } from '../../lib/types';

export default function LoginScreen() {
  const router = useRouter();
  const { completeLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await authService.login(email.trim(), password);
      if ('requires2FA' in response && response.requires2FA) {
        router.push({
          pathname: '/(auth)/two-factor',
          params: { challengeToken: response.challengeToken, method: response.method },
        });
        return;
      }
      await completeLogin(response as LoginSuccess);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brandBlock}
        >
          <View style={styles.wordmarkBadge}>
            <Text style={styles.wordmarkBadgeText}>B</Text>
          </View>
          <Text style={styles.wordmark}>Buildora</Text>
          <Text style={styles.tagline}>Build once. Sell everywhere.</Text>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Log in to manage your store on the go.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@store.com"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoComplete="password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton title="Log in" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.lg }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  brandBlock: {
    paddingTop: 88,
    paddingBottom: 56,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  wordmarkBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  wordmarkBadgeText: {
    ...typography.display,
    fontSize: 26,
    color: '#FFFFFF',
  },
  wordmark: {
    ...typography.display,
    color: '#FFFFFF',
  },
  tagline: {
    ...typography.bodyLarge,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  formCard: {
    margin: spacing.lg,
    marginTop: -spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  formTitle: {
    ...typography.h1,
    color: colors.text,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
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
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FBFCFE',
    color: colors.text,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
});
