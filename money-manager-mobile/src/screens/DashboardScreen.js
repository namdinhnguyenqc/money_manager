import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import { formatCurrency } from '../utils/format';
import {
  getBankConfig,
  getGlobalNetWorth,
  getLast6MonthsStats,
  getTodayStats,
  getWallets,
  ensureApiBootstrapData,
  ensureApiRentalServices,
} from '../database/queries';
import { getRoomsApi } from '../services/rentalApiService';
import TransactionsScreen from './TransactionsScreen';
import SurfaceCard from '../components/ui/SurfaceCard';
import WebDesktopShell from '../components/ui/WebDesktopShell';
import Logo from '../components/ui/Logo';

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [netWorth, setNetWorth] = useState({ cashBalance: 0, inventoryValue: 0, totalNetWorth: 0 });
  const [wallets, setWallets] = useState([]);
  const [userConfig, setUserConfig] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [todayStats, setTodayStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rentalAlerts, setRentalAlerts] = useState({ pendingInvoicesCount: 0, vacantRooms: [] });

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      await ensureApiBootstrapData();
      await ensureApiRentalServices();
      const [nw, ws, cfg, chart, today, rooms] = await Promise.all([
        getGlobalNetWorth().catch(() => ({ cashBalance: 0, inventoryValue: 0, totalNetWorth: 0 })),
        getWallets().catch(() => []),
        getBankConfig().catch(() => null),
        getLast6MonthsStats().catch(() => []),
        getTodayStats().catch(() => ({ income: 0, expense: 0, balance: 0 })),
        getRoomsApi().catch(() => []),
      ]);
      setNetWorth(nw);
      setWallets(ws);
      setUserConfig(cfg);
      setChartData(chart);
      setTodayStats(today);
      const vacant = rooms.filter(r => r.status === 'vacant');
      setRentalAlerts({ pendingInvoicesCount: 0, vacantRooms: vacant });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openModule = (type, route) => {
    const wallet = wallets.find((x) => x.type === type);
    navigation.navigate(route, wallet ? { walletId: wallet.id, walletName: wallet.name } : {});
  };

  const personalWallet = wallets.find((w) => w.type === 'personal');
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb;

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const dashboardContent = (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Hero Net Worth Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Tổng tài sản ròng</Text>
        <Text style={styles.heroValue}>{formatCurrency(netWorth.totalNetWorth || 0)}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <View style={[styles.statDot, { backgroundColor: COLORS.secondary }]} />
            <Text style={styles.heroStatLabel}>Tiền mặt</Text>
            <Text style={[styles.heroStatValue, { color: COLORS.secondary }]}>
              {formatCurrency(netWorth.cashBalance || 0)}
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStatItem}>
            <View style={[styles.statDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.heroStatLabel}>Hàng tồn</Text>
            <Text style={[styles.heroStatValue, { color: COLORS.warning }]}>
              {formatCurrency(netWorth.inventoryValue || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Today KPIs */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, styles.kpiIncome]}>
          <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(36,199,166,0.12)' }]}>
            <Ionicons name="trending-up" size={18} color={COLORS.secondary} />
          </View>
          <Text style={styles.kpiLabel}>Thu hôm nay</Text>
          <Text style={[styles.kpiValue, { color: COLORS.secondary }]}>
            +{formatCurrency(todayStats.income || 0)}
          </Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiExpense]}>
          <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(186,26,26,0.10)' }]}>
            <Ionicons name="trending-down" size={18} color={COLORS.danger} />
          </View>
          <Text style={styles.kpiLabel}>Chi hôm nay</Text>
          <Text style={[styles.kpiValue, { color: COLORS.danger }]}>
            -{formatCurrency(todayStats.expense || 0)}
          </Text>
        </View>
      </View>

      {/* Urgent Alerts */}
      {((rentalAlerts?.vacantRooms?.length || 0) > 0 || (rentalAlerts?.pendingInvoicesCount || 0) > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cần xử lý</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
            {(rentalAlerts?.vacantRooms || []).map(room => (
              <TouchableOpacity key={room.id} style={styles.alertChip} onPress={() => navigation.navigate('Rental')}>
                <Ionicons name="home-outline" size={15} color={COLORS.warning} />
                <Text style={[styles.alertChipText, { color: COLORS.warning }]}>P.{room.name} trống</Text>
              </TouchableOpacity>
            ))}
            {(rentalAlerts?.pendingInvoicesCount || 0) > 0 && (
              <TouchableOpacity style={[styles.alertChip, { borderColor: COLORS.primary }]} onPress={() => navigation.navigate('Invoices')}>
                <Ionicons name="receipt-outline" size={15} color={COLORS.primary} />
                <Text style={[styles.alertChipText, { color: COLORS.primary }]}>{rentalAlerts.pendingInvoicesCount} hóa đơn chờ</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Vacant Rooms */}
      {(rentalAlerts?.vacantRooms?.length || 0) > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Phòng trống ({rentalAlerts.vacantRooms.length})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Rental', { filterTab: 'vacant' })}>
              <Text style={styles.sectionLink}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
            {rentalAlerts.vacantRooms.slice(0, 5).map((room) => (
              <View key={room.id} style={styles.vacantCard}>
                <View style={styles.vacantCardTop}>
                  <Text style={styles.vacantRoomName}>P.{room.name}</Text>
                  <Text style={styles.vacantPrice}>{formatCurrency(room.price)}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.vacantActionBtn} 
                  onPress={() => navigation.navigate('Rental', { openContractFor: room.id })}
                >
                  <Text style={styles.vacantActionText}>Tạo HĐ</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quick Actions (6 Nút) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickGridItem} onPress={() => navigation.navigate('Invoices', { initialFilter: 'not_created' })}>
            <View style={[styles.quickGridIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="receipt-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.quickGridLabel}>Hóa đơn</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickGridItem} onPress={() => navigation.navigate('Deposits')}>
            <View style={[styles.quickGridIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickGridLabel}>Tiền cọc</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickGridItem} onPress={() => navigation.navigate('Rental')}>
            <View style={[styles.quickGridIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="home-outline" size={22} color={COLORS.success} />
            </View>
            <Text style={styles.quickGridLabel}>Nhà trọ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickGridItem} onPress={() => navigation.navigate('WalletsManager')}>
            <View style={[styles.quickGridIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="wallet-outline" size={22} color="#D97706" />
            </View>
            <Text style={styles.quickGridLabel}>Ví tiền</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickGridItem} onPress={() => navigation.navigate('Transactions')}>
            <View style={[styles.quickGridIcon, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="swap-horizontal" size={22} color="#DB2777" />
            </View>
            <Text style={styles.quickGridLabel}>Giao dịch</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickGridItem} onPress={() => navigation.navigate('Tenants')}>
            <View style={[styles.quickGridIcon, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="people-outline" size={22} color="#0284C7" />
            </View>
            <Text style={styles.quickGridLabel}>Khách thuê</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modules */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phân hệ</Text>
        <View style={styles.moduleRow}>
          <TouchableOpacity style={styles.moduleCard} onPress={() => openModule('personal', 'Transactions')}>
            <View style={[styles.moduleIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="wallet-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.moduleTitle}>Tài chính</Text>
            <Text style={styles.moduleSub}>Thu / Chi cá nhân</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moduleCard} onPress={() => openModule('rental', 'Rental')}>
            <View style={[styles.moduleIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="business-outline" size={22} color={COLORS.success} />
            </View>
            <Text style={styles.moduleTitle}>Nhà trọ</Text>
            <Text style={styles.moduleSub}>Hóa đơn & hợp đồng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moduleCard} onPress={() => openModule('trading', 'Trading')}>
            <View style={[styles.moduleIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="cube-outline" size={22} color={COLORS.warning} />
            </View>
            <Text style={styles.moduleTitle}>Kinh doanh</Text>
            <Text style={styles.moduleSub}>Kho & lợi nhuận</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cash Flow Chart */}
      {chartData.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dòng tiền 6 tháng</Text>
          </View>
          <View style={styles.chartCard}>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
                <Text style={styles.legendText}>Thu</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
                <Text style={styles.legendText}>Chi</Text>
              </View>
            </View>
            <View style={styles.chartBars}>
              {chartData.slice(-6).map((d, idx) => {
                const max = Math.max(...chartData.map((x) => Math.max(x.income || 0, x.expense || 0)), 1);
                const hIncome = Math.max(4, ((d.income || 0) / max) * 72);
                const hExpense = Math.max(4, ((d.expense || 0) / max) * 72);
                return (
                  <View key={`bar-${idx}`} style={styles.barCol}>
                    <View style={styles.barGroup}>
                      <View style={[styles.bar, { height: hIncome, backgroundColor: COLORS.secondary }]} />
                      <View style={[styles.bar, { height: hExpense, backgroundColor: COLORS.danger }]} />
                    </View>
                    <Text style={styles.barLabel}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WalletsManager')}>
            <Text style={styles.sectionLink}>Quản lý sổ →</Text>
          </TouchableOpacity>
        </View>
        <TransactionsScreen navigation={navigation} isEmbedded />
      </View>
    </ScrollView>
  );

  if (isDesktopWeb) {
    return (
      <WebDesktopShell
        navigation={navigation}
        routeName="Dashboard"
        title={`Xin chào, ${userConfig?.account_name || 'Bạn'}`}
        subtitle="Bảng điều khiển tổng quan"
        searchPlaceholder="Tìm giao dịch, phòng, hàng tồn..."
      >
        <View style={styles.root}>{dashboardContent}</View>
      </WebDesktopShell>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Mobile Header */}
      <View style={styles.header}>
        <Logo size="sm" showText={false} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerApp}>TrọCare</Text>
          <Text numberOfLines={1} style={styles.headerSub}>
            {userConfig?.account_name || 'Vận hành nhà trọ'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Modules')}
            style={styles.headerBtn}
          >
            <Ionicons name="grid-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerBtn}
          >
            <Ionicons name="person-circle-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {dashboardContent}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction', personalWallet ? { walletId: personalWallet.id } : {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 110, gap: 0 },

  // Header
  header: {
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
  },
  headerCenter: { flex: 1 },
  headerApp: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium, letterSpacing: 0.3 },
  headerSub: { fontSize: 16, color: COLORS.textPrimary, ...FONTS.bold, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  heroCard: {
    marginTop: 8,
    marginBottom: 14,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: 24,
    ...SHADOW.md,
  },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', ...FONTS.medium, letterSpacing: 0.4 },
  heroValue: { fontSize: 36, color: '#fff', ...FONTS.black, marginTop: 6, marginBottom: 18 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStatItem: { flex: 1 },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', ...FONTS.medium, marginBottom: 3 },
  heroStatValue: { fontSize: 14, ...FONTS.bold },
  heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 16 },
  statDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    gap: 6,
    ...SHADOW.sm,
  },
  kpiIncome: {},
  kpiExpense: {},
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  kpiLabel: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  kpiValue: { fontSize: 15, ...FONTS.bold, color: COLORS.textPrimary },

  // Alerts
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningLight,
  },
  alertChipText: { fontSize: 12, ...FONTS.bold },

  // Sections
  section: { marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold, marginBottom: 12 },
  sectionLink: { fontSize: 12, color: COLORS.primary, ...FONTS.bold },

  // Quick Actions Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickGridItem: {
    width: '31%',
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...SHADOW.sm,
  },
  quickGridIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickGridLabel: { fontSize: 12, color: COLORS.textPrimary, ...FONTS.bold },

  // Vacant Rooms
  vacantCard: {
    width: 140,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 12,
    gap: 12,
    ...SHADOW.sm,
  },
  vacantCardTop: { gap: 4 },
  vacantRoomName: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold },
  vacantPrice: { fontSize: 13, color: COLORS.primary, ...FONTS.bold },
  vacantActionBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  vacantActionText: { color: '#fff', fontSize: 12, ...FONTS.bold },

  // Modules
  moduleRow: { flexDirection: 'row', gap: 10 },
  moduleCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOW.sm,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  moduleTitle: { fontSize: 12, color: COLORS.textPrimary, ...FONTS.bold },
  moduleSub: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  // Chart
  chartCard: {
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOW.sm,
  },
  chartLegend: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 88 },
  barCol: { alignItems: 'center', gap: 6, flex: 1 },
  barGroup: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 9, borderRadius: 4, opacity: 0.85 },
  barLabel: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.lg,
  },
});
