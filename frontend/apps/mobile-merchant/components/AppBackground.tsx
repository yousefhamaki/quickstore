import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../constants/theme';

/**
 * The shared atmosphere every screen sits on top of — mounted ONCE at the
 * root (app/_layout.tsx), absolutely positioned behind the whole app, so
 * every screen (including new ones) inherits it automatically instead of
 * each screen painting its own flat background.
 *
 * Layering (bottom to top), the "layered glass with depth" recipe:
 *  1. A dark, diagonal brand-adjacent gradient (bgTop -> bgMid -> bgBottom)
 *     — this replaces the old flat light-gray page background.
 *  2. Two solid, oversized brand-color "blobs" (blue + purple).
 *  3. A full-bleed BlurView on top of the blobs, which softens their hard
 *     edges into glow — the "blurred color blobs bleeding through" look.
 * Frosted glass Cards (components/Card.tsx) then float above all of this,
 * blurring it further where they sit, which is what gives the app real
 * z-depth instead of everything being flat.
 */
export function AppBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[colors.bgTop, colors.bgMid, colors.bgBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, styles.blobBlue]} />
      <View style={[styles.blob, styles.blobPurple]} />
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} experimentalBlurMethod="dimezisBlurView" />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
