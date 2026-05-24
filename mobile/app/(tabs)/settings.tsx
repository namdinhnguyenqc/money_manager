/**
 * TrọCare Mobile — Premium Settings Screen (Redesigned & Consolidated)
 * Designed in compliance with Ethereal Alabaster & Porcelain standard guidelines.
 * Ultra-soft card configurations (borderRadius: 24), amethyst highlights,
 * beautifully grouped compartments, and a luxurious profile header.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { loadProfile } from '@/lib/profile';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile().then(setProfile).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* 👑 Premium Profile Card */}
      <View style={[styles.porcelainCard, styles.profileCard, { shadowColor: '#8A3FFC' }]}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{profile?.fullName || user?.email || 'Chủ trọ TrọCare'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {profile?.phone && <Text style={styles.profilePhone}>📱 {profile.phone}</Text>}
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push('/profile' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={16} color="#8A3FFC" />
        </TouchableOpacity>
      </View>

      {/* 🏢 Section 1: Operations Suite */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quản lý vận hành trọ</Text>
        <View style={[styles.porcelainCard, styles.menuGroup]}>
          <MenuItem icon="people-outline" label="Khách thuê phòng" color="#8A3FFC" bg="rgba(138, 63, 252, 0.08)" onPress={() => router.push('/tenants' as any)} />
          <View style={styles.divider} />
          <MenuItem icon="wallet-outline" label="Ví & Tài khoản thanh toán" color="#0D9488" bg="rgba(13, 148, 136, 0.08)" onPress={() => router.push('/wallets' as any)} />
          <View style={styles.divider} />
          <MenuItem icon="receipt-outline" label="Quản lý hóa đơn" color="#EAB308" bg="rgba(234, 179, 8, 0.08)" onPress={() => router.push('/invoices' as any)} />
          <View style={styles.divider} />
          <MenuItem icon="copy-outline" label="Lập hóa đơn hàng loạt" color="#8A3FFC" bg="rgba(138, 63, 252, 0.08)" onPress={() => router.push('/invoice/bulk' as any)} />
          <View style={styles.divider} />
          <MenuItem icon="list-outline" label="Bảng giá dịch vụ trọ" color="#06B6D4" bg="rgba(6, 182, 212, 0.08)" onPress={() => router.push('/services' as any)} />
          <View style={styles.divider} />
          <MenuItem icon="cash-outline" label="Tiền đặt cọc phòng" color="#0D9488" bg="rgba(13, 148, 136, 0.08)" onPress={() => router.push('/deposit' as any)} />
        </View>
      </View>

      {/* 📈 Section 2: Business Ledger */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Kinh doanh & Nhật ký</Text>
        <View style={[styles.porcelainCard, styles.menuGroup]}>
          <MenuItem icon="trending-up-outline" label="Kinh doanh hàng hóa/dịch vụ" color="#C084FC" bg="rgba(192, 132, 252, 0.08)" onPress={() => router.push('/trading' as any)} />
          <View style={styles.divider} />
          <MenuItem icon="document-text-outline" label="Nhật ký thao tác hệ thống" color="#94A3B8" bg="rgba(148, 163, 184, 0.08)" onPress={() => router.push('/audit-logs' as any)} />
        </View>
      </View>

      {/* 🔍 Section 3: Utilities */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Khám phá dịch vụ</Text>
        <View style={[styles.porcelainCard, styles.menuGroup]}>
          <MenuItem icon="search-outline" label="Marketplace phòng trống" color="#3b82f6" bg="rgba(59, 130, 246, 0.08)" onPress={() => router.push('/marketplace' as any)} />
          <View style={styles.divider} />
          <MenuItem icon="chatbubbles-outline" label="Hộp thư tin nhắn" color="#10b981" bg="rgba(16, 185, 129, 0.08)" onPress={() => router.push('/messages' as any)} />
          <View style={styles.divider} />
          <MenuItem icon="calendar-outline" label="Đặt lịch xem phòng" color="#f43f5e" bg="rgba(244, 63, 94, 0.08)" onPress={() => router.push('/bookings' as any)} />
          <View style={styles.divider} />
          <MenuItem icon="notifications-outline" label="Thông báo hệ thống" color="#EAB308" bg="rgba(234, 179, 8, 0.08)" onPress={() => router.push('/notifications' as any)} />
        </View>
      </View>

      {/* ⚙️ Section 4: Accounts */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Cấu hình & Bảo mật</Text>
        <View style={[styles.porcelainCard, styles.menuGroup]}>
          <MenuItem icon="shield-checkmark-outline" label="Bảo mật tài khoản" color="#64748B" bg="rgba(100, 116, 139, 0.08)" onPress={() => Alert.alert('Bảo mật', 'Tính năng đổi mật khẩu & cấu hình 2FA đang được phát triển.')} />
          <View style={styles.divider} />
          <MenuItem icon="help-circle-outline" label="Trung tâm hỗ trợ" color="#64748B" bg="rgba(100, 116, 139, 0.08)" onPress={() => Alert.alert('Hỗ trợ', 'Vui lòng liên hệ support@trocare.vn hoặc gọi hotline 1900 xxxx.')} />
          <View style={styles.divider} />
          <MenuItem icon="log-out-outline" label="Đăng xuất khỏi hệ thống" color="#F43F5E" bg="rgba(244, 63, 94, 0.08)" onPress={handleLogout} danger />
        </View>
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon, label, color, bg, onPress, danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: '#F43F5E', fontFamily: Typography.fontFamily.bold }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F6' },
  scroll: { padding: 16, paddingBottom: 110, gap: 16 },

  /* Premium Alabaster Porcelain Cards */
  porcelainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Ultra-soft rounded corners
    borderWidth: 1,
    borderColor: '#EAEAEF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#8A3FFC', // Brand purple
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8A3FFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  profileName: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    marginTop: 1,
  },
  profilePhone: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
    marginTop: 2,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  menuGroup: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: '#334155',
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F4F4F6',
    marginHorizontal: 8,
  },
});
