/**
 * TrọCare Mobile — Invoices List Screen
 * Lists all invoices with filter tabs, status badges, and "Thu tiền" action.
 * Matches web-admin invoice page behavior including partial invoice handling.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, Modal, Pressable,
} from 'react-native';
import { useFocusEffect, useRouter, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import DataErrorState from '@/components/ui/DataErrorState';
import { ListItemSkeleton } from '@/components/ui/Skeleton';
import { apiGet, getAccessToken } from '@/lib/api';
import { loadPendingBilling } from '@/lib/rentalOps';
import { logPerfEvent } from '@/lib/telemetry/appPerformance';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Config from '@/constants/Config';

const formatMoney = (value?: number | null) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)))} ₫`;

type FilterTab = 'all' | 'unpaid' | 'paid' | 'overdue' | 'draft';
const TABS: Array<{ key: FilterTab; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unpaid', label: 'Chưa thu' },
  { key: 'paid', label: 'Đã thu' },
  { key: 'overdue', label: 'Quá hạn' },
  { key: 'draft', label: 'Bản nháp' },
];

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

function isInvoiceBeforePeriod(invoice: any, period: { month: number; year: number }): boolean {
  const invoiceYear = Number(invoice.year || 0);
  const invoiceMonth = Number(invoice.month || 0);
  return invoiceYear < period.year || (invoiceYear === period.year && invoiceMonth < period.month);
}

function isInvoiceBeforeCurrentMonth(invoice: any): boolean {
  const today = new Date();
  return isInvoiceBeforePeriod(invoice, { month: today.getMonth() + 1, year: today.getFullYear() });
}

function isInvoiceUnpaid(invoice: any): boolean {
  const total = Math.round(Number(invoice.total_amount || 0));
  const paid = Math.round(Number(invoice.paid_amount || 0));
  return total > 0 && paid < total;
}

function getDisplayInvoiceStatus(invoice: any, period: { month: number; year: number }): string {
  if ((isInvoiceBeforePeriod(invoice, period) || isInvoiceBeforeCurrentMonth(invoice)) && isInvoiceUnpaid(invoice)) return 'overdue';
  return normalizeInvoiceStatus(invoice);
}

function matchesStatus(invoice: any, filter: FilterTab, period: { month: number; year: number }): boolean {
  if (filter === 'all') return true;
  const status = getDisplayInvoiceStatus(invoice, period);
  if (filter === 'paid') return status === 'paid';
  if (filter === 'unpaid') return status === 'sent' || status === 'partial';
  if (filter === 'overdue') return status === 'overdue';
  if (filter === 'draft') return status === 'draft';
  return false;
}

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const today = new Date();
    return { month: today.getMonth() + 1, year: today.getFullYear() };
  });

  const exportInvoicesToExcelMobile = async (months: string, selectedPeriodLabel: string) => {
    try {
      setExporting(true);
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const url = `${Config.API_URL}/invoices/export-excel?months=${encodeURIComponent(months)}`;
      const filename = `Hoa_don_${selectedPeriodLabel.replace(/[\/\s]/g, '_')}.xlsx`;
      if (!FileSystem.documentDirectory) {
        throw new Error('Thiết bị không có thư mục lưu tệp khả dụng.');
      }
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
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
      setExporting(false);
    }
  };

  const handleExcelExportOptions = () => {
    setShowExportOptions(true);
  };

  const exportPeriod = (range: 1 | 3 | 6) => {
    setShowExportOptions(false);
    const periods = Array.from({ length: range }, (_, index) => {
      const date = new Date(selectedPeriod.year, selectedPeriod.month - 1 - index, 1);
      return `${date.getMonth() + 1}/${date.getFullYear()}`;
    });
    const label = range === 1
      ? `Tháng_${selectedPeriod.month}_${selectedPeriod.year}`
      : `Bao_cao_${range}_thang`;
    exportInvoicesToExcelMobile(periods.join(','), label);
  };

  const fetchData = useCallback(async (forceRefresh = false) => {
    const tab = "invoices";
    logPerfEvent("SECONDARY_DATA_START", { tab, forceRefresh, month: selectedPeriod.month, year: selectedPeriod.year });
    try {
      setLoadError('');
      const [res, pending] = await Promise.all([
        apiGet<any>(`/invoices?month=${selectedPeriod.month}&year=${selectedPeriod.year}&includeOverdueCarryover=true`, { forceRefresh }),
        loadPendingBilling(selectedPeriod.month, selectedPeriod.year),
      ]);
      const items = res?.data ?? [];
      setInvoices(items);
      setPendingCount(pending?.length ?? 0);
      logPerfEvent("TAB_DATA_READY_INVOICES", { success: true, itemCount: items.length, pendingCount: pending?.length ?? 0 });
      logPerfEvent("SECONDARY_DATA_READY", { tab, success: true });
    } catch (e: any) {
      console.error('Failed to load invoices or pending count:', e);
      setLoadError(e?.message || 'Không thể tải danh sách hóa đơn.');
      logPerfEvent("TAB_DATA_READY_INVOICES", { success: false, message: String(e?.message || e) });
      logPerfEvent("SECONDARY_DATA_READY", { tab, success: false });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod.month, selectedPeriod.year]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = () => { setRefreshing(true); fetchData(true); };

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

  const periodInvoices = useMemo(() => invoices.filter((i) => {
    const matchPeriod = Number(i.month) === selectedPeriod.month && Number(i.year) === selectedPeriod.year;
    const carriedOverOverdue = isInvoiceBeforePeriod(i, selectedPeriod) && isInvoiceUnpaid(i);
    return matchPeriod || carriedOverOverdue;
  }), [invoices, selectedPeriod]);
  const filterCounts = useMemo(() => TABS.reduce((counts, tab) => ({
    ...counts,
    [tab.key]: periodInvoices.filter((invoice) => matchesStatus(invoice, tab.key, selectedPeriod)).length,
  }), {} as Record<FilterTab, number>), [periodInvoices, selectedPeriod]);
  const filtered = useMemo(
    () => periodInvoices.filter((invoice) => matchesStatus(invoice, activeTab, selectedPeriod)),
    [periodInvoices, activeTab, selectedPeriod],
  );
  const overdueCarryCount = useMemo(
    () => invoices.filter((i) => isInvoiceBeforePeriod(i, selectedPeriod) && isInvoiceUnpaid(i)).length,
    [invoices, selectedPeriod],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {[1,2,3,4,5].map(i => <ListItemSkeleton key={i} />)}
      </View>
    );
  }

  if (loadError && invoices.length === 0) {
    return (
      <View style={styles.container}>
        <Tabs.Screen options={{ headerShown: true, title: 'Quản lý hóa đơn' }} />
        <DataErrorState message={loadError} onRetry={() => fetchData(true)} />
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
          headerRight: () => null,
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
          style={[styles.exportBtn, exporting && styles.controlDisabled]}
          onPress={handleExcelExportOptions}
          disabled={exporting}
          activeOpacity={0.7}
        >
          <Ionicons name={exporting ? 'hourglass-outline' : 'share-outline'} size={14} color={Colors.primary} />
          <Text style={styles.exportBtnText}>{exporting ? 'Đang xuất' : 'Xuất Excel'}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContent}>
        {[TABS.slice(0, 3), TABS.slice(3)].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.tabRow}>
            {row.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityLabel={`${tab.label}, ${filterCounts[tab.key]} hóa đơn`}
                accessibilityState={{ selected: activeTab === tab.key }}
              >
                <Text numberOfLines={1} style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabCountPill, activeTab === tab.key && styles.tabCountPillActive]}>
                  <Text style={[styles.tabCount, activeTab === tab.key && styles.tabCountActive]}>
                    {filterCounts[tab.key]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Bulk Invoice Entry */}
      <TouchableOpacity
        style={[styles.pendingBanner, pendingCount === 0 && styles.pendingBannerMuted, { shadowColor: Colors.primary }]}
        onPress={() => router.push({
          pathname: '/invoice/bulk',
          params: { month: selectedPeriod.month, year: selectedPeriod.year }
        })}
        activeOpacity={0.8}
      >
        <View style={styles.pendingBannerLeft}>
          <View style={[styles.pendingBadge, pendingCount === 0 && styles.pendingBadgeMuted]}>
            <Ionicons
              name={pendingCount > 0 ? 'alert-circle-outline' : 'receipt-outline'}
              size={16}
              color={pendingCount > 0 ? Colors.primary : Colors.textSecondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingBannerTitle}>
              {pendingCount > 0 ? `Có ${pendingCount} phòng chưa lập hóa đơn` : 'Lập hóa đơn hàng loạt'}
            </Text>
            <Text style={styles.pendingBannerSub}>
              {pendingCount > 0
                ? `Kỳ đóng tiền tháng ${selectedPeriod.month}/${selectedPeriod.year}`
                : `Kiểm tra phòng đủ điều kiện trong kỳ ${selectedPeriod.month}/${selectedPeriod.year}`}
            </Text>
          </View>
        </View>
        <View style={styles.pendingBannerAction}>
          <Text style={styles.pendingActionText}>{pendingCount > 0 ? 'Lập ngay' : 'Mở'}</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </TouchableOpacity>

      {overdueCarryCount > 0 && (
        <TouchableOpacity
          style={styles.overdueBanner}
          onPress={() => setActiveTab('overdue')}
          activeOpacity={0.8}
        >
          <View style={styles.overdueBannerIcon}>
            <Ionicons name="warning-outline" size={16} color={Colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overdueBannerTitle}>
              Có {overdueCarryCount} hóa đơn tháng trước chưa đóng
            </Text>
            <Text style={styles.overdueBannerSub}>
              Đã chuyển sang kỳ T{selectedPeriod.month}/{selectedPeriod.year} và đánh dấu trễ hạn.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.danger} />
        </TouchableOpacity>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        windowSize={7}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        onContentSizeChange={() => logPerfEvent("LIST_RENDER_DONE", { screen: "invoices", itemCount: filtered.length })}
        extraData={`${activeTab}-${selectedPeriod.month}-${selectedPeriod.year}-${overdueCarryCount}`}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="Không có hóa đơn" description="Chưa có hóa đơn nào trong bộ lọc này." />
        }
        renderItem={({ item }) => {
          const status = getDisplayInvoiceStatus(item, selectedPeriod);
          const total = Number(item.total_amount || 0);
          const paid = Number(item.paid_amount || 0);
          const remainingAmount = Math.max(0, total - paid);
          const showCollect = remainingAmount > 0
            && (status === 'sent' || status === 'overdue' || status === 'partial');
          const carriedOverOverdue = isInvoiceBeforePeriod(item, selectedPeriod) && isInvoiceUnpaid(item);
          const periodOverdue = !carriedOverOverdue && isInvoiceBeforeCurrentMonth(item) && isInvoiceUnpaid(item);

          return (
            <TouchableOpacity
              style={[styles.invoiceRow, (carriedOverOverdue || periodOverdue) && styles.invoiceRowOverdue]}
              onPress={() => router.push(`/invoice/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.roomName}>{item.room_name || 'Phòng'}</Text>
                <Text numberOfLines={1} style={styles.meta}>
                  T{item.month}/{item.year} · {item.tenant_name || 'Khách thuê'}
                </Text>
                {carriedOverOverdue ? (
                  <Text style={styles.overdueMeta}>
                    Chưa đóng, chuyển sang T{selectedPeriod.month}/{selectedPeriod.year}
                  </Text>
                ) : periodOverdue ? (
                  <Text style={styles.overdueMeta}>
                    Đã qua kỳ thanh toán, đang quá hạn
                  </Text>
                ) : null}
              </View>
              <View style={styles.rightCol}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.amount}>
                  {formatMoney(total)}
                </Text>
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

      <Modal visible={showExportOptions} transparent animationType="fade" onRequestClose={() => setShowExportOptions(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowExportOptions(false)}>
          <Pressable style={styles.exportModal} onPress={(event) => event.stopPropagation()}>
            <View style={styles.exportModalHeader}>
              <View>
                <Text style={styles.exportModalTitle}>Xuất báo cáo Excel</Text>
                <Text style={styles.exportModalSubtitle}>Chọn khoảng thời gian muốn xuất</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowExportOptions(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ExportOption label={`Tháng hiện tại (T${selectedPeriod.month}/${selectedPeriod.year})`} onPress={() => exportPeriod(1)} />
            <ExportOption label="3 tháng gần nhất" onPress={() => exportPeriod(3)} />
            <ExportOption label="6 tháng gần nhất" onPress={() => exportPeriod(6)} />
            <TouchableOpacity style={styles.cancelExportButton} onPress={() => setShowExportOptions(false)}>
              <Text style={styles.cancelExportText}>Hủy</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ExportOption({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.exportOption} onPress={onPress}>
      <Ionicons name="document-outline" size={20} color={Colors.primary} />
      <Text style={styles.exportOptionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
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
  controlDisabled: { opacity: 0.55 },
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
  tabContent: {
    gap: 7,
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  tabRow: { flexDirection: 'row', gap: 7 },
  tab: {
    flex: 1, minWidth: 0, minHeight: 38,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tabText: { flexShrink: 1, fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  tabCountPill: {
    minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0',
  },
  tabCountPillActive: { backgroundColor: Colors.primary },
  tabCount: { fontSize: 10, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary },
  tabCountActive: { color: Colors.textWhite },
  tabTextActive: { color: Colors.primary },
  list: { padding: 16, gap: 8, paddingBottom: 32 },
  invoiceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderLight, gap: 12,
  },
  invoiceRowOverdue: {
    borderColor: 'rgba(244, 63, 94, 0.28)',
    backgroundColor: '#FFF7F9',
  },
  roomName: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary, letterSpacing: -0.2 },
  meta: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 2 },
  overdueMeta: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.danger,
  },
  rightCol: { alignItems: 'flex-end', gap: 6, maxWidth: '48%', flexShrink: 1 },
  amount: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.3 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'flex-end' },
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
  pendingBannerMuted: {
    borderColor: Colors.borderLight,
    shadowOpacity: 0.04,
    elevation: 1,
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
  pendingBadgeMuted: {
    backgroundColor: '#F8FAFC',
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
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7F9',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  overdueBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueBannerTitle: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },
  overdueBannerSub: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  exportModal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  exportModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  exportModalTitle: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  exportModalSubtitle: { marginTop: 4, fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  exportOption: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: '#F8FAFC',
  },
  exportOptionText: { flex: 1, fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  cancelExportButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelExportText: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
});
