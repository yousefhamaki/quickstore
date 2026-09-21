import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { statusColors } from '../constants/theme';

export function StatusBadge({ status }: { status: string }) {
  const palette = statusColors[status] || { bg: '#E2E8F0', text: '#334155' };
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]}>
        {status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
