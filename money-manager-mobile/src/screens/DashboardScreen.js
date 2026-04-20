import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, useWindowDimensions } from 'react-native';
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
} from '../database/queries';
import TransactionsScreen from './TransactionsScreen';
import SurfaceCard from '../components/ui/SurfaceCard';
import WebDesktopShell from '../components/ui/WebDesktopShell';

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [netWorth, setNetWorth] = useState({ cashBalance: 0, inventoryValue: 0, totalNetWorth: 0 });
  const [wallets, setWallets] = useState([]);
  const [userConfig, setUserConfig] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [todayStats, setTodayStats] = useState({ income: 0, expense: 0, balance: 0 });

  const loadData = useCallback(async () => {
    try {
      const [nw, ws, cfg, chart, today] = await Promise.all([
        getGlobalNetWorth(),
        getWallets(),
        getBankConfig(),
        getLast6MonthsStats(),
        getTodayStats(),
      ]);
      setNetWorth(nw);
      setWallets(ws);
      setUserConfig(cfg);
      setChartData(chart);
      setTodayStats(today);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openModule = (type, route) => {
    const wallet = wallets.find((x) => x.type === type);
    navigation.navigate(route, wallet ? { walletId: wallet.id, walletName: wallet.name } : {});
  };

  const personalWallet = wallets.find((w) => w.type === 'personal');
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb;
  const contentMaxWidth = width >= 1440 ? 1240 : width >= 1024 ? 1120 : 960;

  const dashboardContent = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={[styles.container, isDesktopWeb && styles.containerDesktop, !isDesktopWeb && isWeb && styles.containerWeb, { maxWidth: isDesktopWeb ? undefined : contentMaxWidth }]}>
        <View style={[styles.heroLayout, isWeb && styles.heroLayoutWeb]}>
          <SurfaceCard tone="lowest" style={styles.hero}>
            <Text style={styles.heroLabel}>Tong tai san</Text>
            <Text style={styles.heroValue}>{formatCurrency(netWorth.totalNetWorth || 0)}</Text>
            <View style={styles.heroRow}>
              <View style={[styles.kpiDot, { backgroundColor: COLORS.secondary }]} />
              <Text style={styles.heroSub}>Tien mat {formatCurrency(netWorth.cashBalance || 0)}</Text>
            </View>
            <View style={styles.heroRow}>
              <View style={[styles.kpiDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.heroSub}>Hang ton {formatCurrency(netWorth.inventoryValue || 0)}</Text>
            </View>
          </SurfaceCard>

          {isWeb ? (
            <SurfaceCard tone="low" style={styles.heroNote}>
              <Text style={styles.heroNoteEyebrow}>DASHBOARD WEB</Text>
              <Text style={styles.heroNoteTitle}>Bang tong quan van hanh</Text>
              <Text style={styles.heroNoteText}>Trang tong hop du lieu duoc chinh lai theo bo cuc desktop: khu tong quan, luong cong viec va danh sach giao dich gan day de thao tac nhanh.</Text>
            </SurfaceCard>
          ) : null}
        </View>

        <View style={styles.todayRow}>
          <SurfaceCard tone="high" style={styles.todayCard}>
            <Ionicons name="arrow-down-circle" size={18} color={COLORS.secondary} />
            <Text style={styles.todayLabel}>Thu hom nay</Text>
            <Text style={[styles.todayValue, { color: COLORS.secondary }]}>+{formatCurrency(todayStats.income || 0)}</Text>
          </SurfaceCard>
          <SurfaceCard tone="high" style={styles.todayCard}>
            <Ionicons name="arrow-up-circle" size={18} color={COLORS.danger} />
            <Text style={styles.todayLabel}>Chi hom nay</Text>
            <Text style={[styles.todayValue, { color: COLORS.danger }]}>-{formatCurrency(todayStats.expense || 0)}</Text>
          </SurfaceCard>
        </View>

        <View style={[styles.quickRow, isWeb && styles.quickRowWeb]}>
          <TouchableOpacity
            style={[styles.quickAction, styles.quickActionPrimary]}
            onPress={() => navigation.navigate('Invoices', { initialFilter: 'not_created' })}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="document-text-outline" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickActionTitle}>Hoa don thang nay</Text>
              <Text style={styles.quickActionText}>Mo ngay danh sach phong chua lap bill trong thang hien tai.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('SmartBatchBilling')}
          >
            <View style={[styles.quickActionIcon, styles.quickActionIconSoft]}>
              <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickActionTitleDark}>Lap bill hang loat</Text>
              <Text style={styles.quickActionTextDark}>Mo luong xu ly nhieu phong khi den ky chot tien.</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.moduleRow, isWeb && styles.moduleRowWeb]}>
          <TouchableOpacity style={styles.moduleCard} onPress={() => openModule('personal', 'Transactions')}>
            <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
            <Text style={styles.moduleTitle}>Tai chinh ca nhan</Text>
            <Text style={styles.moduleSub}>Thu chi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moduleCard} onPress={() => openModule('rental', 'Rental')}>
            <Ionicons name="home-outline" size={24} color={COLORS.primary} />
            <Text style={styles.moduleTitle}>Quan ly nha tro</Text>
            <Text style={styles.moduleSub}>Hoa don va hop dong</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moduleCard} onPress={() => openModule('trading', 'Trading')}>
            <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
            <Text style={styles.moduleTitle}>Kinh doanh</Text>
            <Text style={styles.moduleSub}>Nhap xuat va loi nhuan</Text>
          </TouchableOpacity>
        </View>

        <SurfaceCard tone="low" style={styles.chartWrap}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Dong tien 6 thang</Text>
            <Text style={styles.sectionSub}>T1-T6</Text>
          </View>
          <View style={styles.chartBars}>
            {chartData.slice(-6).map((d, idx) => {
              const max = Math.max(...chartData.map((x) => Math.max(x.income || 0, x.expense || 0)), 1);
              const h = Math.max(10, ((d.income || 0) / max) * 84);
              return (
                <View key={`${idx}-${d.label}`} style={styles.barCol}>
                  <View style={[styles.bar, { height: h }]} />
                  <Text style={styles.barLabel}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        </SurfaceCard>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Giao dich gan day</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WalletsManager')}>
            <Text style={styles.sectionLink}>Quan ly so</Text>
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
        title={`Chao buoi sang, ${userConfig?.account_name || 'Van A'}`}
        subtitle="Bang dieu khien chien luoc"
        searchPlaceholder="Tim kiem giao dich, phong, kho..."
      >
        <View style={styles.root}>{dashboardContent}</View>
      </WebDesktopShell>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={[styles.topBar, isWeb && styles.topBarWeb, { maxWidth: contentMaxWidth }]}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greet}>Money Manager Pro</Text>
          <Text numberOfLines={1} style={styles.name}>{userConfig?.account_name || 'Tong quan tai chinh'}</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Modules')} style={styles.iconBtn}>
            <Ionicons name="grid-outline" size={19} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
            <Ionicons name="options-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {dashboardContent}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction', personalWallet ? { walletId: personalWallet.id } : {})}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  topBar: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarWeb: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: 22,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: { flexDirection: 'row', gap: 8 },
  greet: { fontSize: 12, color: COLORS.textMuted, ...FONTS.medium },
  name: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  container: { paddingHorizontal: 16, gap: 14 },
  containerDesktop: { gap: 16 },
  containerWeb: { width: '100%', alignSelf: 'center' },
  heroLayout: { gap: 12 },
  heroLayoutWeb: { flexDirection: 'row', alignItems: 'stretch' },
  hero: {
    minHeight: 176,
    justifyContent: 'center',
    flex: 1.2,
  },
  heroLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted, marginBottom: 8 },
  heroValue: { fontSize: 34, color: COLORS.textPrimary, ...FONTS.black, marginBottom: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  kpiDot: { width: 8, height: 8, borderRadius: 4 },
  heroSub: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  heroNote: { flex: 0.95, justifyContent: 'center' },
  heroNoteEyebrow: { color: COLORS.textMuted, fontSize: 11, ...FONTS.bold, letterSpacing: 0.4 },
  heroNoteTitle: { marginTop: 8, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  heroNoteText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, ...FONTS.medium },
  todayRow: { flexDirection: 'row', gap: 10 },
  todayCard: { flex: 1, minHeight: 96, justifyContent: 'center', gap: 6 },
  todayLabel: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  todayValue: { fontSize: 15, ...FONTS.bold },
  quickRow: { gap: 10 },
  quickRowWeb: { flexDirection: 'row', alignItems: 'stretch' },
  quickAction: {
    flex: 1,
    minHeight: 84,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLowest,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOW.sm,
  },
  quickActionPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconSoft: {
    backgroundColor: COLORS.primaryLight,
  },
  quickActionTitle: { color: '#fff', fontSize: 14, ...FONTS.bold },
  quickActionText: { marginTop: 4, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 18, ...FONTS.medium },
  quickActionTitleDark: { color: COLORS.textPrimary, fontSize: 14, ...FONTS.bold },
  quickActionTextDark: { marginTop: 4, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, ...FONTS.medium },
  moduleRow: { flexDirection: 'row', gap: 10 },
  moduleRowWeb: { alignItems: 'stretch' },
  moduleCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOW.sm,
  },
  moduleTitle: { fontSize: 12, color: COLORS.textPrimary, ...FONTS.bold, marginTop: 8 },
  moduleSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  chartWrap: { minHeight: 164 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, color: COLORS.textPrimary, ...FONTS.semibold },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  sectionLink: { fontSize: 12, color: COLORS.primary, ...FONTS.bold },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 106, marginTop: 16 },
  barCol: { alignItems: 'center', gap: 6 },
  bar: { width: 14, backgroundColor: COLORS.primary, borderRadius: 8 },
  barLabel: { fontSize: 10, color: COLORS.textMuted, ...FONTS.medium },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.lg,
  },
});
