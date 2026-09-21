import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, glowShadow, radius, spacing, typography } from '../constants/theme';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * The one deliberate use of the brand gradient as a content surface (not
 * just buttons/headers) — reserved for the single most important number on
 * a screen, so it reads as a highlight rather than decoration. Now carries a
 * colored glow shadow (glowShadow) so it reads as lit-from-within, floating
 * above the atmosphere with real depth, plus a soft scale+fade entrance.
 */
export function HeroStat({ label, value, caption }: { label: string; value: string; caption?: string }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, glowShadow, animatedStyle]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </AnimatedGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  label: {
    ...typography.label,
    color: 'rgba(255,255,255,0.8)',
  },
  value: {
    ...typography.display,
    color: '#FFFFFF',
    marginTop: spacing.xs,
  },
  caption: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
});
