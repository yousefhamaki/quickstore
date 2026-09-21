import React, { useEffect, useState } from 'react';
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
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { GradientButton } from '../../components/GradientButton';
import { Card } from '../../components/Card';
import { colors, glowShadow, radius, spacing, typography } from '../../constants/theme';
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

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <View style={[styles.wordmarkBadge, glowShadow]}>
            <Text style={styles.wordmarkBadgeText}>B</Text>
          </View>
          <Text style={styles.wordmark}>Buildora</Text>
          <Text style={styles.tagline}>Build once. Sell everywhere.</Text>
        </View>

        <Animated.View style={animatedStyle}>
          <Card style={styles.formCard} delay={0}>
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
          </Card>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandBlock: {
    paddingTop: 72,
    paddingBottom: 40,
    alignItems: 'center',
  },
  wordmarkBadge: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  wordmarkBadgeText: {
    ...typography.display,
    fontSize: 28,
    color: '#FFFFFF',
  },
  wordmark: {
    ...typography.display,
    color: colors.textInverse,
  },
  tagline: {
    ...typography.bodyLarge,
    color: colors.textInverseMuted,
    marginTop: spacing.xs,
  },
  formCard: {
    margin: spacing.lg,
    marginTop: 0,
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
    backgroundColor: colors.glassFillStrong,
    color: colors.text,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
});
