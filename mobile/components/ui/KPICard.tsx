/**
 * TrọCare Mobile — KPI Card Component
 * Dashboard stat display card with icon, value, label, and optional trend.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  color?: string;
  style?: ViewStyle;
}

export default function KPICard({ label, value, icon, trend, color = Colors.primary, style }: KPICardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            {icon}
          </View>
        )}
        {trend && (
          <View style={[styles.trend, { backgroundColor: trend.positive ? Colors.successLight : Colors.dangerLight }]}>
            <Text style={[styles.trendText, { color: trend.positive ? Colors.successDark : Colors.danger }]}>
              {trend.value}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.shadowBento,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trend: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  trendText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
  },
  value: {
    fontSize: 28,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    letterSpacing: -0.1,
  },
});
