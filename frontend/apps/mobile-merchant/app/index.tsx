import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../lib/authContext';

// Held for at least this long so the splash reads as a deliberate brand
// moment rather than a flicker — even when auth state resolves instantly
// (e.g. no stored session to check).
const MIN_SPLASH_MS = 1600;

export default function SplashRoute() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Our first frame is ready — hand off from the native splash right now
    // so there's no gap between the two.
    SplashScreen.hideAsync().catch(() => {});

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && minTimeElapsed) {
      router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/login');
    }
  }, [isLoading, minTimeElapsed, isAuthenticated, router]);

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.brandBlock, { opacity, transform: [{ scale }] }]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>B</Text>
        </View>
        <Text style={styles.wordmark}>Buildora</Text>
      </Animated.View>
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Build once. Sell everywhere.
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  brandBlock: {
    alignItems: 'center',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badgeText: {
    ...typography.display,
    fontSize: 34,
    color: '#FFFFFF',
  },
  wordmark: {
    ...typography.display,
    fontSize: 34,
    color: '#FFFFFF',
  },
  tagline: {
    ...typography.bodyLarge,
    color: 'rgba(255,255,255,0.85)',
    position: 'absolute',
    bottom: spacing.xxl,
  },
});
