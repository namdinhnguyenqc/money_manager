import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { Tabs, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import { deleteTransaction, formatMoney, loadTransactions, loadWallets } from '@/lib/rentalOps';

type TxTypeFilter = 'all' | 'income' | 'expense';
type DateFilter = 'all' | 'today' | '7d' | 'month';

const dateFilters: Array<{ value: DateFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: 'month', label: 'Tháng này' },
];

const typeFilters: Array<{ value: TxTypeFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'all', label: 'Tất cả', icon: 'swap-vertical-outline' },
  { value: 'income', label: 'Khoản thu', icon: 'arrow-down-outline' },
  { value: 'expense', label: 'Khoản chi', icon: 'arrow-up-outline' },
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

function isInDateFilter(value: string | null | undefined, filter: DateFilter) {
  if (filter === 'all') return true;
  const date = parseTxDate(value);
  if (!date) return false;
  date.setHours(0, 0, 0, 0);

  const today = startOfToday();
  if (filter === 'today') return date.getTime() === today.getTime();
  if (filter === '7d') return date >= addDays(today, -6) && date <= today;
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function formatGroupDate(dateKey: string) {
  const todayKey = localDateKey(new Date().toISOString());
  const yesterdayKey = localDateKey(addDays(new Date(), -1).toISOString());
  if (dateKey === todayKey) return 'Hôm nay';
  if (dateKey === yesterdayKey) return 'Hôm qua';
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { walletId, walletName } = useLocalSearchParams<{ walletId?: string; walletName?: string }>();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(walletId || null);
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deletingTx, setDeletingTx] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true);
      else setLoading(true);
      const [txList, walletList] = await Promise.all([
        loadTransactions(activeWalletId || undefined),
        loadWallets(),
      ]);
      setTransactions(txList);
      setWallets(walletList);
    } catch (e: any) {
      setToast({ message: e?.message || 'Không tải được sổ quỹ.', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeWalletId]);

  useEffect(() => {
    setActiveWalletId(walletId || null);
  }, [walletId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [fetchData])
  );

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      return isInDateFilter(tx.date, dateFilter);
    });
  }, [transactions, typeFilter, dateFilter]);

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

  const totalBalance = useMemo(() => wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0), [wallets]);
  const netFlow = metrics.income - metrics.expense;
  const activeWallet = wallets.find((wallet) => wallet.id === activeWalletId);
  const activeWalletLabel = activeWallet?.name || (activeWalletId ? walletName : 'Tất cả ví');

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { key: string; title: string; items: any[]; income: number; expense: number }> = {};

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
      <Tabs.Screen options={{ title: 'Sổ quỹ', headerTitle: 'Sổ quỹ thu chi' }} />

      <View style={styles.summaryBand}>
        <View style={styles.balanceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Số dư hiện tại</Text>
            <Text style={styles.balanceValue}>{formatMoney(totalBalance)}</Text>
            <Text style={styles.balanceMeta} numberOfLines={1}>{activeWalletLabel}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/transactions/new')}>
            <Ionicons name="add" size={20} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          <MetricCell label="Thu" value={`+${formatMoney(metrics.income)}`} color={Colors.success} />
          <MetricCell label="Chi" value={`-${formatMoney(metrics.expense)}`} color={Colors.danger} />
          <MetricCell label="Chênh lệch" value={`${netFlow >= 0 ? '+' : ''}${formatMoney(netFlow)}`} color={netFlow >= 0 ? Colors.success : Colors.danger} />
        </View>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {dateFilters.map((item) => (
            <FilterChip key={item.value} label={item.label} active={dateFilter === item.value} onPress={() => setDateFilter(item.value)} />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {typeFilters.map((item) => (
            <FilterChip
              key={item.value}
              icon={item.icon}
              label={item.label}
              active={typeFilter === item.value}
              onPress={() => setTypeFilter(item.value)}
            />
          ))}
        </ScrollView>

        {wallets.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <FilterChip label="Tất cả ví" active={!activeWalletId} onPress={() => setActiveWalletId(null)} />
            {wallets.map((wallet) => (
              <FilterChip key={wallet.id} label={wallet.name} active={activeWalletId === wallet.id} onPress={() => setActiveWalletId(wallet.id)} />
            ))}
          </ScrollView>
        )}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={Colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={42} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có giao dịch phù hợp</Text>
              <Text style={styles.emptyDesc}>Thử đổi bộ lọc hoặc ghi nhận khoản thu chi mới.</Text>
              <Button title="Ghi thu chi" size="sm" onPress={() => router.push('/transactions/new')} style={{ marginTop: 14 }} />
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
                        onPress={() => Alert.alert(
                          'Chi tiết giao dịch',
                          [
                            item.description || (isIncome ? 'Khoản thu' : 'Khoản chi'),
                            `Số tiền: ${formatMoney(item.amount)}`,
                            `Ví: ${item.wallet_name || 'Chưa rõ'}`,
                            `Ngày: ${formatGroupDate(localDateKey(item.date))}`,
                          ].join('\n')
                        )}
                        onLongPress={() => setDeletingTx(item)}
                      >
                        <View style={[styles.txIcon, { backgroundColor: isIncome ? Colors.successLight : Colors.dangerLight }]}>
                          <Ionicons name={isIncome ? 'arrow-down-outline' : 'arrow-up-outline'} size={17} color={color} />
                        </View>
                        <View style={styles.txContent}>
                          <Text style={styles.txDesc} numberOfLines={1}>{item.description || (isIncome ? 'Khoản thu' : 'Khoản chi')}</Text>
                          <Text style={styles.txMeta} numberOfLines={1}>
                            {item.wallet_name || 'Ví quỹ'}{item.category_name ? ` · ${item.category_name}` : ''}
                          </Text>
                        </View>
                        <View style={styles.txRight}>
                          <Text style={[styles.txAmount, { color }]}>{isIncome ? '+' : '-'}{formatMoney(item.amount)}</Text>
                          <TouchableOpacity style={styles.deleteButton} onPress={() => setDeletingTx(item)}>
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

      <ConfirmDialog
        visible={!!deletingTx}
        title="Xóa giao dịch"
        message={`Xóa giao dịch ${deletingTx?.description || ''} trị giá ${formatMoney(deletingTx?.amount)}? Số dư ví sẽ được cập nhật lại.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingTx(null)}
        loading={actionLoading}
      />

      <Toast visible={!!toast} message={toast?.message || ''} type={toast?.type} onDismiss={() => setToast(null)} />
    </SafeAreaView>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress} activeOpacity={0.72}>
      {icon ? <Ionicons name={icon} size={13} color={active ? Colors.primary : Colors.textSecondary} /> : null}
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  summaryBand: {
    margin: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { marginTop: 3, fontSize: 24, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  balanceMeta: { marginTop: 2, fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  addButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  metricRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metricCell: { flex: 1, minWidth: 0, borderRadius: 10, backgroundColor: Colors.background, paddingHorizontal: 10, paddingVertical: 9 },
  metricLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  metricValue: { marginTop: 3, fontSize: 13, fontFamily: Typography.fontFamily.bold },
  filters: { gap: 8, paddingBottom: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryAlpha50 },
  filterChipText: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  list: { padding: 16, paddingTop: 2, paddingBottom: 112, gap: 14 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 28 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  emptyDesc: { marginTop: 5, fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },
  group: { gap: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  groupTitle: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  groupTotal: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.textMuted },
  txPanel: { borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  txRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 10 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txContent: { flex: 1, minWidth: 0 },
  txDesc: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  txMeta: { marginTop: 3, fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted },
  txRight: { alignItems: 'flex-end', gap: 5 },
  txAmount: { fontSize: 14, fontFamily: Typography.fontFamily.bold },
  deleteButton: { width: 26, height: 22, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 59 },
});
