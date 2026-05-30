/**
 * TrọCare Tenant Mobile — Profile Tab
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function ProfileTab() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const res = await apiGet<any>('/tenant/me');
      setProfileData(res?.data ?? res);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?', [
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

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace(/\s/g, '');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const contract = profileData?.contract;
  const room = contract?.room;
  const services = contract?.appliedServices || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      
      {/* 👤 Premium User Info Card */}
      <Card style={styles.userCard}>
        <View style={styles.userRow}>
          <View style={styles.avatarGlow}>
            <Ionicons name="person" size={28} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{profileData?.name || user?.name}</Text>
            <Text style={styles.userPhone}>{profileData?.phone || user?.phone}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Khách thuê trọ</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* 📄 Contract Summary */}
      {contract ? (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Thông tin hợp đồng thuê</Text>
          <Card style={styles.contractCard}>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <StatusBadge status={contract.status} type="contract" />
            </View>

            <View style={styles.separator} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã phòng</Text>
              <Text style={styles.infoValue}>{room?.name || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nhà trọ</Text>
              <Text style={styles.infoValue}>{room?.boardingHouse?.name || 'N/A'}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiền phòng/tháng</Text>
              <Text style={[styles.infoValue, { fontFamily: Typography.fontFamily.bold, color: Colors.primary }]}>
                {formatMoney(contract.rentAmount)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiền đặt cọc</Text>
              <Text style={styles.infoValue}>{formatMoney(contract.deposit)}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày bắt đầu</Text>
              <Text style={styles.infoValue}>{contract.startDate}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày hết hạn</Text>
              <Text style={styles.infoValue}>{contract.endDate || 'Vô thời hạn'}</Text>
            </View>

          </Card>
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Bạn hiện chưa có hợp đồng thuê phòng trọ nào được kích hoạt.</Text>
        </Card>
      )}

      {/* 🛠️ Applied Services List */}
      {services.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Các dịch vụ đăng ký</Text>
          <Card style={styles.servicesCard}>
            {services.map((srv: any, idx: number) => {
              const unitLabel = srv.unit === 'kwh' ? 'kWh' : srv.unit === 'm3' ? 'm³' : srv.unit;
              const calcLabel = srv.calculation_type === 'metered' ? 'Số điện nước' : 'Cố định';
              return (
                <View key={srv.id || idx}>
                  <View style={styles.srvRow}>
                    <View style={styles.srvLeft}>
                      <Ionicons name="settings-outline" size={16} color={Colors.primary} />
                      <View>
                        <Text style={styles.srvName}>{srv.name}</Text>
                        <Text style={styles.srvCalc}>{calcLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.srvPrice}>
                      {formatMoney(srv.unit_price)}/{unitLabel}
                    </Text>
                  </View>
                  {idx < services.length - 1 && <View style={styles.separator} />}
                </View>
              );
            })}
          </Card>
        </View>
      )}

      {/* 🔴 Control Button */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.btnLogoutText}>Đăng xuất khỏi tài khoản</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90, // safe tabs bottom dock padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F6',
  },
  userCard: {
    padding: 20,
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarGlow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 113, 227, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 113, 227, 0.15)',
  },
  userName: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  userPhone: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(13, 148, 136, 0.2)',
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.success,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 10,
    paddingLeft: 4,
  },
  contractCard: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.semibold,
    color: '#0F17 slate',
  },
  separator: {
    height: 0.8,
    backgroundColor: '#EAEAEF',
    marginVertical: 8,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textAlign: 'center',
  },
  servicesCard: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  srvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  srvLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  srvName: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  srvCalc: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    marginTop: 1,
  },
  srvPrice: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#334155',
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  btnLogoutText: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },
});
