import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors, radius, shadow, spacing } from '../constants/theme';

/**
 * Frosted glass panel — the app's one shared content surface. Every screen
 * (existing and new) gets the "layered glass with depth" treatment for free
 * by using this instead of a flat fill: a real blur of whatever's behind it
 * (the atmosphere from AppBackground, or another Card), a light glass tint
 * on top for legibility, a soft hairline border, and a deep soft shadow for
 * elevation.
 *
 * `delay` staggers a fade+rise entrance animation — pass `index * motion.stagger`
 * from a list to get a staggered-card-entrance feel (Part 1's "motion" ask).
 */
export function Card({
  children,
  style,
  delay = 0,
  intensity = 34,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  intensity?: number;
  padded?: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, shadow, animatedStyle, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[styles.tint, padded && styles.padded]}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  tint: {
    backgroundColor: colors.glassFill,
  },
  padded: {
    padding: spacing.md,
  },
});
