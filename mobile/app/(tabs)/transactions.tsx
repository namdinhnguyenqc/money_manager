import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
} from 'react-native';
import { Tabs, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import {
  deleteTransaction,
  formatMoney,
  loadTransactions,
  loadWallets,
  loadBoardingHouses,
} from '@/lib/rentalOps';
import { apiGet } from '@/lib/api';
import { logPerfEvent } from '@/lib/telemetry/appPerformance';

type TxTypeFilter = 'all' | 'income' | 'expense';
type DateFilter = 'all' | 'today' | '7d' | 'month' | 'custom';
type SortBy = 'newest' | 'oldest' | 'amount_asc' | 'amount_desc';

const dateFilters: Array<{ value: DateFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: 'month', label: 'Tháng này' },
  { value: 'custom', label: 'Tùy chọn...' },
];

const typeFilters: Array<{ value: TxTypeFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'income', label: 'Khoản thu' },
  { value: 'expense', label: 'Khoản chi' },
];

const sortFilters: Array<{ value: SortBy; label: string }> = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'amount_asc', label: 'Số tiền tăng dần' },
  { value: 'amount_desc', label: 'Số tiền giảm dần' },
];

function parseTxDate(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIsoDate(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  const date = new Date(y, m, d);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? date : null;
}

function localDateKey(value?: string | null) {
  const date = parseTxDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatGroupDate(dateKey: string) {
  const todayKey = localDateKey(new Date().toISOString());
  const yesterdayKey = localDateKey(addDays(new Date(), -1).toISOString());
  if (dateKey === todayKey) return 'Hôm nay';
  if (dateKey === yesterdayKey) return 'Hôm qua';
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

function formatDetailDate(value?: string | null) {
  const date = parseTxDate(value);
  if (!date) return 'Không có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(value?.includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function transactionSourceLabel(source?: string | null) {
  if (source === 'sepay') return 'SePay tự động';
  if (source === 'bank_transfer') return 'Chuyển khoản';
  if (source === 'cash') return 'Tiền mặt';
  return 'Ghi nhận thủ công';
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { walletId, walletName } = useLocalSearchParams<{ walletId?: string; walletName?: string }>();
  
  // Data States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [boardingHouses, setBoardingHouses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  // Filter & Sort States
  const [activeWalletId, setActiveWalletId] = useState<string | null>(walletId || null);
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });
  const [selectedBhId, setSelectedBhId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  // UI States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deletingTx, setDeletingTx] = useState<any | null>(null);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async (isRef = false) => {
    const tab = "transactions";
    logPerfEvent("SECONDARY_DATA_START", { tab, forceRefresh: isRef, walletId: activeWalletId || null });
    try {
      if (isRef) setRefreshing(true);
      // Returning to this tab should retain its usable ledger instead of
      // replacing it with a full-screen loader. A mutation clears API cache,
      // while explicit pull-to-refresh remains available for an immediate read.
      else if (!hasLoadedRef.current) setLoading(true);

      // Start filter-only requests in parallel, but never block the ledger UI on them.
      const supplementalDataPromise = Promise.all([
        loadBoardingHouses({ forceRefresh: isRef }).catch(() => null),
        apiGet<any>('/rental/rooms', { forceRefresh: isRef }).catch(() => null),
        apiGet<any>('/invoices', { forceRefresh: isRef }).catch(() => null),
        apiGet<any>('/rental/contracts', { forceRefresh: isRef }).catch(() => null),
      ]);

      // Transactions and wallets are the only data required for the first useful paint.
      const [txList, walletList] = await Promise.all([
        loadTransactions(activeWalletId || undefined, { forceRefresh: isRef }),
        loadWallets({ forceRefresh: isRef }),
      ]);

      setTransactions(txList);
      setWallets(walletList);
      setLoading(false);
      setRefreshing(false);
      logPerfEvent("TAB_DATA_READY_TRANSACTIONS", {
        success: true,
        itemCount: txList.length,
        wallets: walletList.length,
      });
      logPerfEvent("SECONDARY_DATA_READY", { tab, success: true });

      // Enrich the filter sheet after the main content is already interactive.
      const [bhList, roomsRes, invRes, conRes] = await supplementalDataPromise;
      setBoardingHouses(bhList ?? []);
      setRooms(roomsRes?.data ?? []);
      setInvoices(invRes?.data ?? []);
      setContracts(conRes?.data ?? []);
      logPerfEvent("TRANSACTIONS_FILTER_DATA_READY", { facilities: (bhList ?? []).length });
    } catch (e: any) {
      setToast({ message: e?.message || 'Không tải được sổ quỹ.', type: 'error' });
      logPerfEvent("TAB_DATA_READY_TRANSACTIONS", { success: false, message: String(e?.message || e) });
      logPerfEvent("SECONDARY_DATA_READY", { tab, success: false });
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeWalletId]);

  useEffect(() => {
    setActiveWalletId(walletId || null);
  }, [walletId]);

  useFocusEffect(
    useCallback(() => {
      fetchData(false);
    }, [fetchData])
  );

  const filtered = useMemo(() => {
    let result = [...transactions];

    // 1. Filter by Type
    if (typeFilter !== 'all') {
      result = result.filter((tx) => tx.type === typeFilter);
    }

    // 2. Filter by Date range
    if (dateFilter === 'today') {
      const todayStr = localDateKey(new Date().toISOString());
      result = result.filter((tx) => localDateKey(tx.date) === todayStr);
    } else if (dateFilter === '7d') {
      const today = startOfToday();
      const sevenDaysAgo = addDays(today, -6);
      result = result.filter((tx) => {
        const d = parseTxDate(tx.date);
        return d ? d >= sevenDaysAgo && d <= today : false;
      });
    } else if (dateFilter === 'month') {
      const today = new Date();
      result = result.filter((tx) => {
        const d = parseTxDate(tx.date);
        return d ? d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() : false;
      });
    } else if (dateFilter === 'custom' && customDate.start && customDate.end) {
      const start = parseIsoDate(customDate.start);
      const end = parseIsoDate(customDate.end);
      if (start && end) {
        result = result.filter((tx) => {
          const d = parseTxDate(tx.date);
          return d ? d >= start && d <= end : false;
        });
      }
    }

    // 3. Filter by Boarding House
    if (selectedBhId && selectedBhId !== 'all') {
      const bhRooms = rooms.filter(
        (r: any) => String(r.boarding_house_id || r.boardingHouseId) === String(selectedBhId)
      );
      const roomIds = new Set(bhRooms.map((r: any) => r.id));
      result = result.filter((tx) => {
        const txBhId = tx.metadata?.boarding_house_id
          ?? tx.metadata?.boardingHouseId
          ?? tx.boarding_house_id
          ?? tx.boardingHouseId
          ?? tx.facility_id
          ?? tx.facilityId;
        if (txBhId && String(txBhId) === String(selectedBhId)) return true;
        if (tx.invoice_id) {
          const inv = invoices.find((i: any) => i.id === tx.invoice_id);
          if (inv && roomIds.has(inv.room_id)) return true;
        }
        if (tx.contract_id) {
          const con = contracts.find((c: any) => c.id === tx.contract_id);
          if (con && roomIds.has(con.room_id)) return true;
        }
        return bhRooms.some((r: any) => String(tx.description || '').includes(r.name));
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      const dateA = parseTxDate(a.date) || new Date(0);
      const dateB = parseTxDate(b.date) || new Date(0);
      const amountA = Number(a.amount || 0);
      const amountB = Number(b.amount || 0);

      if (sortBy === 'newest') {
        return dateB.getTime() - dateA.getTime();
      } else if (sortBy === 'oldest') {
        return dateA.getTime() - dateB.getTime();
      } else if (sortBy === 'amount_asc') {
        return amountA - amountB;
      } else if (sortBy === 'amount_desc') {
        return amountB - amountA;
      }
      return 0;
    });

    return result;
  }, [transactions, typeFilter, dateFilter, customDate, selectedBhId, sortBy, rooms, invoices, contracts]);

  const metrics = useMemo(() => {
    return filtered.reduce(
      (acc, tx) => {
        const amount = Math.round(Number(tx.amount || 0));
        if (tx.type === 'income') acc.income += amount;
        if (tx.type === 'expense') acc.expense += amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [filtered]);

  const totalBalance = useMemo(
    () => wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0),
    [wallets]
  );
  const netFlow = metrics.income - metrics.expense;
  const activeWallet = wallets.find((wallet) => wallet.id === activeWalletId);
  const activeWalletLabel = activeWallet?.name || (activeWalletId ? walletName : 'Tất cả ví');

  const groupedTransactions = useMemo(() => {
    const groups: Record<
      string,
      { key: string; title: string; items: any[]; income: number; expense: number }
    > = {};

    filtered.forEach((tx) => {
      const key = localDateKey(tx.date);
      if (!key) return;
      if (!groups[key]) {
        groups[key] = { key, title: formatGroupDate(key), items: [], income: 0, expense: 0 };
      }
      groups[key].items.push(tx);
      const amount = Math.round(Number(tx.amount || 0));
      if (tx.type === 'income') groups[key].income += amount;
      if (tx.type === 'expense') groups[key].expense += amount;
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => groups[key]);
  }, [filtered]);

  const confirmDelete = async () => {
    if (!deletingTx) return;
    try {
      setActionLoading(true);
      await deleteTransaction(deletingTx.id);
      setDeletingTx(null);
      setToast({ message: 'Đã xóa giao dịch.', type: 'success' });
      fetchData(true);
    } catch (e: any) {
      setToast({ message: e?.message || 'Không thể xóa giao dịch.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Tabs.Screen options={{ title: 'Thu/Chi', headerTitle: 'Sổ quỹ thu chi' }} />

      {/* Financial summary aligned with Home */}
      <View style={styles.summaryBand}>
        <View style={styles.balanceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Số dư khả dụng</Text>
            <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.66}>
              {formatMoney(totalBalance)}
            </Text>
            <Text style={styles.balanceMeta} numberOfLines={1}>
              {activeWalletLabel}
            </Text>
          </View>
        </View>

        <View style={styles.metricSection}>
          <View style={styles.metricRow}>
            <MetricCell label="Tổng thu" value={`+${formatMoney(metrics.income)}`} color={Colors.success} />
            <View style={styles.metricDivider} />
            <MetricCell label="Tổng chi" value={`-${formatMoney(metrics.expense)}`} color={Colors.danger} />
          </View>
          <View style={styles.netMetricRow}>
            <Text style={styles.netMetricLabel}>Chênh lệch kỳ này</Text>
            <Text
              style={[styles.netMetricValue, { color: netFlow >= 0 ? Colors.success : Colors.danger }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {`${netFlow >= 0 ? '+' : ''}${formatMoney(netFlow)}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Scrollable active filters display bar */}
      <View style={styles.activeFiltersRow}>
        <ScrollView
          horizontal
          style={styles.activeFiltersViewport}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersScroll}
        >
          {typeFilter !== 'all' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>
                {typeFilter === 'income' ? 'Khoản thu' : 'Khoản chi'}
              </Text>
              <TouchableOpacity onPress={() => setTypeFilter('all')}>
                <Ionicons name="close-circle" size={13} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {dateFilter !== 'all' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>
                {dateFilter === 'today'
                  ? 'Hôm nay'
                  : dateFilter === '7d'
                  ? '7 ngày'
                  : dateFilter === 'month'
                  ? 'Tháng này'
                  : 'Tùy chọn'}
              </Text>
              <TouchableOpacity onPress={() => setDateFilter('all')}>
                <Ionicons name="close-circle" size={13} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {selectedBhId !== 'all' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText} numberOfLines={1}>
                {boardingHouses.find((h) => h.id === selectedBhId)?.name || 'Dãy trọ'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedBhId('all')}>
                <Ionicons name="close-circle" size={13} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {sortBy !== 'newest' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>
                {sortBy === 'oldest'
                  ? 'Cũ nhất'
                  : sortBy === 'amount_asc'
                  ? 'Số tiền tăng'
                  : 'Số tiền giảm'}
              </Text>
              <TouchableOpacity onPress={() => setSortBy('newest')}>
                <Ionicons name="close-circle" size={13} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Mở bộ lọc giao dịch"
        >
          <Ionicons name="options-outline" size={17} color={Colors.primary} />
          <Text style={styles.filterButtonText}>Bộ lọc</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải sổ quỹ...</Text>
        </View>
      ) : (
        <FlatList
          data={groupedTransactions}
          keyExtractor={(item) => item.key}
          initialNumToRender={8}
          windowSize={7}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
          onContentSizeChange={() => logPerfEvent("LIST_RENDER_DONE", { screen: "transactions", groupCount: groupedTransactions.length, itemCount: filtered.length })}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={Colors.primary} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={42} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Không tìm thấy giao dịch nào</Text>
              <Text style={styles.emptyDesc}>Hãy chỉnh sửa bộ lọc hoặc lập một phiếu thu/chi mới.</Text>
              <Button
                title="Ghi thu chi"
                size="sm"
                onPress={() => router.push('/transactions/new')}
                style={{ marginTop: 14 }}
              />
            </View>
          }
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupTotal}>
                  {group.income > 0 ? `+${formatMoney(group.income)}` : ''}
                  {group.income > 0 && group.expense > 0 ? '  ' : ''}
                  {group.expense > 0 ? `-${formatMoney(group.expense)}` : ''}
                </Text>
              </View>

              <View style={styles.txPanel}>
                {group.items.map((item, index) => {
                  const isIncome = item.type === 'income';
                  const color = isIncome ? Colors.success : Colors.danger;
                  return (
                    <View key={item.id}>
                      <TouchableOpacity
                        style={styles.txRow}
                        activeOpacity={0.72}
                        onPress={() => setSelectedTx(item)}
                        onLongPress={() => setDeletingTx(item)}
                      >
                        <View
                          style={[
                            styles.txIcon,
                            { backgroundColor: isIncome ? Colors.successLight : Colors.dangerLight },
                          ]}
                        >
                          <Ionicons
                            name={isIncome ? 'arrow-down-outline' : 'arrow-up-outline'}
                            size={16}
                            color={color}
                          />
                        </View>
                        <View style={styles.txContent}>
                          <Text style={styles.txDesc} numberOfLines={1}>
                            {item.description || (isIncome ? 'Khoản thu' : 'Khoản chi')}
                          </Text>
                          <Text style={styles.txMeta} numberOfLines={1}>
                            {item.wallet_name || 'Ví quỹ'}
                            {item.category_name ? ` · ${item.category_name}` : ''}
                          </Text>
                        </View>
                        <View style={styles.txRight}>
                          <Text style={[styles.txAmount, { color }]}>
                            {isIncome ? '+' : '-'}
                            {formatMoney(item.amount)}
                          </Text>
                          <TouchableOpacity
                            style={styles.trashBtn}
                            onPress={() => setDeletingTx(item)}
                          >
                            <Ionicons name="trash-outline" size={14} color={Colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                      {index < group.items.length - 1 ? <View style={styles.separator} /> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => router.push('/transactions/new')}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Tạo phiếu thu chi"
      >
        <Ionicons name="create-outline" size={19} color={Colors.textWhite} />
        <Text style={styles.floatingAddLabel}>Ghi thu chi</Text>
      </TouchableOpacity>

      {/* FILTER & SORT MODAL */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc & Sắp xếp</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Type Filter */}
              <Text style={styles.modalSectionLabel}>Loại giao dịch</Text>
              <View style={styles.modalOptionsRow}>
                {typeFilters.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.modalOptionBtn, typeFilter === t.value && styles.modalOptionBtnActive]}
                    onPress={() => setTypeFilter(t.value)}
                  >
                    <Text
                      style={[styles.modalOptionText, typeFilter === t.value && styles.modalOptionTextActive]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Time Period Filter */}
              <Text style={styles.modalSectionLabel}>Thời gian</Text>
              <View style={styles.modalOptionsRow}>
                {dateFilters.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.modalOptionBtn, dateFilter === d.value && styles.modalOptionBtnActive]}
                    onPress={() => setDateFilter(d.value)}
                  >
                    <Text
                      style={[styles.modalOptionText, dateFilter === d.value && styles.modalOptionTextActive]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Date selection inputs */}
              {dateFilter === 'custom' && (
                <View style={styles.customDateContainer}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateInputLabel}>Từ ngày</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      value={customDate.start}
                      onChangeText={(txt) => setCustomDate({ ...customDate, start: txt })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dateInputLabel}>Đến ngày</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      value={customDate.end}
                      onChangeText={(txt) => setCustomDate({ ...customDate, end: txt })}
                    />
                  </View>
                  {(customDate.start && !parseIsoDate(customDate.start)) || (customDate.end && !parseIsoDate(customDate.end)) ? (
                    <Text style={styles.dateError}>Ngày cần có định dạng YYYY-MM-DD, ví dụ 2026-07-18.</Text>
                  ) : null}
                </View>
              )}

              {/* Boarding House Filter */}
              {boardingHouses.length > 0 && (
                <>
                  <Text style={styles.modalSectionLabel}>Theo Dãy trọ</Text>
                  <View style={styles.modalOptionsRow}>
                    <TouchableOpacity
                      style={[styles.modalOptionBtn, selectedBhId === 'all' && styles.modalOptionBtnActive]}
                      onPress={() => setSelectedBhId('all')}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selectedBhId === 'all' && styles.modalOptionTextActive,
                        ]}
                      >
                        Tất cả dãy
                      </Text>
                    </TouchableOpacity>
                    {boardingHouses.map((bh) => (
                      <TouchableOpacity
                        key={bh.id}
                        style={[styles.modalOptionBtn, selectedBhId === bh.id && styles.modalOptionBtnActive]}
                        onPress={() => setSelectedBhId(bh.id)}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            selectedBhId === bh.id && styles.modalOptionTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {bh.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Wallets selection inside modal */}
              {wallets.length > 0 && (
                <>
                  <Text style={styles.modalSectionLabel}>Theo ví quỹ</Text>
                  <View style={styles.modalOptionsRow}>
                    <TouchableOpacity
                      style={[styles.modalOptionBtn, !activeWalletId && styles.modalOptionBtnActive]}
                      onPress={() => setActiveWalletId(null)}
                    >
                      <Text
                        style={[styles.modalOptionText, !activeWalletId && styles.modalOptionTextActive]}
                      >
                        Tất cả ví
                      </Text>
                    </TouchableOpacity>
                    {wallets.map((w) => (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.modalOptionBtn, activeWalletId === w.id && styles.modalOptionBtnActive]}
                        onPress={() => setActiveWalletId(w.id)}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            activeWalletId === w.id && styles.modalOptionTextActive,
                          ]}
                        >
                          {w.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Sort filter */}
              <Text style={styles.modalSectionLabel}>Sắp xếp</Text>
              <View style={styles.modalOptionsRow}>
                {sortFilters.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.modalOptionBtn, sortBy === s.value && styles.modalOptionBtnActive]}
                    onPress={() => setSortBy(s.value)}
                  >
                    <Text style={[styles.modalOptionText, sortBy === s.value && styles.modalOptionTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={() => {
                  setTypeFilter('all');
                  setDateFilter('month');
                  setCustomDate({ start: '', end: '' });
                  setSelectedBhId('all');
                  setActiveWalletId(null);
                  setSortBy('newest');
                }}
              >
                <Text style={styles.modalResetBtnText}>Thiết lập lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalApplyBtnText}>Xong</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!deletingTx}
        title="Xóa giao dịch"
        message={`Xóa giao dịch ${deletingTx?.description || ''} trị giá ${formatMoney(
          deletingTx?.amount
        )}? Số dư ví sẽ được cập nhật lại.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingTx(null)}
        loading={actionLoading}
      />

      {/* TRANSACTION DETAILS MODAL */}
      <Modal
        visible={!!selectedTx}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết giao dịch</Text>
              <TouchableOpacity onPress={() => setSelectedTx(null)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
              {/* Styled amount badge */}
              <View style={styles.detailAmountWrapper}>
                <View
                  style={[
                    styles.detailIconCircle,
                    { backgroundColor: selectedTx?.type === 'income' ? Colors.successLight : Colors.dangerLight },
                  ]}
                >
                  <Ionicons
                    name={selectedTx?.type === 'income' ? 'arrow-down-outline' : 'arrow-up-outline'}
                    size={28}
                    color={selectedTx?.type === 'income' ? Colors.success : Colors.danger}
                  />
                </View>
                <Text style={[styles.detailAmountText, { color: selectedTx?.type === 'income' ? Colors.success : Colors.danger }]}>
                  {selectedTx?.type === 'income' ? '+' : '-'}
                  {formatMoney(selectedTx?.amount)}
                </Text>
                <Text style={styles.detailStatusLabel}>
                  {selectedTx?.type === 'income' ? 'Khoản thu thực tế' : 'Khoản chi thực tế'}
                </Text>
              </View>

              {/* Grid rows */}
              <View style={styles.detailsList}>
                <View style={[styles.detailRowItem, { alignItems: 'flex-start' }]}>
                  <Text style={styles.detailItemLabel}>Nội dung</Text>
                  <Text style={[styles.detailItemValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={4}>
                    {selectedTx?.description || (selectedTx?.type === 'income' ? 'Khoản thu' : 'Khoản chi')}
                  </Text>
                </View>

                <View style={styles.detailRowItem}>
                  <Text style={styles.detailItemLabel}>Thời gian</Text>
                  <Text style={[styles.detailItemValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>
                    {formatDetailDate(selectedTx?.date)}
                  </Text>
                </View>

                <View style={styles.detailRowItem}>
                  <Text style={styles.detailItemLabel}>Ví quỹ tài khoản</Text>
                  <Text style={[styles.detailItemValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={2}>
                    {selectedTx?.wallet_name || 'Ví quỹ'}
                  </Text>
                </View>

                {selectedTx?.category_name ? (
                  <View style={styles.detailRowItem}>
                    <Text style={styles.detailItemLabel}>Danh mục</Text>
                    <Text style={[styles.detailItemValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={2}>
                      {selectedTx.category_name}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.detailRowItem}>
                  <Text style={styles.detailItemLabel}>Nguồn ghi nhận</Text>
                  <Text style={[styles.detailItemValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>
                    {transactionSourceLabel(selectedTx?.source)}
                  </Text>
                </View>

                <View style={styles.detailRowItem}>
                  <Text style={styles.detailItemLabel}>Mã giao dịch</Text>
                  <Text
                    style={[styles.detailItemValue, styles.detailCode]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    selectable
                  >
                    {selectedTx?.external_ref || selectedTx?.id || 'Không có dữ liệu'}
                  </Text>
                </View>

                {selectedTx?.created_at ? (
                  <View style={styles.detailRowItem}>
                    <Text style={styles.detailItemLabel}>Thời điểm tạo</Text>
                    <Text style={[styles.detailItemValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>
                      {formatDetailDate(selectedTx.created_at)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.detailFooter}>
              <TouchableOpacity
                style={styles.detailDeleteBtn}
                onPress={() => {
                  const tx = selectedTx;
                  setSelectedTx(null);
                  setDeletingTx(tx);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <Text style={styles.detailDeleteBtnText}>Xóa giao dịch</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.detailCloseBtn}
                onPress={() => setSelectedTx(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.detailCloseBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast visible={!!toast} message={toast?.message || ''} type={toast?.type} onDismiss={() => setToast(null)} />
    </SafeAreaView>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  summaryBand: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: Typography.fontFamily.extrabold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  balanceMeta: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterButton: {
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 113, 227, 0.12)',
  },
  filterButtonText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  metricSection: {
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  metricCell: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
    backgroundColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Typography.fontFamily.extrabold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  netMetricRow: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  netMetricLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  netMetricValue: {
    width: '100%',
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 23,
    fontFamily: Typography.fontFamily.extrabold,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
    borderBottomWidth: 0,
  },
  activeFiltersViewport: {
    flex: 1,
  },
  activeFiltersScroll: {
    gap: 8,
    alignItems: 'center',
  },
  floatingAddButton: {
    position: 'absolute',
    right: 20,
    bottom: 18,
    minWidth: 128,
    height: 48,
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  floatingAddLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textWhite,
    letterSpacing: -0.15,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryAlpha20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeChipText: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 104, gap: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 56, gap: 8 },
  emptyTitle: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  emptyDesc: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  group: { gap: 10 },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  groupTotal: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  txPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContent: { flex: 1, gap: 2 },
  txDesc: { fontSize: 13.5, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  txMeta: { fontSize: 11, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txAmount: { fontSize: 14, fontFamily: Typography.fontFamily.bold },
  trashBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
  },
  dateError: { width: '100%', fontSize: 12, lineHeight: 17, fontFamily: Typography.fontFamily.medium, color: Colors.danger },
  separator: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 56 },
  
  // MODAL STYLING
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '75%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  modalForm: {
    flex: 1,
    padding: 16,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  modalOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  modalOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F8FAFC',
  },
  modalOptionBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  modalOptionText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  modalOptionTextActive: {
    color: Colors.primary,
  },
  customDateContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  dateInputLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 14,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  modalApplyBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textWhite,
  },

  // DETAIL MODAL STYLING
  detailModalContent: {
    height: '78%',
    minHeight: 520,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  detailBody: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  detailAmountWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailAmountText: {
    fontSize: 26,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: -0.5,
  },
  detailStatusLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
    marginTop: 4,
  },
  detailsList: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  detailRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailItemLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  detailItemValue: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  detailCode: {
    flex: 1,
    marginLeft: 16,
    textAlign: 'right',
    color: Colors.textSecondary,
  },
  detailFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  detailDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.danger,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailDeleteBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  detailCloseBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
  },
});
