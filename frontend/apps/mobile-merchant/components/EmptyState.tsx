import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, radius, spacing, typography } from '../constants/theme';

// These render directly on the shared dark atmosphere (AppBackground), not
// inside a Card, so text uses the "inverse" (light) tokens and the icon
// badge is its own small glass circle rather than a flat light-blue chip.
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <Ionicons name={icon} size={26} color="#FFFFFF" style={{ opacity: 0.95 }} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, styles.iconCircleDanger]}>
        <Ionicons name="alert-circle-outline" size={26} color="#FCA5A5" />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  iconCircleDanger: {
    backgroundColor: 'rgba(220, 38, 38, 0.22)',
    borderColor: 'rgba(252, 165, 165, 0.4)',
  },
  title: {
    ...typography.h2,
    color: colors.textInverse,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textInverseMuted,
    textAlign: 'center',
  },
});
