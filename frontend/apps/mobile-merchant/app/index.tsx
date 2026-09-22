import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../constants/theme';
import { useAuth } from '../lib/authContext';

// Held for at least this long so the splash reads as a deliberate brand
// moment rather than a flicker — even when auth state resolves instantly
// (e.g. no stored session to check).
const MIN_SPLASH_MS = 1800;
const EXIT_FADE_MS = 320;

export default function SplashRoute() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Entrance
  const badgeOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0.5);
  const badgeRotate = useSharedValue(-16);
  const glow = useSharedValue(0.35);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslate = useSharedValue(10);
  const taglineOpacity = useSharedValue(0);

  // Ambient background drift (same palette as AppBackground.tsx, so the
  // splash reads as the same "layered glass" world as the rest of the app
  // instead of a disconnected flat-gradient placeholder).
  const blobBlue = useSharedValue(0);
  const blobPurple = useSharedValue(0);

  // Whole-screen exit fade, so the handoff into login/dashboard is a
  // dissolve rather than a hard cut.
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // Our first frame is ready — hand off from the native splash right now
    // so there's no gap between the two.
    SplashScreen.hideAsync().catch(() => {});

    badgeOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    badgeScale.value = withSpring(1, { damping: 11, stiffness: 140 });
    badgeRotate.value = withSpring(0, { damping: 11, stiffness: 140 });
    // A slow breathing glow behind the badge, starting once the entrance
    // spring has mostly settled.
    glow.value = withDelay(500, withRepeat(withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true));

    wordmarkOpacity.value = withDelay(200, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    wordmarkTranslate.value = withDelay(200, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));

    taglineOpacity.value = withDelay(550, withTiming(1, { duration: 420 }));

    // Slow, subtle drift — not a loud animation, just enough that the
    // background doesn't feel like a static screenshot.
    blobBlue.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);
    blobPurple.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true);

    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && minTimeElapsed && !exiting) {
      setExiting(true);
      const destination = isAuthenticated ? '/(tabs)' : '/(auth)/login';
      screenOpacity.value = withTiming(0, { duration: EXIT_FADE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(router.replace)(destination);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, minTimeElapsed, isAuthenticated]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }, { rotate: `${badgeRotate.value}deg` }],
    shadowOpacity: glow.value,
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkTranslate.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const blobBlueStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: blobBlue.value * 18 },
      { translateY: blobBlue.value * -14 },
      { scale: 1 + blobBlue.value * 0.08 },
    ],
  }));
  const blobPurpleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: blobPurple.value * -16 },
      { translateY: blobPurple.value * 12 },
      { scale: 1 + blobPurple.value * 0.06 },
    ],
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <LinearGradient
        colors={[colors.bgTop, colors.bgMid, colors.bgBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.blob, styles.blobBlue, blobBlueStyle]} />
      <Animated.View style={[styles.blob, styles.blobPurple, blobPurpleStyle]} />

      <View style={styles.brandBlock}>
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>B</Text>
        </Animated.View>
        <Animated.Text style={[styles.wordmark, wordmarkStyle]}>Buildora</Animated.Text>
      </View>
      <Animated.Text style={[styles.tagline, taglineStyle]}>Build once. Sell everywhere.</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgBottom,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobBlue: {
    width: 340,
    height: 340,
    top: -80,
    right: -90,
    backgroundColor: colors.glowBlue,
  },
  blobPurple: {
    width: 420,
    height: 420,
    bottom: -140,
    left: -120,
    backgroundColor: colors.glowPurple,
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
    shadowColor: '#FFFFFF',
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
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
