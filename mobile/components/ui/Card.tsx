/**
 * TrọCare Mobile — Bento Card Component
 * Matching web-admin's bento-card style with border-radius 16px and premium shadow.
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
    shadowColor: Colors.shadowBento,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 3,
  },
  border: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
});
