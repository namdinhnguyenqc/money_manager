/**
 * TrọCare Mobile — Invoices List Screen
 * Lists all invoices with filter tabs, status badges, and "Thu tiền" action.
 * Matches web-admin invoice page behavior including partial invoice handling.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect, useRouter, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { ListItemSkeleton } from '@/components/ui/Skeleton';
import { apiGet, getAccessToken } from '@/lib/api';
import { loadPendingBilling } from '@/lib/rentalOps';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Config from '@/constants/Config';

const formatMoney = (value?: number | null) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)))} ₫`;

type FilterTab = 'Tất cả' | 'Đã gửi' | 'Đã thanh toán' | 'Quá hạn' | 'Chưa gửi';
const TABS: FilterTab[] = ['Tất cả', 'Đã gửi', 'Đã thanh toán', 'Quá hạn', 'Chưa gửi'];

function normalizeInvoiceStatus(invoice: any): string {
  const total = Math.round(Number(invoice.total_amount || 0));
  const paid = Math.round(Number(invoice.paid_amount || 0));
  if (total > 0 && paid >= total) return 'paid';
  if (paid > 0 && paid < total) return 'partial';
  const status = String(invoice.status || '').toLowerCase();
  if (status === 'overdue') return 'overdue';
  if (status === 'draft') return 'draft';
  return 'sent';
}

function matchesStatus(invoice: any, filter: FilterTab): boolean {
  if (filter === 'Tất cả') return true;
  const status = normalizeInvoiceStatus(invoice);
  if (filter === 'Đã thanh toán') return status === 'paid' || status === 'partial';
  if (filter === 'Đã gửi') return status === 'sent' || status === 'partial';
  if (filter === 'Quá hạn') return status === 'overdue';
  if (filter === 'Chưa gửi') return status === 'draft';
  return false;
}

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('Tất cả');
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const today = new Date();
    return { month: today.getMonth() + 1, year: today.getFullYear() };
  });

  const exportInvoicesToExcelMobile = async (months: string, selectedPeriodLabel: string) => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const url = `${Config.API_URL}/invoices/export-excel?months=${encodeURIComponent(months)}`;
      const filename = `Hoa_don_${selectedPeriodLabel.replace(/[\/\s]/g, '_')}.xlsx`;
      const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;

      const downloadRes = await (FileSystem as any).downloadAsync(url, fileUri, {
        headers
      });

      if (downloadRes.status !== 200) {
        throw new Error(`Server returned code ${downloadRes.status}`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Xuất hóa đơn ${selectedPeriodLabel}`,
          UTI: 'com.microsoft.excel.xlsx'
        });
      } else {
        Alert.alert('Chia sẻ', `Tải thành công. Tệp lưu tại: ${downloadRes.uri}`);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', `Xuất file Excel thất bại: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelExportOptions = () => {
    Alert.alert(
      'Xuất báo cáo Excel',
      'Chọn khoảng thời gian muốn xuất báo cáo:',
      [
        {
          text: `Tháng hiện tại (T${selectedPeriod.month}/${selectedPeriod.year})`,
          onPress: () => {
            const months = `${selectedPeriod.month}/${selectedPeriod.year}`;
            exportInvoicesToExcelMobile(months, `Tháng_${selectedPeriod.month}_${selectedPeriod.year}`);
          }
        },
        {
          text: '3 tháng gần nhất',
          onPress: () => {
            const p1 = `${selectedPeriod.month}/${selectedPeriod.year}`;
            const date2 = new Date(selectedPeriod.year, selectedPeriod.month - 2, 1);
            const p2 = `${date2.getMonth() + 1}/${date2.getFullYear()}`;
            const date3 = new Date(selectedPeriod.year, selectedPeriod.month - 3, 1);
            const p3 = `${date3.getMonth() + 1}/${date3.getFullYear()}`;
            
            const months = `${p1},${p2},${p3}`;
            exportInvoicesToExcelMobile(months, 'Bao_cao_3_thang');
          }
        },
        {
          text: '6 tháng gần nhất',
          onPress: () => {
            const list = [];
            for (let i = 0; i < 6; i++) {
              const d = new Date(selectedPeriod.year, selectedPeriod.month - 1 - i, 1);
              list.push(`${d.getMonth() + 1}/${d.getFullYear()}`);
            }
            exportInvoicesToExcelMobile(list.join(','), 'Bao_cao_6_thang');
          }
        },
        {
          text: 'Hủy',
          style: 'cancel'
        }
      ]
    );
  };

  const fetchData = useCallback(async () => {
    try {
      const [res, pending] = await Promise.all([
        apiGet<any>('/invoices'),
        loadPendingBilling(selectedPeriod.month, selectedPeriod.year),
      ]);
      setInvoices(res?.data ?? []);
      setPendingCount(pending?.length ?? 0);
    } catch (e) {
      console.error('Failed to load invoices or pending count:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod.month, selectedPeriod.year]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handlePrevMonth = () => {
    setSelectedPeriod((prev) => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      return { month: m, year: y };
    });
  };

  const handleNextMonth = () => {
    setSelectedPeriod((prev) => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      return { month: m, year: y };
    });
  };

  const filtered = invoices.filter((i) => {
    const matchPeriod = Number(i.month) === selectedPeriod.month && Number(i.year) === selectedPeriod.year;
    return matchPeriod && matchesStatus(i, activeTab);
  });

  if (loading) {
    return (
      <View style={styles.container}>
        {[1,2,3,4,5].map(i => <ListItemSkeleton key={i} />)}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerShown: true,
          title: 'Hóa đơn',
          headerTitle: 'Quản lý hóa đơn',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/invoice/bulk',
                params: { month: selectedPeriod.month, year: selectedPeriod.year }
              })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginRight: 16,
                backgroundColor: 'rgba(138, 63, 252, 0.08)',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: 'rgba(138, 63, 252, 0.15)',
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={14} color={Colors.primary} />
              <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.primary }}>
                Lập hàng loạt
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      {/* Period Picker Header */}
      <View style={styles.periodPicker}>
        <View style={styles.periodPickerLeft}>
          <TouchableOpacity style={styles.periodArrow} onPress={handlePrevMonth}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.periodTextContainer}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.periodText}>
              Tháng {selectedPeriod.month}, {selectedPeriod.year}
            </Text>
          </View>
          <TouchableOpacity style={styles.periodArrow} onPress={handleNextMonth}>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExcelExportOptions}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={14} color={Colors.primary} />
          <Text style={styles.exportBtnText}>Xuất Excel</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pending Invoices Banner */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={[styles.pendingBanner, { shadowColor: Colors.primary }]}
          onPress={() => router.push({
            pathname: '/invoice/bulk',
            params: { month: selectedPeriod.month, year: selectedPeriod.year }
          })}
          activeOpacity={0.8}
        >
          <View style={styles.pendingBannerLeft}>
            <View style={styles.pendingBadge}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingBannerTitle}>
                Có {pendingCount} phòng chưa lập hóa đơn
              </Text>
              <Text style={styles.pendingBannerSub}>
                Kỳ đóng tiền tháng {selectedPeriod.month}/{selectedPeriod.year}
              </Text>
            </View>
          </View>
          <View style={styles.pendingBannerAction}>
            <Text style={styles.pendingActionText}>Lập hàng loạt</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="Không có hóa đơn" description="Chưa có hóa đơn nào trong bộ lọc này." />
        }
        renderItem={({ item }) => {
          const status = normalizeInvoiceStatus(item);
          const total = Number(item.total_amount || 0);
          const paid = Number(item.paid_amount || 0);
          const showCollect = status === 'sent' || status === 'overdue' || status === 'partial';

          return (
            <TouchableOpacity
              style={styles.invoiceRow}
              onPress={() => router.push(`/invoice/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.roomName}>{item.room_name || 'Phòng'}</Text>
                <Text style={styles.meta}>
                  T{item.month}/{item.year} · {item.tenant_name || 'Khách thuê'}
                </Text>
              </View>
              <View style={styles.rightCol}>
                <Text style={styles.amount}>{formatMoney(total)}</Text>
                <View style={styles.actionsRow}>
                  <StatusBadge status={status} type="invoice" />
                  {showCollect && (
                    <TouchableOpacity
                      style={styles.collectBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        router.push(`/payment/new?invoice_id=${item.id}`);
                      }}
                    >
                      <Text style={styles.collectText}>Thu tiền</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  periodPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  periodPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(138, 63, 252, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(138, 63, 252, 0.15)',
  },
  exportBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  periodArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodText: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  tabScroll: { maxHeight: 50, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabContent: { paddingHorizontal: 16, gap: 6, alignItems: 'center', paddingVertical: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  list: { padding: 16, gap: 8, paddingBottom: 32 },
  invoiceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderLight, gap: 12,
  },
  roomName: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary, letterSpacing: -0.2 },
  meta: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.3 },
  actionsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  collectBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryAlpha20,
  },
  collectText: { fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: Colors.primary },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(138, 63, 252, 0.15)', // Glowing royal amethyst outline
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pendingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pendingBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(138, 63, 252, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBannerTitle: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  pendingBannerSub: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 1,
  },
  pendingBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(138, 63, 252, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pendingActionText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
});
