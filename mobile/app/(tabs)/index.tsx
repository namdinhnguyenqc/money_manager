import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { logPerfEvent, markFirstScreenReady } from '@/lib/telemetry/appPerformance';

type DashboardData = {
  boardingHouses: any[];
  rooms: any[];
  invoices: any[];
  wallets: any[];
  transactions: any[];
  deposits: any[];
};

type LedgerTab = 'invoices' | 'transactions';

const EMPTY_DATA: DashboardData = {
  boardingHouses: [],
  rooms: [],
  invoices: [],
  wallets: [],
  transactions: [],
  deposits: [],
};

const money = (value?: number | null) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)))} ₫`;

const compactMoney = (value?: number | null) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(amount / 1_000_000_000)} tỷ`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(amount / 1_000_000)} tr`;
  }
  return money(amount);
};

const isInCurrentMonth = (date?: string | null) => {
  if (!date) return false;
  const value = new Date(date);
  const now = new Date();
  return value.getMonth() === now.getMonth() && value.getFullYear() === now.getFullYear();
};

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user) as any;
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>('invoices');

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      logPerfEvent('HOME_DATA_START', { forceRefresh });
      const result = await apiGet<any>('/owner/dashboard-init', {
        forceRefresh,
        cacheTtlMs: 60 * 1000,
      });
      setData({
        boardingHouses: result?.boardingHouses ?? [],
        rooms: result?.rooms ?? [],
        invoices: result?.invoices ?? [],
        wallets: result?.wallets ?? [],
        transactions: result?.transactions ?? [],
        deposits: result?.deposits ?? [],
      });
      logPerfEvent('HOME_DATA_READY', { success: true });
    } catch (requestError: any) {
      setError('Không thể cập nhật tổng quan. Kiểm tra kết nối và thử lại.');
      logPerfEvent('HOME_DATA_READY', {
        success: false,
        message: String(requestError?.message || requestError),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    markFirstScreenReady({ screen: 'dashboard', hasSummary: !loading && !error });
  }, [error, loading]);

  const stats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthTransactions = data.transactions.filter((item) => isInCurrentMonth(item.date));
    const income = monthTransactions
      .filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expense = monthTransactions
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const monthInvoices = data.invoices.filter(
      (item) => Number(item.month) === month && Number(item.year) === year,
    );
    const expected = monthInvoices.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    const collected = monthInvoices.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
    const outstanding = Math.max(0, expected - collected);
    const overdue = data.invoices.filter((item) => {
      const isPast = Number(item.year) < year || (Number(item.year) === year && Number(item.month) < month);
      return isPast && Number(item.paid_amount || 0) < Number(item.total_amount || 0);
    });
    const overdueAmount = overdue.reduce(
      (sum, item) => sum + Math.max(0, Number(item.total_amount || 0) - Number(item.paid_amount || 0)),
      0,
    );
    const occupied = data.rooms.filter((room) => room.status === 'occupied').length;
    const vacant = data.rooms.filter((room) => room.status === 'vacant').length;
    const reserved = data.rooms.filter((room) => room.status === 'reserved').length;
    const maintenance = data.rooms.filter((room) => room.status === 'maintenance').length;
    const balance = data.wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0);
    const deposits = data.deposits
      .filter((deposit) => deposit.status === 'holding')
      .reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);

    return {
      month,
      income,
      expense,
      profit: income - expense,
      expected,
      collected,
      outstanding,
      collectionRate: expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0,
      overdue,
      overdueAmount,
      occupied,
      vacant,
      reserved,
      maintenance,
      totalRooms: data.rooms.length,
      occupancyRate: data.rooms.length ? Math.round((occupied / data.rooms.length) * 100) : 0,
      balance,
      deposits,
      monthTransactions,
      paidInvoices: monthInvoices.filter(
        (item) => Number(item.total_amount || 0) > 0 && Number(item.paid_amount || 0) >= Number(item.total_amount || 0),
      ),
    };
  }, [data]);

  const displayName = user?.fullName || user?.name || user?.full_name || 'Chủ trọ';
  const firstName = String(displayName).trim().split(/\s+/).pop() || 'bạn';

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      <View style={styles.greetingRow}>
        <View style={styles.greetingCopy}>
          <Text style={styles.greeting}>Xin chào, {firstName}</Text>
          <Text style={styles.greetingHint}>Tổng quan vận hành tháng {stats.month}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Mở hồ sơ cá nhân"
          activeOpacity={0.72}
        >
          <Image
            source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-128.png')}
            style={styles.avatarImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={21} color={styles.errorTitle.color} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>Chưa tải được dữ liệu</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(true)} activeOpacity={0.72}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroLabel}>LỢI NHUẬN RÒNG THÁNG {stats.month}</Text>
            {stats.income === 0 && stats.expense === 0 ? (
              <Text style={styles.heroEmptyTitle}>Chưa có dòng tiền tháng này</Text>
            ) : (
              <Text style={[styles.heroAmount, stats.profit < 0 && styles.heroAmountNegative]}>
                {hideBalance ? '••••••••' : money(stats.profit)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.heroIconButton}
            onPress={() => setHideBalance((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={hideBalance ? 'Hiện số tiền' : 'Ẩn số tiền'}
          >
            <Ionicons name={hideBalance ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.heroMetrics}>
          <HeroMetric label="Đã thu" value={hideBalance ? '••••' : compactMoney(stats.income)} />
          <View style={styles.heroDivider} />
          <HeroMetric label="Chi phí" value={hideBalance ? '••••' : compactMoney(stats.expense)} />
          <View style={styles.heroDivider} />
          <HeroMetric label="Số dư ví" value={hideBalance ? '••••' : compactMoney(stats.balance)} />
        </View>
      </View>

      <View style={styles.primaryActions}>
        <PrimaryAction icon="receipt-outline" label="Tạo hóa đơn" onPress={() => router.push('/invoice/new')} />
        <PrimaryAction icon="cash-outline" label="Thu tiền" onPress={() => router.push('/payment/new')} />
        <PrimaryAction icon="bookmark-outline" label="Nhận cọc" onPress={() => router.push('/deposit/new')} />
        <PrimaryAction icon="add-outline" label="Thêm mới" onPress={() => router.push('/transactions/new')} />
      </View>

      {stats.overdue.length > 0 ? (
        <TouchableOpacity
          style={styles.attentionRow}
          onPress={() => router.push('/(tabs)/invoices')}
          activeOpacity={0.76}
        >
          <View style={styles.attentionIcon}>
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
          </View>
          <View style={styles.attentionCopy}>
            <Text style={styles.attentionTitle}>{stats.overdue.length} hóa đơn cần xử lý</Text>
            <Text style={styles.attentionText}>Quá hạn {money(stats.overdueAmount)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      <SectionHeader title="Dòng tiền tháng này" action="Xem báo cáo" onPress={() => router.push('/(tabs)/reports')} />
      <View style={styles.cashflowPanel}>
        <View style={styles.collectionHeader}>
          <View>
            <Text style={styles.collectionLabel}>Tiến độ thu tiền phòng</Text>
            <Text style={styles.collectionAmount}>{money(stats.collected)}</Text>
          </View>
          <Text style={styles.collectionRate}>{stats.collectionRate}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stats.collectionRate}%` }]} />
        </View>
        <View style={styles.cashflowRows}>
          <MetricRow label="Tổng cần thu" value={money(stats.expected)} />
          <MetricRow label="Còn phải thu" value={money(stats.outstanding)} valueStyle={stats.outstanding > 0 ? styles.warningValue : undefined} />
          <MetricRow label="Tiền cọc đang giữ" value={money(stats.deposits)} last />
        </View>
      </View>

      <SectionHeader title="Tình trạng phòng" action="Quản lý phòng" onPress={() => router.push('/(tabs)/facilities')} />
      <TouchableOpacity style={styles.roomsPanel} onPress={() => router.push('/(tabs)/facilities')} activeOpacity={0.82}>
        <View style={styles.occupancyBlock}>
          <Text style={styles.occupancyValue}>{stats.occupancyRate}%</Text>
          <Text style={styles.occupancyLabel}>lấp đầy</Text>
        </View>
        <View style={styles.roomDetails}>
          <View style={styles.roomSummaryLine}>
            <Text style={styles.roomSummaryTitle}>{stats.totalRooms} phòng</Text>
            <Text style={styles.roomSummaryMeta}>{data.boardingHouses.length} dãy trọ</Text>
          </View>
          <View style={styles.roomBar}>
            <View style={[styles.roomBarFill, { flex: Math.max(stats.occupied, 0.001), backgroundColor: Colors.primary }]} />
            <View style={[styles.roomBarFill, { flex: Math.max(stats.vacant, 0.001), backgroundColor: '#059669' }]} />
            <View style={[styles.roomBarFill, { flex: Math.max(stats.reserved, 0.001), backgroundColor: '#D97706' }]} />
            <View style={[styles.roomBarFill, { flex: Math.max(stats.maintenance, 0.001), backgroundColor: '#CBD5E1' }]} />
          </View>
          <View style={styles.roomLegend}>
            <LegendDot color={Colors.primary} label={`Đang thuê ${stats.occupied}`} />
            <LegendDot color="#059669" label={`Trống ${stats.vacant}`} />
            <LegendDot color="#D97706" label={`Đã cọc ${stats.reserved}`} />
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.ledgerHeader}>
        <View style={styles.ledgerTabs}>
          <LedgerTabButton active={ledgerTab === 'invoices'} label="Hóa đơn đã thu" onPress={() => setLedgerTab('invoices')} />
          <LedgerTabButton active={ledgerTab === 'transactions'} label="Sổ quỹ" onPress={() => setLedgerTab('transactions')} />
        </View>
        <TouchableOpacity onPress={() => router.push(ledgerTab === 'invoices' ? '/(tabs)/invoices' : '/(tabs)/transactions')}>
          <Text style={styles.seeAll}>Tất cả</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.ledgerList}>
        {ledgerTab === 'invoices' ? (
          stats.paidInvoices.length ? (
            stats.paidInvoices.slice(0, 4).map((invoice) => (
              <TouchableOpacity key={invoice.id} style={styles.listRow} onPress={() => router.push(`/invoice/${invoice.id}`)}>
                <View style={styles.listIcon}>
                  <Ionicons name="checkmark-outline" size={18} color="#059669" />
                </View>
                <View style={styles.listCopy}>
                  <Text style={styles.listTitle}>{invoice.room_name || 'Hóa đơn tiền phòng'}</Text>
                  <Text style={styles.listMeta}>Kỳ T{invoice.month}/{invoice.year}</Text>
                </View>
                <Text style={styles.listAmount}>{money(invoice.total_amount)}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyLedger
              icon="receipt-outline"
              title="Chưa có hóa đơn đã thu"
              description="Hóa đơn hoàn tất trong tháng sẽ xuất hiện tại đây."
              action="Tạo hóa đơn"
              onPress={() => router.push('/invoice/new')}
            />
          )
        ) : stats.monthTransactions.length ? (
          stats.monthTransactions.slice(0, 4).map((transaction) => {
            const income = transaction.type === 'income';
            return (
              <View key={transaction.id} style={styles.listRow}>
                <View style={styles.listIcon}>
                  <Ionicons name={income ? 'arrow-down-outline' : 'arrow-up-outline'} size={18} color={income ? '#059669' : '#DC2626'} />
                </View>
                <View style={styles.listCopy}>
                  <Text style={styles.listTitle} numberOfLines={1}>{transaction.description || 'Giao dịch'}</Text>
                  <Text style={styles.listMeta}>{transaction.date ? new Date(transaction.date).toLocaleDateString('vi-VN') : 'Tháng này'}</Text>
                </View>
                <Text style={[styles.listAmount, income ? styles.incomeValue : styles.expenseValue]}>
                  {income ? '+' : '-'}{money(transaction.amount)}
                </Text>
              </View>
            );
          })
        ) : (
          <EmptyLedger
            icon="swap-vertical-outline"
            title="Chưa có giao dịch tháng này"
            description="Ghi khoản thu hoặc chi để theo dõi dòng tiền chính xác."
            action="Lập phiếu thu chi"
            onPress={() => router.push('/transactions/new')}
          />
        )}
      </View>
    </ScrollView>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.skeletonScreen}>
      <View style={styles.skeletonGreeting} />
      <View style={styles.skeletonHero}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
      <View style={styles.skeletonActions}>
        {[0, 1, 2, 3].map((item) => <View key={item} style={styles.skeletonAction} />)}
      </View>
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonPanel} />
      <View style={styles.skeletonLineSmall} />
      <View style={styles.skeletonPanelSmall} />
    </View>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroMetric}>
      <Text style={styles.heroMetricLabel}>{label}</Text>
      <Text style={styles.heroMetricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function PrimaryAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.primaryAction} onPress={onPress} activeOpacity={0.68} accessibilityRole="button">
      <View style={styles.primaryActionIcon}>
        <Ionicons name={icon} size={21} color={Colors.primary} />
      </View>
      <Text style={styles.primaryActionLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, action, onPress }: { title: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onPress} hitSlop={8}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

function MetricRow({ label, value, valueStyle, last }: { label: string; value: string; valueStyle?: object; last?: boolean }) {
  return (
    <View style={[styles.metricRow, last && styles.metricRowLast]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function LedgerTabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.ledgerTab, active && styles.ledgerTabActive]} onPress={onPress} activeOpacity={0.72}>
      <Text style={[styles.ledgerTabText, active && styles.ledgerTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyLedger({ icon, title, description, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={Colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onPress} activeOpacity={0.72}>
        <Text style={styles.emptyButtonText}>{action}</Text>
        <Ionicons name="arrow-forward-outline" size={16} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 112 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  greetingCopy: { flex: 1, paddingRight: 12 },
  greeting: { fontSize: 20, lineHeight: 26, fontFamily: Typography.fontFamily.bold, color: '#0F172A', letterSpacing: -0.3 },
  greetingHint: { marginTop: 3, fontSize: 13, lineHeight: 18, fontFamily: Typography.fontFamily.regular, color: '#64748B' },
  avatarButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  avatarImage: { width: 28, height: 28 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 16, borderRadius: 14, backgroundColor: '#FEF2F2' },
  errorCopy: { flex: 1 },
  errorTitle: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: '#991B1B' },
  errorText: { marginTop: 2, fontSize: 11, lineHeight: 16, fontFamily: Typography.fontFamily.regular, color: '#7F1D1D' },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  retryText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#DC2626' },
  hero: { position: 'relative', overflow: 'hidden', borderRadius: 16, padding: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#2563EB' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { fontSize: 10.5, lineHeight: 14, fontFamily: Typography.fontFamily.semibold, color: '#2563EB', letterSpacing: 0.65 },
  heroAmount: { marginTop: 7, fontSize: 28, lineHeight: 36, fontFamily: Typography.fontFamily.extrabold, color: '#0F172A', letterSpacing: -0.7 },
  heroEmptyTitle: { marginTop: 7, fontSize: 19, lineHeight: 26, fontFamily: Typography.fontFamily.bold, color: '#0F172A', letterSpacing: -0.3 },
  heroAmountNegative: { color: '#B91C1C' },
  heroIconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -8, marginRight: -8 },
  heroMetrics: { flexDirection: 'row', alignItems: 'center', marginTop: 17, paddingTop: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  heroMetric: { flex: 1 },
  heroMetricLabel: { fontSize: 10.5, lineHeight: 14, fontFamily: Typography.fontFamily.medium, color: '#64748B' },
  heroMetricValue: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: Typography.fontFamily.bold, color: '#0F172A' },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 30, marginHorizontal: 12, backgroundColor: '#E2E8F0' },
  primaryActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 24, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 16, backgroundColor: '#FFFFFF' },
  primaryAction: { width: '24%', minHeight: 70, alignItems: 'center', justifyContent: 'flex-start' },
  primaryActionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' },
  primaryActionLabel: { marginTop: 7, fontSize: 11, lineHeight: 15, fontFamily: Typography.fontFamily.semibold, color: '#334155', textAlign: 'center' },
  attentionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 68, marginBottom: 24, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: '#FFF7F7' },
  attentionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2' },
  attentionCopy: { flex: 1, marginHorizontal: 12 },
  attentionTitle: { fontSize: 13, lineHeight: 18, fontFamily: Typography.fontFamily.bold, color: '#991B1B' },
  attentionText: { marginTop: 2, fontSize: 12, lineHeight: 16, fontFamily: Typography.fontFamily.regular, color: '#7F1D1D' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontFamily: Typography.fontFamily.bold, color: '#0F172A', letterSpacing: -0.25 },
  sectionAction: { fontSize: 12, lineHeight: 18, fontFamily: Typography.fontFamily.semibold, color: '#2563EB' },
  cashflowPanel: { borderRadius: 16, padding: 16, marginBottom: 26, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDF1F5' },
  collectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  collectionLabel: { fontSize: 12, lineHeight: 16, fontFamily: Typography.fontFamily.medium, color: '#64748B' },
  collectionAmount: { marginTop: 4, fontSize: 22, lineHeight: 28, fontFamily: Typography.fontFamily.bold, color: '#0F172A', letterSpacing: -0.4 },
  collectionRate: { fontSize: 20, lineHeight: 26, fontFamily: Typography.fontFamily.bold, color: '#2563EB' },
  progressTrack: { height: 6, marginTop: 14, borderRadius: 3, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#2563EB' },
  cashflowRows: { marginTop: 12 },
  metricRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  metricRowLast: { borderBottomWidth: 0 },
  metricLabel: { fontSize: 12.5, fontFamily: Typography.fontFamily.regular, color: '#64748B' },
  metricValue: { fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: '#0F172A' },
  warningValue: { color: '#B45309' },
  roomsPanel: { flexDirection: 'row', alignItems: 'stretch', minHeight: 128, borderRadius: 16, padding: 16, marginBottom: 26, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDF1F5' },
  occupancyBlock: { width: 86, alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#E2E8F0' },
  occupancyValue: { fontSize: 28, lineHeight: 34, fontFamily: Typography.fontFamily.extrabold, color: '#0F172A', letterSpacing: -0.7 },
  occupancyLabel: { marginTop: 2, fontSize: 11, fontFamily: Typography.fontFamily.medium, color: '#64748B' },
  roomDetails: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  roomSummaryLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomSummaryTitle: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: '#0F172A' },
  roomSummaryMeta: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: '#64748B' },
  roomBar: { height: 7, flexDirection: 'row', gap: 2, marginTop: 12, overflow: 'hidden', borderRadius: 4, backgroundColor: '#E2E8F0' },
  roomBarFill: { height: '100%' },
  roomLegend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 6, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: Typography.fontFamily.medium, color: '#64748B' },
  ledgerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  ledgerTabs: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 11, backgroundColor: '#E2E8F0' },
  ledgerTab: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  ledgerTabActive: { backgroundColor: '#FFFFFF' },
  ledgerTabText: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: '#64748B' },
  ledgerTabTextActive: { fontFamily: Typography.fontFamily.bold, color: '#0F172A' },
  seeAll: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: '#2563EB' },
  ledgerList: { overflow: 'hidden', borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  listRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  listIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  listCopy: { flex: 1, marginHorizontal: 12 },
  listTitle: { fontSize: 13, lineHeight: 18, fontFamily: Typography.fontFamily.semibold, color: '#0F172A' },
  listMeta: { marginTop: 2, fontSize: 11, lineHeight: 15, fontFamily: Typography.fontFamily.regular, color: '#64748B' },
  listAmount: { maxWidth: 128, fontSize: 12.5, fontFamily: Typography.fontFamily.bold, color: '#0F172A', textAlign: 'right' },
  incomeValue: { color: '#047857' },
  expenseValue: { color: '#B91C1C' },
  emptyState: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  emptyTitle: { marginTop: 12, fontSize: 14, lineHeight: 20, fontFamily: Typography.fontFamily.bold, color: '#0F172A', textAlign: 'center' },
  emptyDescription: { maxWidth: 260, marginTop: 4, fontSize: 12, lineHeight: 17, fontFamily: Typography.fontFamily.regular, color: '#64748B', textAlign: 'center' },
  emptyButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 8 },
  emptyButtonText: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: '#2563EB' },
  skeletonScreen: { flex: 1, paddingHorizontal: 20, paddingTop: 22, backgroundColor: '#F8FAFC' },
  skeletonGreeting: { width: 180, height: 24, borderRadius: 8, marginBottom: 22, backgroundColor: '#E2E8F0' },
  skeletonHero: { height: 190, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  skeletonActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 28 },
  skeletonAction: { width: 56, height: 68, borderRadius: 12, backgroundColor: '#E2E8F0' },
  skeletonLine: { width: 170, height: 20, borderRadius: 7, marginBottom: 12, backgroundColor: '#E2E8F0' },
  skeletonLineSmall: { width: 135, height: 20, borderRadius: 7, marginTop: 28, marginBottom: 12, backgroundColor: '#E2E8F0' },
  skeletonPanel: { height: 184, borderRadius: 16, backgroundColor: '#FFFFFF' },
  skeletonPanelSmall: { height: 132, borderRadius: 16, backgroundColor: '#FFFFFF' },
});
