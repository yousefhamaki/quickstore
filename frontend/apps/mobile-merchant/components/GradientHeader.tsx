import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, spacing, typography } from '../constants/theme';

/**
 * Redesigned as a transparent header rather than a flat gradient rectangle —
 * it now sits directly on the shared atmosphere (AppBackground), which
 * already bleeds the brand blue/purple glow through behind it. That's the
 * "richer" use of the brand gradient the redesign calls for (glow, not flat
 * fills) while keeping every screen's call site (`title`/`subtitle`) unchanged.
 */
export function GradientHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top + spacing.lg }, animatedStyle]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.display,
    fontSize: 26,
    color: colors.textInverse,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textInverseMuted,
    marginTop: spacing.xs,
  },
});
