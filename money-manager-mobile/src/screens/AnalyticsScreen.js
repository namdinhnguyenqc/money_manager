import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONTS, SHADOW, TYPOGRAPHY, WEB } from '../theme';
import { formatCurrency, getCurrentMonthYear } from '../utils/format';
import {
  getMonthlyStats,
  getCategoryBreakdown,
  getWalletStats,
  getWallets,
  getNetWorthTrend,
} from '../database/queries';
import MonthYearPicker from '../components/MonthYearPicker';
import PieChart from '../components/PieChart';
import LineChart from '../components/LineChart';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function AnalyticsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const [month, setMonth] = useState(curMonth);
  const [year, setYear] = useState(curYear);
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [wallets, setWallets] = useState([]);
  const [walletStats, setWalletStats] = useState({});
  const [expBreakdown, setExpBreakdown] = useState([]);
  const [incBreakdown, setIncBreakdown] = useState([]);
  const [nwTrend, setNwTrend] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [monthlyStats, walletRows, expenseRows, incomeRows, trendRows] = await Promise.all([
        getMonthlyStats(month, year),
        getWallets(),
        getCategoryBreakdown('expense', month, year),
        getCategoryBreakdown('income', month, year),
        getNetWorthTrend(6),
      ]);

      const nextWalletStats = {};
      for (const wallet of walletRows) {
        nextWalletStats[wallet.id] = await getWalletStats(wallet.id);
      }

      setStats(monthlyStats);
      setWallets(walletRows);
      setWalletStats(nextWalletStats);
      setExpBreakdown(expenseRows.filter((row) => row.total > 0));
      setIncBreakdown(incomeRows.filter((row) => row.total > 0));
      setNwTrend(trendRows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const totalExp = expBreakdown.reduce((sum, row) => sum + row.total, 0);
  const isDesktopWeb = Platform.OS === 'web';
  const contentMaxWidth = width >= 1440 ? WEB.contentMax.xl : width >= 1024 ? WEB.contentMax.lg : WEB.contentMax.md;
  const positiveWalletCount = wallets.filter((wallet) => (walletStats[wallet.id]?.balance || 0) >= 0).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {!isDesktopWeb ? (
        <TopAppBar
          title="Phân tích"
          subtitle={`Tháng ${month}/${year}`}
          onBack={() => navigation.goBack()}
          rightIcon="calendar-outline"
          onRightPress={() => setShowPicker(true)}
        />
      ) : null}

      <MonthYearPicker
        visible={showPicker}
        initialMonth={month}
        initialYear={year}
        onClose={() => setShowPicker(false)}
        onSelect={(selectedMonth, selectedYear) => {
          setMonth(selectedMonth);
          setYear(selectedYear);
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktopWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]}>
        {isDesktopWeb ? (
          <View style={styles.periodToolbar}>
            <TouchableOpacity style={styles.periodChip} onPress={() => setShowPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={styles.periodText}>Kỳ báo cáo: Tháng {month}/{year}</Text>
            </TouchableOpacity>
            <View style={styles.periodMeta}>
              <Text style={styles.periodMetaText}>Tổng hợp thu, chi, số dư và xu hướng tài sản theo từng kỳ.</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.periodChip} onPress={() => setShowPicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            <Text style={styles.periodText}>Kỳ báo cáo: Tháng {month}/{year}</Text>
          </TouchableOpacity>
        )}

        {isDesktopWeb ? (
          <View style={styles.heroRow}>
            <SurfaceCard tone="low" style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>BẢNG PHÂN TÍCH</Text>
              <Text style={styles.heroTitle}>Bảng tổng hợp hiệu quả tài chính</Text>
              <Text style={styles.heroText}>
                Theo dõi số dư, xem xu hướng tổng tài sản và đối soát từng sổ trên giao diện máy tính.
              </Text>
            </SurfaceCard>

            <SurfaceCard tone="lowest" style={styles.heroAside}>
              <Text style={styles.heroAsideLabel}>Sổ ổn định</Text>
              <Text style={[styles.heroAsideValue, { color: stats.balance >= 0 ? COLORS.secondary : COLORS.danger }]}>
                {positiveWalletCount}/{wallets.length}
              </Text>
              <Text style={styles.heroAsideText}>Sổ có số dư dương trong kỳ đã chọn.</Text>
              <View style={styles.heroAsideList}>
                <Text style={styles.heroAsideItem}>Danh mục chi: {expBreakdown.length}</Text>
                <Text style={styles.heroAsideItem}>Nguồn thu: {incBreakdown.length}</Text>
                <Text style={styles.heroAsideItem}>Mốc xu hướng: {nwTrend.length}</Text>
              </View>
            </SurfaceCard>
          </View>
        ) : null}

        <View style={[styles.summaryRow, isDesktopWeb && styles.summaryRowWeb]}>
          <SurfaceCard style={[styles.summaryCard, styles.incomeBorder]}>
            <Ionicons name="arrow-up-circle" size={20} color={COLORS.income} />
            <Text style={styles.summaryLabel}>Tổng thu</Text>
            <Text style={[styles.summaryValue, { color: COLORS.income }]}>{formatCurrency(stats.income)}</Text>
          </SurfaceCard>

          <SurfaceCard style={[styles.summaryCard, styles.expenseBorder]}>
            <Ionicons name="arrow-down-circle" size={20} color={COLORS.expense} />
            <Text style={styles.summaryLabel}>Tổng chi</Text>
            <Text style={[styles.summaryValue, { color: COLORS.expense }]}>{formatCurrency(stats.expense)}</Text>
          </SurfaceCard>

          {isDesktopWeb ? (
            <SurfaceCard style={[styles.summaryCard, styles.balanceCardInline, stats.balance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
              <Ionicons
                name={stats.balance >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                size={20}
                color={stats.balance >= 0 ? COLORS.income : COLORS.expense}
              />
              <Text style={styles.summaryLabel}>Cân đối</Text>
              <Text style={[styles.summaryValue, { color: stats.balance >= 0 ? COLORS.income : COLORS.expense }]}>
                {stats.balance >= 0 ? '+' : ''}
                {formatCurrency(stats.balance)}
              </Text>
            </SurfaceCard>
          ) : null}
        </View>

        {!isDesktopWeb ? (
          <SurfaceCard style={[styles.balanceCard, stats.balance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
            <Text style={styles.balanceLabel}>Thặng dư/Thâm hụt tháng này</Text>
            <Text style={[styles.balanceValue, { color: stats.balance >= 0 ? COLORS.income : COLORS.expense }]}>
              {stats.balance >= 0 ? '+' : ''}
              {formatCurrency(stats.balance)}
            </Text>
          </SurfaceCard>
        ) : null}

        {nwTrend.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Biến động tổng tài sản (6 tháng)</Text>
            <SurfaceCard style={[styles.chartCard, isDesktopWeb && styles.chartCardWeb]}>
              <LineChart data={nwTrend} />
            </SurfaceCard>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Theo sổ tiền</Text>
        <View style={[styles.walletGrid, isDesktopWeb && styles.walletGridWeb]}>
          {wallets.map((wallet) => {
            const walletSummary = walletStats[wallet.id] || {};
            const positive = (walletSummary.balance || 0) >= 0;
            return (
              <SurfaceCard key={wallet.id} style={[styles.walletCard, isDesktopWeb && styles.walletCardWeb]}>
                <View style={[styles.walletDot, { backgroundColor: wallet.color || COLORS.primary }]} />
                <View style={styles.walletMeta}>
                  <Text style={styles.walletName}>{wallet.icon} {wallet.name}</Text>
                  <View style={styles.walletRow}>
                    <Text style={[styles.walletMini, { color: COLORS.income }]}>Thu {formatCurrency(walletSummary.income || 0)}</Text>
                    <Text style={[styles.walletMini, { color: COLORS.expense }]}>Chi {formatCurrency(walletSummary.expense || 0)}</Text>
                  </View>
                </View>
                <View style={[styles.walletBadge, { backgroundColor: positive ? COLORS.incomeLight : COLORS.expenseLight }]}>
                  <Text style={[styles.walletBadgeText, { color: positive ? COLORS.income : COLORS.expense }]}>
                    {formatCurrency(walletSummary.balance || 0)}
                  </Text>
                </View>
              </SurfaceCard>
            );
          })}
        </View>

        {expBreakdown.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Chi theo danh mục</Text>
            <View style={[styles.breakdownSplit, isDesktopWeb && styles.breakdownSplitWeb]}>
              <SurfaceCard style={[styles.chartCard, styles.breakdownChartCard]}>
                <PieChart data={expBreakdown.slice(0, 5)} />
              </SurfaceCard>
              <SurfaceCard style={styles.breakdownListCard}>
                {expBreakdown.map((row, index) => {
                  const pct = totalExp > 0 ? (row.total / totalExp) * 100 : 0;
                  return (
                    <View key={index} style={[styles.breakdownRow, index === expBreakdown.length - 1 && styles.breakdownLast]}>
                      <Text style={styles.breakIcon}>{row.icon || '$'}</Text>
                      <View style={styles.breakBody}>
                        <View style={styles.breakTop}>
                          <Text style={styles.breakName}>{row.name || 'Khác'}</Text>
                          <Text style={styles.breakValue}>{formatCurrency(row.total)}</Text>
                        </View>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.breakPct}>{pct.toFixed(1)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </SurfaceCard>
            </View>
          </>
        ) : null}

        {incBreakdown.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Nguồn thu</Text>
            <SurfaceCard>
              {incBreakdown.map((row, index) => (
                <View key={index} style={[styles.breakdownRow, index === incBreakdown.length - 1 && styles.breakdownLast]}>
                  <Text style={styles.breakIcon}>{row.icon || '+'}</Text>
                  <View style={styles.breakBody}>
                    <View style={styles.breakTop}>
                      <Text style={styles.breakName}>{row.name || 'Khác'}</Text>
                      <Text style={[styles.breakValue, styles.incomeText]}>{formatCurrency(row.total)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </SurfaceCard>
          </>
        ) : null}

        {stats.income === 0 && stats.expense === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>#</Text>
            <Text style={styles.emptyTitle}>Không có dữ liệu trong kỳ này</Text>
            <Text style={styles.emptySub}>Thêm giao dịch để báo cáo phân tích chính xác hơn.</Text>
          </SurfaceCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 120, gap: 12 },
  contentWeb: { width: '100%', alignSelf: 'center' },
  periodToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  periodChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  periodText: { color: COLORS.textSecondary, fontSize: 12, ...FONTS.semibold },
  periodMeta: {
    minHeight: 40,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surfaceLowest,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodMetaText: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.bold },
  heroRow: { flexDirection: 'row', gap: 12 },
  heroCard: { flex: 1.15 },
  heroEyebrow: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  heroTitle: { marginTop: 8, fontSize: 22, color: COLORS.textPrimary, ...FONTS.bold },
  heroText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, ...FONTS.medium },
  heroAside: { width: 320, justifyContent: 'center' },
  heroAsideLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  heroAsideValue: { marginTop: 10, fontSize: 32, ...FONTS.black },
  heroAsideText: { marginTop: 8, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  heroAsideList: { marginTop: 14, gap: 8 },
  heroAsideItem: { fontSize: 12, color: COLORS.textPrimary, ...FONTS.medium },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryRowWeb: { alignItems: 'stretch' },
  summaryCard: { flex: 1, borderWidth: 1, borderColor: COLORS.borderSoft },
  incomeBorder: { borderLeftWidth: 4, borderLeftColor: COLORS.income },
  expenseBorder: { borderLeftWidth: 4, borderLeftColor: COLORS.expense },
  balanceCardInline: { borderLeftWidth: 4, borderLeftColor: COLORS.primary, justifyContent: 'center', ...SHADOW.sm },
  summaryLabel: { marginTop: 8, color: COLORS.textMuted, fontSize: 12 },
  summaryValue: { marginTop: 4, fontSize: 16, ...FONTS.bold },
  balanceCard: { alignItems: 'center' },
  balancePositive: { backgroundColor: '#e8fff4' },
  balanceNegative: { backgroundColor: '#ffeceb' },
  balanceLabel: { color: COLORS.textSecondary, fontSize: 13, ...FONTS.semibold },
  balanceValue: { marginTop: 4, fontSize: 28, ...FONTS.black },
  sectionTitle: { marginTop: 8, color: COLORS.textPrimary, fontSize: 15, ...FONTS.bold },
  chartCard: { alignItems: 'center' },
  chartCardWeb: { minHeight: 320, justifyContent: 'center' },
  walletGrid: { gap: 10 },
  walletGridWeb: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  walletCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletCardWeb: {
    width: '49%',
    minHeight: 88,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    ...SHADOW.sm,
  },
  walletDot: { width: 12, height: 12, borderRadius: 6 },
  walletMeta: { flex: 1 },
  walletName: { color: COLORS.textPrimary, fontSize: 14, ...FONTS.semibold },
  walletRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  walletMini: { fontSize: 12, ...FONTS.medium },
  walletBadge: { borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6 },
  walletBadgeText: { fontSize: 12, ...FONTS.bold },
  breakdownSplit: { gap: 12 },
  breakdownSplitWeb: { flexDirection: 'row', alignItems: 'stretch' },
  breakdownChartCard: { flex: 0.9, minHeight: 320, justifyContent: 'center' },
  breakdownListCard: { flex: 1.1 },
  breakdownRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft },
  breakdownLast: { borderBottomWidth: 0 },
  breakIcon: { fontSize: 18, marginTop: 2 },
  breakBody: { flex: 1 },
  breakTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  breakName: { color: COLORS.textPrimary, fontSize: 13, ...FONTS.semibold },
  breakValue: { color: COLORS.expense, fontSize: 13, ...FONTS.bold },
  incomeText: { color: COLORS.income },
  barBg: { height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceContainer },
  barFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.expense },
  breakPct: { marginTop: 3, color: COLORS.textMuted, fontSize: 10 },
  emptyCard: { alignItems: 'center', paddingVertical: 28, marginTop: 8 },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { marginTop: 8, color: COLORS.textPrimary, fontSize: 15, ...FONTS.bold },
  emptySub: { marginTop: 6, color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});
