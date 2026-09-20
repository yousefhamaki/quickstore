import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

/**
 * The one deliberate use of the brand gradient as a content surface (not
 * just buttons/headers) — reserved for the single most important number on
 * a screen, so it reads as a highlight rather than decoration.
 */
export function HeroStat({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow,
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
