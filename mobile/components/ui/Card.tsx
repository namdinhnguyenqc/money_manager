/**
 * TrọCare Mobile — grouped surface component.
 * Flat by default so financial data, not decoration, owns the hierarchy.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import Colors from '@/constants/Colors';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  noBorder?: boolean;
}

export default function Card({ children, onPress, style, padding = 16, noBorder = false }: CardProps) {
  const cardStyle = [
    styles.card,
    !noBorder && styles.border,
    { padding },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  border: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
});
