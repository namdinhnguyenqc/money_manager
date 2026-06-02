/**
 * TrọCare Tenant Mobile — Dashboard / Home Tab
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

export default function TenantDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [profileRes, dashboardRes] = await Promise.all([
        apiGet<any>('/tenant/me'),
        apiGet<any>('/tenant/dashboard'),
      ]);
      setProfileData(profileRes?.data ?? profileRes);
      setDashboardData(dashboardRes?.data ?? dashboardRes);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  const roomInfo = profileData?.contract?.room;
  const houseInfo = roomInfo?.boardingHouse;
  const contractInfo = profileData?.contract;
  const latestInvoice = dashboardData?.latestInvoice;

  const hasElecReadings = latestInvoice?.elec_new !== undefined && latestInvoice?.elec_new !== null && latestInvoice?.elec_old !== undefined && latestInvoice?.elec_old !== null;
  const elecConsumption = hasElecReadings
    ? latestInvoice.elec_new - latestInvoice.elec_old
    : null;

  const hasWaterReadings = latestInvoice?.water_new !== undefined && latestInvoice?.water_new !== null && latestInvoice?.water_old !== undefined && latestInvoice?.water_old !== null;
  const waterConsumption = hasWaterReadings
    ? latestInvoice.water_new - latestInvoice.water_old
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      
      {/* 🏡 Welcome Greeting Banner */}
      <View style={styles.welcomeBanner}>
        <View>
          <Text style={styles.greeting}>Xin chào, 👋</Text>
          <Text style={styles.tenantName}>{profileData?.name || user?.name || 'Khách thuê'}</Text>
        </View>
        <TouchableOpacity
          style={styles.roomTag}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <Text style={styles.roomTagText}>
            {roomInfo ? `Phòng ${roomInfo.name}` : 'Chưa liên kết phòng'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🏡 Clickable Room & Contract Card */}
      {roomInfo && (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.85}
          style={{ marginBottom: 16 }}
        >
          <Card style={styles.houseCard}>
            <View style={styles.houseRow}>
              <View style={styles.houseIconBox}>
                <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.houseName}>Hợp đồng phòng {roomInfo.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 11.5, color: Colors.primary, fontFamily: Typography.fontFamily.semibold }}>Xem chi tiết</Text>
                    <Ionicons name="chevron-forward" size={12} color={Colors.primary} />
                  </View>
                </View>
                <Text style={styles.houseAddress}>
                  {houseInfo?.name || 'N/A'} • {houseInfo?.address || 'N/A'}
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      )}

      {/* 📊 KPI Cards Bento Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiRow}>
          
          <Card style={styles.kpiItem}>
            <View style={[styles.kpiIcon, { backgroundColor: 'rgba(244, 63, 94, 0.08)' }]}>
              <Ionicons name="card" size={20} color={Colors.danger} />
            </View>
            <Text style={styles.kpiLabel}>Hóa đơn chờ trả</Text>
            <Text style={[styles.kpiValue, { color: Colors.danger }]}>
              {dashboardData?.unpaidInvoiceCount || 0}
            </Text>
            <Text style={styles.kpiSubtext}>
              Tổng: {formatMoney(dashboardData?.unpaidInvoiceAmount || 0)}
            </Text>
          </Card>

          <Card style={styles.kpiItem}>
            <View style={[styles.kpiIcon, { backgroundColor: 'rgba(0, 113, 227, 0.08)' }]}>
              <Ionicons name="wallet" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.kpiLabel}>Chi tiêu tháng này</Text>
            <Text style={[styles.kpiValue, { color: Colors.primary }]}>
              {formatMoney(dashboardData?.monthlyPersonalExpense || 0)}
            </Text>
            <Text style={styles.kpiSubtext}>Sổ chi tiêu cá nhân</Text>
          </Card>

        </View>
      </View>

      {/* ⚡ Utilities consumption cards */}
      {latestInvoice && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Điện nước tháng này</Text>
          <View style={styles.kpiRow}>
            
            <Card style={styles.utilityItem}>
              <View style={styles.utilityHeader}>
                <Ionicons name="flash" size={20} color="#EAB308" />
                <Text style={styles.utilityTitle}>Chỉ số Điện</Text>
              </View>
              <Text style={styles.utilityValue}>
                {elecConsumption !== null ? `${elecConsumption} kWh` : 'Chưa cập nhật'}
              </Text>
              <Text style={styles.utilitySub}>
                {latestInvoice.elec_old} → {latestInvoice.elec_new !== null && latestInvoice.elec_new !== undefined ? `${latestInvoice.elec_new} kWh` : 'Đang cập nhật'}
              </Text>
            </Card>

            <Card style={styles.utilityItem}>
              <View style={styles.utilityHeader}>
                <Ionicons name="water" size={20} color="#0071e3" />
                <Text style={styles.utilityTitle}>Chỉ số Nước</Text>
              </View>
              <Text style={styles.utilityValue}>
                {waterConsumption !== null ? `${waterConsumption} m³` : 'Chưa cập nhật'}
              </Text>
              <Text style={styles.utilitySub}>
                {latestInvoice.water_old} → {latestInvoice.water_new !== null && latestInvoice.water_new !== undefined ? `${latestInvoice.water_new} m³` : 'Đang cập nhật'}
              </Text>
            </Card>

          </View>
        </View>
      )}

      {/* 📋 Latest Invoice details card */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Hóa đơn gần nhất</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/invoices')}>
            <Text style={styles.viewAllText}>Tất cả</Text>
          </TouchableOpacity>
        </View>

        {latestInvoice ? (
          <Card style={styles.invoiceCard}>
            <TouchableOpacity onPress={() => router.push(`/invoice/${latestInvoice.id}`)}>
              <View style={styles.invoiceRowHeader}>
                <View>
                  <Text style={styles.invoiceMonth}>Hóa đơn tháng {latestInvoice.month}/{latestInvoice.year}</Text>
                  <Text style={styles.invoiceIdText}>Mã: {latestInvoice.payment_code || latestInvoice.id.slice(0, 8).toUpperCase()}</Text>
                </View>
                <StatusBadge status={latestInvoice.status} type="invoice" />
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.invoicePriceRow}>
                <Text style={styles.priceLabel}>Tổng tiền hóa đơn:</Text>
                <Text style={styles.invoicePrice}>{formatMoney(latestInvoice.total_amount)}</Text>
              </View>

              {latestInvoice.status !== 'paid' && (
                <View style={styles.actionRow}>
                  <Text style={styles.dueText}>
                    Còn thiếu: {formatMoney(Number(latestInvoice.total_amount) - Number(latestInvoice.paid_amount))}
                  </Text>
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => router.push(`/invoice/${latestInvoice.id}`)}
                  >
                    <Text style={styles.payBtnText}>Xem & Thanh toán</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Bạn chưa có hóa đơn nào từ chủ trọ.</Text>
          </Card>
        )}
      </View>

      {/* 📊 Simple visual personal expense overview */}
      <View style={[styles.sectionContainer, { marginBottom: 90 }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Nhật ký chi tiêu cá nhân</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/finance')}>
            <Text style={styles.viewAllText}>Chi tiết</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.financeCard}>
          <View style={styles.financeStats}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Tiền phòng</Text>
              <Text style={styles.statValue}>{roomInfo ? formatMoney(roomInfo.price) : '0đ'}/tháng</Text>
            </View>
            <View style={styles.statVerticalDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Chi tiêu khác</Text>
              <Text style={styles.statValue}>
                {formatMoney(dashboardData?.monthlyPersonalExpense || 0)}
              </Text>
            </View>
          </View>
        </Card>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6', // Matte Snow White backing
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F6',
  },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  tenantName: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  roomTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 113, 227, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 113, 227, 0.15)',
  },
  roomTagText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  houseCard: {
    marginBottom: 16,
    padding: 14,
  },
  houseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  houseIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 113, 227, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseName: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  houseAddress: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 2,
  },
  kpiGrid: {
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiItem: {
    flex: 1,
    padding: 16,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.extrabold,
    marginTop: 4,
  },
  kpiSubtext: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionContainer: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
  utilityItem: {
    flex: 1,
    padding: 14,
  },
  utilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  utilityTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: '#0F172A',
  },
  utilityValue: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#0F172A',
  },
  utilitySub: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    marginTop: 4,
  },
  invoiceCard: {
    padding: 16,
  },
  invoiceRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceMonth: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  invoiceIdText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEF',
    marginVertical: 12,
  },
  invoicePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  invoicePrice: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extrabold,
    color: '#0F172A',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.8,
    borderTopColor: '#EAEAEF',
  },
  dueText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.danger,
  },
  payBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  payBtnText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textAlign: 'center',
  },
  financeCard: {
    padding: 16,
  },
  financeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginTop: 4,
  },
  statVerticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#EAEAEF',
  },
});
