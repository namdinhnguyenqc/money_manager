import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../theme';

export default function SurfaceCard({ children, style, tone = 'lowest' }) {
  const bg = tone === 'high' ? COLORS.surfaceHigh : tone === 'low' ? COLORS.surfaceLow : COLORS.surfaceLowest;
  return <View style={[styles.base, Platform.OS === 'web' && styles.baseWeb, { backgroundColor: bg }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.sm,
  },
  baseWeb: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
});
