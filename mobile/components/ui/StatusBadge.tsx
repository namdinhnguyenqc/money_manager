/**
 * TrọCare Mobile — StatusBadge Component
 * Renders colored badges for room/invoice/contract/deposit statuses.
 * Maps Vietnamese labels matching web-admin's StatusBadge.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';

type StatusType = 'room' | 'invoice' | 'contract' | 'deposit';

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  style?: ViewStyle;
}

const LABELS: Record<string, Record<string, string>> = {
  room: {
    vacant: 'Trống',
    occupied: 'Đang thuê',
    maintenance: 'Bảo trì',
    reserved: 'Đã cọc',
    expiring_soon: 'Sắp hết HĐ',
    expired: 'Quá hạn HĐ',
    disabled: 'Ngưng SD',
  },
  invoice: {
    paid: 'Đã thanh toán',
    partial: 'Một phần',
    sent: 'Chưa thanh toán',
    overdue: 'Quá hạn',
    draft: 'Bản nháp',
  },
  contract: {
    active: 'Đang thuê',
    expiring_soon: 'Sắp hết HĐ',
    ended: 'Đã kết thúc',
    expired: 'Quá hạn',
  },
  deposit: {
    holding: 'Đang giữ',
    transferred: 'Đã chuyển',
    refunded: 'Đã hoàn',
    cancelled: 'Đã hủy',
  },
};

function getStatusColor(status: string): { bg: string; text: string; border: string } {
  const s = Colors.status as any;
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  const tokenKey = normalized === 'expiring_soon' ? 'expiringSoon' : normalized;
  return s[tokenKey] || s.draft || { bg: '#F8FAFC', text: Colors.textMuted, border: Colors.border };
}

export default function StatusBadge({ status, type = 'room', style }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  const label = LABELS[type]?.[normalized] || status;
  const color = getStatusColor(normalized);

  return (
    <View style={[styles.badge, { backgroundColor: color.bg, borderColor: color.border }, style]}>
      <View style={[styles.dot, { backgroundColor: color.text }]} />
      <Text style={[styles.text, { color: color.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    letterSpacing: 0.2,
  },
});
