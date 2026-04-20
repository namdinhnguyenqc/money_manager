import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW, WEB } from '../../theme';
import SearchBar from '../SearchBar';
import SurfaceCard from './SurfaceCard';

const NAV_SECTIONS = [
  {
    title: 'Tong quan',
    items: [
      { route: 'Dashboard', label: 'Dashboard', icon: 'grid-outline' },
      { route: 'Analytics', label: 'Reports', icon: 'stats-chart-outline' },
      { route: 'Transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
    ],
  },
  {
    title: 'Van hanh',
    items: [
      { route: 'Rental', label: 'Cho thue', icon: 'home-outline' },
      { route: 'Invoices', label: 'Hoa don', icon: 'receipt-outline' },
      { route: 'Services', label: 'Dich vu', icon: 'construct-outline' },
      { route: 'Trading', label: 'Kho hang', icon: 'cube-outline' },
    ],
  },
  {
    title: 'He thong',
    items: [
      { route: 'WalletsManager', label: 'So & module', icon: 'wallet-outline' },
      { route: 'Settings', label: 'Settings', icon: 'settings-outline' },
    ],
  },
];

const ACTIVE_ROUTE_MAP = {
  Dashboard: 'Dashboard',
  Analytics: 'Analytics',
  Transactions: 'Transactions',
  AddTransaction: 'Transactions',
  Rental: 'Rental',
  ContractViewer: 'Rental',
  SmartBatchBilling: 'Invoices',
  Invoices: 'Invoices',
  Services: 'Services',
  Trading: 'Trading',
  TradingCategories: 'Trading',
  WalletsManager: 'WalletsManager',
  Modules: 'WalletsManager',
  Settings: 'Settings',
  BankConfig: 'Settings',
  Categories: 'Settings',
};

export default function WebDesktopShell({
  navigation,
  routeName,
  title,
  subtitle,
  children,
  headerAction = null,
  searchPlaceholder = 'Tim kiem...',
}) {
  const { height } = useWindowDimensions();
  const [shellSearch, setShellSearch] = useState('');
  const activeRoute = useMemo(() => ACTIVE_ROUTE_MAP[routeName] || routeName, [routeName]);
  const viewportHeight = Math.max(height || 0, 1);

  return (
    <View style={[styles.root, { height: viewportHeight }]}>
      <View style={styles.sidebar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>Money Manager Pro</Text>
            <Text style={styles.brandSub}>Desktop Workspace</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScroll}>
          {NAV_SECTIONS.map((section) => (
            <View key={section.title} style={styles.navSection}>
              <Text style={styles.navSectionTitle}>{section.title}</Text>
              {section.items.map((item) => {
                const isActive = activeRoute === item.route;
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                    onPress={() => navigation.navigate(item.route)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isActive ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>{item.label}</Text>
                    {isActive ? <View style={styles.navDot} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <SurfaceCard tone="low" style={styles.sidebarCard}>
          <Text style={styles.sidebarCardEyebrow}>WEB MODE</Text>
          <Text style={styles.sidebarCardTitle}>Admin-first UI</Text>
          <Text style={styles.sidebarCardText}>Website da duoc doi sang bo cuc desktop, uu tien van hanh va quet du lieu nhanh.</Text>
        </SurfaceCard>
      </View>

      <View style={styles.main}>
        <View style={styles.topBar}>
          <SearchBar
            value={shellSearch}
            onChangeText={setShellSearch}
            placeholder={searchPlaceholder}
            style={styles.search}
          />

          <View style={styles.utilityRow}>
            <TouchableOpacity style={styles.utilityBtn}>
              <Text style={styles.utilityText}>Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.utilityPrimary}>
              <Text style={styles.utilityPrimaryText}>Workspace</Text>
            </TouchableOpacity>
            <View style={styles.profileBadge}>
              <Ionicons name="person-outline" size={18} color={COLORS.textPrimary} />
            </View>
          </View>
        </View>

        {title || subtitle || headerAction ? (
          <View style={styles.pageHeader}>
            <View style={{ flex: 1 }}>
              {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
              {title ? <Text style={styles.pageTitle}>{title}</Text> : null}
            </View>
            {headerAction ? <View style={styles.pageAction}>{headerAction}</View> : null}
          </View>
        ) : null}

        <View style={styles.pageBody}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.surfacePage,
  },
  sidebar: {
    width: WEB.sidebarWidth,
    minHeight: 0,
    backgroundColor: COLORS.surfaceLowest,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderStrong,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  brandBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  brandSub: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },
  sidebarScroll: {
    paddingBottom: 16,
  },
  navSection: {
    marginBottom: 18,
  },
  navSectionTitle: {
    marginBottom: 8,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    ...FONTS.bold,
    textTransform: 'uppercase',
  },
  navItem: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  navItemText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONTS.semibold,
  },
  navItemTextActive: {
    color: COLORS.primaryDark,
  },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  sidebarCard: {
    marginTop: 'auto',
    backgroundColor: COLORS.surfaceLow,
  },
  sidebarCardEyebrow: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    ...FONTS.bold,
  },
  sidebarCardTitle: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  sidebarCardText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    paddingHorizontal: WEB.shellPaddingX,
    paddingTop: WEB.shellPaddingY,
    paddingBottom: 22,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WEB.shellGap,
  },
  search: {
    flex: 1,
    maxWidth: 520,
    backgroundColor: COLORS.surfaceLowest,
  },
  utilityRow: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  utilityBtn: {
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLowest,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  utilityText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    ...FONTS.bold,
  },
  utilityPrimary: {
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    ...SHADOW.sm,
  },
  utilityPrimaryText: {
    color: '#fff',
    fontSize: 12,
    ...FONTS.bold,
  },
  profileBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLowest,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeader: {
    marginTop: 24,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  pageSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    ...FONTS.bold,
    textTransform: 'uppercase',
  },
  pageTitle: {
    marginTop: 6,
    fontSize: 34,
    color: COLORS.textPrimary,
    ...FONTS.black,
    letterSpacing: -0.4,
  },
  pageAction: {
    marginLeft: 'auto',
  },
  pageBody: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
});
