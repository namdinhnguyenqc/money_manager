/**
 * TrọCare Mobile — Invoices List Screen
 * Lists all invoices with filter tabs, status badges, and "Thu tiền" action.
 * Matches web-admin invoice page behavior including partial invoice handling.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, Modal, Pressable, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import DataErrorState from '@/components/ui/DataErrorState';
import { ListItemSkeleton } from '@/components/ui/Skeleton';
import { apiGet, apiPost, getAccessToken, getPersistentApiCache } from '@/lib/api';
import { useAppToast } from '@/components/ui/ToastProvider';
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
  const { showToast, showSuccess } = useAppToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [selectingForZalo, setSelectingForZalo] = useState(false);
  const [zaloSending, setZaloSending] = useState(false);
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
      const invoicePath = `/invoices?month=${selectedPeriod.month}&year=${selectedPeriod.year}&includeOverdueCarryover=true`;
      if (!forceRefresh) {
        const cached = await getPersistentApiCache<any>(invoicePath, 24 * 60 * 60 * 1000);
        if (cached?.data) {
          setInvoices(cached.data);
          setLoading(false);
          logPerfEvent('TAB_DATA_READY_INVOICES', { success: true, source: 'persistent-cache', itemCount: cached.data.length });
        }
      }
      const [res, pending] = await Promise.all([
        apiGet<any>(invoicePath, { forceRefresh, persistCache: true }),
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

  const exitZaloSelection = () => {
    setSelectingForZalo(false);
    setSelectedInvoiceIds([]);
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds((current) => current.includes(invoiceId)
      ? current.filter((id) => id !== invoiceId)
      : [...current, invoiceId]);
  };

  const sendInvoicesViaZalo = async (invoiceIds: string[]) => {
    if (!invoiceIds.length || zaloSending) return;
    setZaloSending(true);
    try {
      // The bulk endpoint validates each invoice independently: paid invoices
      // are skipped and a bad phone/Zalo account never stops the whole batch.
      const response = await apiPost<any>('/api/invoices/send-zalo-bulk?mode=sync', { invoiceIds }, { timeoutMs: 120000 });
      const summary = response?.data ?? response;
      const sent = summary?.sent?.length ?? 0;
      const paidSkipped = summary?.paidSkipped?.length ?? 0;
      const missingPhone = summary?.missingPhone ?? [];
      const zaloNotFound = summary?.zaloNotFound ?? [];
      const failed = summary?.failed ?? [];
      const unresolved = [...missingPhone, ...zaloNotFound, ...failed];
      const headline = `Đã chọn ${invoiceIds.length} • Gửi thành công ${sent} • Đã thanh toán bỏ qua ${paidSkipped} • Thiếu SĐT ${missingPhone.length} • Chưa gửi được ${zaloNotFound.length + failed.length}`;

      if (sent > 0) showSuccess(headline, 'Đã gửi qua Zalo');
      else showToast(headline, 'warning', 'Chưa gửi được hóa đơn nào');

      if (unresolved.length) {
        const details = unresolved.slice(0, 8).map((item: any) => `${item.roomName || 'Phòng'} · ${item.tenantName || 'Khách thuê'}${item.reason ? `: ${item.reason}` : ''}`).join('\n');
        Alert.alert('Cần xử lý trước khi gửi lại', `${headline}\n\n${details}${unresolved.length > 8 ? `\n… và ${unresolved.length - 8} hóa đơn khác` : ''}`);
      }
      exitZaloSelection();
    } catch (error: any) {
      showToast(error?.message || 'Không gửi được hóa đơn. Kiểm tra kết nối Zalo rồi thử lại.', 'error', 'Gửi Zalo thất bại');
    } finally {
      setZaloSending(false);
    }
  };

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
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerZaloButton}
              onPress={() => selectingForZalo ? exitZaloSelection() : setSelectingForZalo(true)}
              disabled={zaloSending}
            >
              <Ionicons name={selectingForZalo ? 'close-outline' : 'logo-wechat'} size={18} color={Colors.primary} />
              <Text style={styles.headerZaloButtonText}>{selectingForZalo ? 'Hủy' : 'Gửi Zalo'}</Text>
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
          style={[styles.exportBtn, exporting && styles.controlDisabled]}
          onPress={handleExcelExportOptions}
          disabled={exporting}
          activeOpacity={0.7}
        >
          <Ionicons name={exporting ? 'hourglass-outline' : 'share-outline'} size={14} color={Colors.primary} />
          <Text style={styles.exportBtnText}>{exporting ? 'Đang xuất' : 'Xuất Excel'}</Text>
        </TouchableOpacity>
      </View>

      {/* A single horizontal filter row keeps the list above the fold. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map((tab) => (
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
      </ScrollView>

      {/* Only surface this task when there are rooms that still need an invoice. */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={styles.pendingBanner}
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
              <Text style={styles.pendingBannerTitle}>Có {pendingCount} phòng chưa lập hóa đơn</Text>
              <Text style={styles.pendingBannerSub}>Kỳ đóng tiền tháng {selectedPeriod.month}/{selectedPeriod.year}</Text>
            </View>
          </View>
          <View style={styles.pendingBannerAction}>
            <Text style={styles.pendingActionText}>Lập ngay</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </View>
        </TouchableOpacity>
      )}

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

      {selectingForZalo && (
        <View style={styles.zaloSelectionBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.zaloSelectionTitle}>Chọn hóa đơn cần gửi</Text>
            <Text style={styles.zaloSelectionCopy}>Hóa đơn đã thanh toán sẽ tự bỏ qua.</Text>
          </View>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={() => setSelectedInvoiceIds(selectedInvoiceIds.length === filtered.length ? [] : filtered.map((item) => item.id))}
          >
            <Text style={styles.selectAllText}>{selectedInvoiceIds.length === filtered.length ? 'Bỏ chọn' : 'Chọn tất cả'}</Text>
          </TouchableOpacity>
        </View>
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
          const carriedOverOverdue = isInvoiceBeforePeriod(item, selectedPeriod) && isInvoiceUnpaid(item);
          const periodOverdue = !carriedOverOverdue && isInvoiceBeforeCurrentMonth(item) && isInvoiceUnpaid(item);
          const isSelected = selectedInvoiceIds.includes(item.id);

          return (
            <TouchableOpacity
              style={[styles.invoiceRow, (carriedOverOverdue || periodOverdue) && styles.invoiceRowOverdue, isSelected && styles.invoiceRowSelected]}
              onPress={() => selectingForZalo ? toggleInvoiceSelection(item.id) : router.push(`/invoice/${item.id}`)}
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
                <View style={styles.statusLine}>
                  <StatusBadge status={status} type="invoice" />
                  {selectingForZalo && <View style={[styles.selectionCheckbox, isSelected && styles.selectionCheckboxActive]}>{isSelected && <Ionicons name="checkmark" size={14} color={Colors.textWhite} />}</View>}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {selectingForZalo && (
        <View style={styles.zaloActionFooter}>
          <Text style={styles.zaloActionCount}>Đã chọn {selectedInvoiceIds.length}</Text>
          <TouchableOpacity
            style={[styles.sendZaloBulkButton, (!selectedInvoiceIds.length || zaloSending) && styles.controlDisabled]}
            disabled={!selectedInvoiceIds.length || zaloSending}
            onPress={() => sendInvoicesViaZalo(selectedInvoiceIds)}
          >
            <Ionicons name={zaloSending ? 'hourglass-outline' : 'send'} size={16} color={Colors.textWhite} />
            <Text style={styles.sendZaloBulkText}>{zaloSending ? 'Đang gửi…' : 'Gửi qua Zalo'}</Text>
          </TouchableOpacity>
        </View>
      )}

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
    paddingVertical: 9,
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
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryAlpha20,
  },
  exportBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  controlDisabled: { opacity: 0.55 },
  headerZaloButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 12, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: Colors.primaryLight },
  headerZaloButtonText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.primary },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  tabScroll: { flexGrow: 0, height: 56, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab: {
    minHeight: 36,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18,
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
  list: { padding: 16, gap: 9, paddingBottom: 32 },
  invoiceRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.surface, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderLight, gap: 12,
  },
  invoiceRowOverdue: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF7F9',
  },
  invoiceRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
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
  statusLine: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'flex-end' },
  selectionCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  selectionCheckboxActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  zaloSelectionBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.primaryAlpha20, backgroundColor: Colors.primaryLight },
  zaloSelectionTitle: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  zaloSelectionCopy: { marginTop: 2, fontSize: 11, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  selectAllButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primaryAlpha20 },
  selectAllText: { fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: Colors.primary },
  zaloActionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 18, borderTopWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.surface },
  zaloActionCount: { flex: 1, fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  sendZaloBulkButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, borderRadius: 11, backgroundColor: Colors.primary },
  sendZaloBulkText: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.textWhite },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    elevation: 0,
  },
  pendingBannerMuted: {
    borderColor: Colors.borderLight,
    elevation: 0,
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
    backgroundColor: Colors.primaryLight,
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
    backgroundColor: Colors.primaryLight,
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
    borderColor: '#FECACA',
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
