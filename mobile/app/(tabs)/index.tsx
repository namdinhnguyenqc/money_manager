/**
 * TrọCare Mobile — Dashboard Screen
 * Dual-segmented premium dashboard: Room Rental & Trading Business.
 * Interactive charts, KPI aggregates, visual financial progress bars, refined micro-animations.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import { apiGet } from '@/lib/api';
import { logPerfEvent, markFirstScreenReady } from '@/lib/telemetry/appPerformance';

interface DashboardData {
  facilities: any[];
  rooms: any[];
  invoices: any[];
  wallets: any[];
  tradingStats: {
    unsoldCapital: number;
    unsoldCount: number;
    realizedProfit: number;
    soldCount: number;
  } | null;
  recentTransactions: any[];
  deposits: any[];
}

const formatMoney = (value?: number | null) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)))} ₫`;

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [ledgerTab, setLedgerTab] = useState<'paid' | 'cashflow'>('paid');

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      const res = await apiGet<any>('/owner/dashboard-init', { forceRefresh });

      setData({
        facilities: res?.boardingHouses ?? [],
        rooms: res?.rooms ?? [],
        invoices: res?.invoices ?? [],
        wallets: res?.wallets ?? [],
        tradingStats: res?.tradingStats ?? null,
        recentTransactions: res?.transactions ?? [],
        deposits: res?.deposits ?? [],
      });
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!loading) {
      markFirstScreenReady({ screen: "dashboard", hasData: Boolean(data) });
    }
  }, [data, loading]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingLogoBadge}>
          <Image
            source={require('@/assets/brand/transparent/trocare-symbol-tc-transparent-256.png')}
            style={styles.loadingLogo}
            resizeMode="contain"
            onLoadStart={() => logPerfEvent("IMAGE_LOAD_START", { image: "dashboard_loading_logo" })}
            onLoadEnd={() => logPerfEvent("IMAGE_LOAD_DONE", { image: "dashboard_loading_logo" })}
          />
        </View>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingTitle}>Đang tải dữ liệu</Text>
        <Text style={styles.loadingSubtitle}>Chuẩn bị dashboard quản lý của bạn...</Text>
      </View>
    );
  }

  // Room Rental calculations
  const rooms = data?.rooms || [];
  const invoices = data?.invoices || [];
  const totalRooms = rooms.length;
  const vacant = rooms.filter((r: any) => r.status === 'vacant').length;
  const occupied = rooms.filter((r: any) => r.status === 'occupied').length;
  const maintenance = rooms.filter((r: any) => r.status === 'maintenance').length;
  const reserved = rooms.filter((r: any) => r.status === 'reserved').length;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Financial calculations
  const monthInvoices = invoices.filter((i: any) => i.month === currentMonth && i.year === currentYear);
  const totalExpected = monthInvoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
  const totalCollected = monthInvoices.reduce((sum: number, i: any) => sum + Number(i.paid_amount || 0), 0);
  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const collectedPercentage = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const unpaidCount = monthInvoices.filter((i: any) => {
    const paid = Number(i.paid_amount || 0);
    const total = Number(i.total_amount || 0);
    return paid < total;
  }).length;

  // New detailed report calculations (month transactions)
  const thisMonthTxs = (data?.recentTransactions || []).filter((t: any) => {
    if (!t.date) return false;
    const td = new Date(t.date);
    return td.getMonth() + 1 === currentMonth && td.getFullYear() === currentYear;
  });
  const totalIncome = thisMonthTxs.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const totalExpense = thisMonthTxs.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const totalDepositsHeld = (data?.deposits || [])
    .filter((d: any) => d.status === 'holding')
    .reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);

  // Trading Business calculations
  const tradingStats = data?.tradingStats || { unsoldCapital: 0, unsoldCount: 0, realizedProfit: 0, soldCount: 0 };
  const wallets = data?.wallets || [];
  const tradingWallet = wallets.find((w: any) => w.type === 'trading') || wallets[0];
  const recentInvoices = invoices.slice(0, 4);

  const paidMonthInvoices = monthInvoices.filter((i: any) => {
    const paid = Number(i.paid_amount || 0);
    const total = Number(i.total_amount || 0);
    return paid >= total && total > 0;
  });
  const overdueInvoices = invoices.filter((i: any) => {
    const paid = Math.round(Number(i.paid_amount || 0));
    const total = Math.round(Number(i.total_amount || 0));
    const isPastPeriod = Number(i.year || 0) < currentYear || (Number(i.year || 0) === currentYear && Number(i.month || 0) < currentMonth);
    return isPastPeriod && total > 0 && paid < total;
  });
  const overdueAmount = overdueInvoices.reduce((sum: number, i: any) => (
    sum + Math.max(0, Number(i.total_amount || 0) - Number(i.paid_amount || 0))
  ), 0);

  const thisMonthTransactions = thisMonthTxs.slice(0, 4);

  const totalBalance = (data?.wallets || []).reduce((sum: number, w: any) => sum + Number(w.balance || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.subContainer}>
        {/* Premium Balance Header Card */}
        <View style={styles.headerBalanceCard}>
          <View style={styles.balanceHeaderRow}>
            <View>
              <Text style={styles.balanceTitle}>TỔNG SỐ DƯ KHẢ DỤNG</Text>
              <Text style={styles.balanceValText}>
                {hideBalance ? '••••••' : (
                  <>
                    {new Intl.NumberFormat('vi-VN').format(Math.round(Number(totalBalance || 0)))}{' '}
                    <Text style={{ textDecorationLine: 'underline' }}>đ</Text>
                  </>
                )}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setHideBalance(!hideBalance)} style={styles.eyeBtn}>
              <Ionicons
                name={hideBalance ? 'eye-off' : 'eye'}
                size={22}
                color="#0056D2"
              />
            </TouchableOpacity>
          </View>

          {/* Quick Balance Actions inside Card */}
          <View style={styles.balanceActionsRow}>
            <TouchableOpacity
              style={styles.balanceActionItem}
              onPress={() => router.push('/transactions/new')}
              activeOpacity={0.7}
            >
              <View style={styles.balanceActionIcon}>
                <Ionicons name="arrow-down-outline" size={20} color="#0056D2" />
              </View>
              <Text style={styles.balanceActionLabel}>Lập phiếu thu</Text>
            </TouchableOpacity>

            <View style={styles.balanceActionDivider} />

            <TouchableOpacity
              style={styles.balanceActionItem}
              onPress={() => router.push('/transactions/new')}
              activeOpacity={0.7}
            >
              <View style={styles.balanceActionIcon}>
                <Ionicons name="arrow-up-outline" size={20} color="#0056D2" />
              </View>
              <Text style={styles.balanceActionLabel}>Lập phiếu chi</Text>
            </TouchableOpacity>

            <View style={styles.balanceActionDivider} />

            <TouchableOpacity
              style={styles.balanceActionItem}
              onPress={() => router.push('/(tabs)/transactions')}
              activeOpacity={0.7}
            >
              <View style={styles.balanceActionIcon}>
                <Ionicons name="reader-outline" size={20} color="#0056D2" />
              </View>
              <Text style={styles.balanceActionLabel}>Xem sổ quỹ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* iOS Storage-style Unified Room Status Bar */}
        <Card style={styles.roomStatusBarCard}>
          <View style={styles.roomStatusHeader}>
            <Ionicons name="bed-outline" size={18} color={Colors.primary} />
            <Text style={styles.roomStatusTitle}>Trạng thái phòng trọ ({totalRooms} phòng)</Text>
          </View>

          {/* Proportional Segment Bar */}
          <View style={styles.proportionalBar}>
            {occupied > 0 && (
              <View style={[styles.barSegment, { flex: occupied, backgroundColor: Colors.primary }]} />
            )}
            {vacant > 0 && (
              <View style={[styles.barSegment, { flex: vacant, backgroundColor: Colors.successDark }]} />
            )}
            {reserved > 0 && (
              <View style={[styles.barSegment, { flex: reserved, backgroundColor: Colors.warning }]} />
            )}
            {maintenance > 0 && (
              <View style={[styles.barSegment, { flex: maintenance, backgroundColor: Colors.danger }]} />
            )}
            {totalRooms === 0 && (
              <View style={[styles.barSegment, { flex: 1, backgroundColor: Colors.border }]} />
            )}
          </View>

          {/* Legends Grid */}
          <View style={styles.roomLegendsRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.legendLabel}>Đang thuê ({occupied})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.successDark }]} />
              <Text style={styles.legendLabel}>Trống ({vacant})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
              <Text style={styles.legendLabel}>Đã cọc ({reserved})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
              <Text style={styles.legendLabel}>Bảo trì ({maintenance})</Text>
            </View>
          </View>
        </Card>

        {/* MoMo-style Grid of Utilities / Quick Actions */}
        <View style={styles.momoGridSection}>
          <Text style={styles.momoSectionTitle}>Tác vụ nhanh quản lý</Text>
          <View style={styles.momoGrid}>
            <View style={styles.momoRow}>
              <TouchableOpacity style={styles.momoItem} onPress={() => router.push('/invoice/new')}>
                <View style={[styles.momoIconWrapper, { backgroundColor: '#e0f2fe' }]}>
                  <Ionicons name="receipt-outline" size={20} color="#0284c7" />
                </View>
                <Text style={styles.momoLabel}>Tạo hóa đơn</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.momoItem} onPress={() => router.push('/payment/new')}>
                <View style={[styles.momoIconWrapper, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="cash-outline" size={20} color="#15803d" />
                </View>
                <Text style={styles.momoLabel}>Thu tiền</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.momoItem} onPress={() => router.push('/deposit/new')}>
                <View style={[styles.momoIconWrapper, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="bookmark-outline" size={20} color="#b45309" />
                </View>
                <Text style={styles.momoLabel}>Nhận cọc</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.momoItem} onPress={() => router.push('/contract/new')}>
                <View style={[styles.momoIconWrapper, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons name="document-attach-outline" size={20} color="#7e22ce" />
                </View>
                <Text style={styles.momoLabel}>Tạo hợp đồng</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.momoRow}>
              <TouchableOpacity style={styles.momoItem} onPress={() => router.push('/tenants')}>
                <View style={[styles.momoIconWrapper, { backgroundColor: '#ecfeff' }]}>
                  <Ionicons name="people-outline" size={20} color="#0e7490" />
                </View>
                <Text style={styles.momoLabel}>Khách thuê</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.momoItem} onPress={() => router.push('/(tabs)/facilities')}>
                <View style={[styles.momoIconWrapper, { backgroundColor: '#fce7f3' }]}>
                  <Ionicons name="business-outline" size={20} color="#be185d" />
                </View>
                <Text style={styles.momoLabel}>Dãy trọ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.momoItem} onPress={() => router.push('/(tabs)/transactions')}>
                <View style={[styles.momoIconWrapper, { backgroundColor: '#ffe4e6' }]}>
                  <Ionicons name="list-outline" size={20} color="#be123c" />
                </View>
                <Text style={styles.momoLabel}>Sổ quỹ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.momoItem} onPress={() => router.push('/wallets')}>
                <View style={[styles.momoIconWrapper, { backgroundColor: '#ccfbf1' }]}>
                  <Ionicons name="wallet-outline" size={20} color="#0f766e" />
                </View>
                <Text style={styles.momoLabel}>Tài khoản ví</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Premium Rental Financial Analytics Widget */}
        <Card style={styles.financialCard}>
          <View style={styles.financialHeader}>
            <View>
              <Text style={styles.financialTitle}>Tiền thuê tháng {currentMonth}</Text>
              <Text style={styles.financialSubtitle}>Đã thu vs Chưa thu hóa đơn</Text>
            </View>
            <StatusBadge status={unpaidCount > 0 ? 'sent' : 'paid'} type="invoice" />
          </View>

          <View style={styles.amountShowRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Đã thu</Text>
              <Text style={[styles.amountVal, { color: Colors.successDark }]}>{formatMoney(totalCollected)}</Text>
            </View>
            <View style={styles.dividerVertical} />
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Chưa thu</Text>
              <Text style={[styles.amountVal, { color: Colors.danger }]}>{formatMoney(totalOutstanding)}</Text>
            </View>
          </View>

          {/* Visual Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.max(5, Math.min(100, collectedPercentage))}%` }]} />
            </View>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>{Math.round(collectedPercentage)}% đã thu</Text>
              <Text style={styles.progressLabelRight}>{formatMoney(totalExpected)} tổng mục tiêu</Text>
            </View>
          </View>
        </Card>

        {overdueInvoices.length > 0 && (
          <TouchableOpacity
            style={styles.overdueAlertCard}
            onPress={() => router.push('/(tabs)/invoices')}
            activeOpacity={0.78}
          >
            <View style={styles.overdueAlertIcon}>
              <Ionicons name="warning-outline" size={20} color={Colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.overdueAlertTitle}>
                Có {overdueInvoices.length} hóa đơn quá hạn
              </Text>
              <Text style={styles.overdueAlertText}>
                Còn phải thu {formatMoney(overdueAmount)} từ các kỳ đã qua.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.danger} />
          </TouchableOpacity>
        )}

        {/* Premium Financial Report Panel */}
        <Card style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <View style={styles.reportTitleRow}>
              <Ionicons name="bar-chart-outline" size={18} color={Colors.primary} />
              <Text style={styles.reportTitle}>Báo cáo tài chính tháng {currentMonth}</Text>
            </View>
            <Text style={styles.reportSubtitle}>Doanh thu đã thu, chi phí vận hành & lợi nhuận thực tế</Text>
          </View>

          <View style={styles.reportGrid}>
            <View style={styles.reportRow}>
              <View style={[styles.reportItem, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                <View style={styles.reportItemHeader}>
                  <Ionicons name="wallet-outline" size={15} color={Colors.primary} />
                  <Text style={styles.reportItemLabel}>Lợi nhuận ròng</Text>
                </View>
                <Text style={[styles.reportItemVal, { color: netProfit >= 0 ? Colors.primary : Colors.danger }]}>
                  {formatMoney(netProfit)}
                </Text>
              </View>

              <View style={[styles.reportItem, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
                <View style={styles.reportItemHeader}>
                  <Ionicons name="shield-checkmark-outline" size={15} color="#0284c7" />
                  <Text style={styles.reportItemLabel}>Tiền cọc giữ hộ</Text>
                </View>
                <Text style={[styles.reportItemVal, { color: '#0284c7' }]}>
                  {formatMoney(totalDepositsHeld)}
                </Text>
              </View>
            </View>

            <View style={styles.reportRow}>
              <View style={[styles.reportItem, { backgroundColor: '#eff6ff', borderColor: '#93c5fd' }]}>
                <View style={styles.reportItemHeader}>
                  <Ionicons name="trending-up-outline" size={15} color="#1d4ed8" />
                  <Text style={styles.reportItemLabel}>Doanh thu đã thu</Text>
                </View>
                <Text style={[styles.reportItemVal, { color: '#1d4ed8' }]}>
                  {formatMoney(totalIncome)}
                </Text>
              </View>

              <View style={[styles.reportItem, { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }]}>
                <View style={styles.reportItemHeader}>
                  <Ionicons name="trending-down-outline" size={15} color="#475569" />
                  <Text style={styles.reportItemLabel}>Chi phí vận hành</Text>
                </View>
                <Text style={[styles.reportItemVal, { color: '#475569' }]}>
                  {formatMoney(totalExpense)}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 }} />

          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 }}
            onPress={() => router.push('/(tabs)/reports')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.primary }}>
              Xem báo cáo chi tiết
            </Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* Simplified Invoice Ledger & Sổ Thu Chi Segment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.ledgerTabContainer}>
              <TouchableOpacity 
                style={[styles.ledgerTabBtn, ledgerTab === 'paid' && styles.ledgerTabBtnActive]} 
                onPress={() => setLedgerTab('paid')}
                activeOpacity={0.72}
              >
                <Text style={[styles.ledgerTabText, ledgerTab === 'paid' && styles.ledgerTabTextActive]}>
                  HĐ đã thanh toán
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.ledgerTabBtn, ledgerTab === 'cashflow' && styles.ledgerTabBtnActive]} 
                onPress={() => setLedgerTab('cashflow')}
                activeOpacity={0.72}
              >
                <Text style={[styles.ledgerTabText, ledgerTab === 'cashflow' && styles.ledgerTabTextActive]}>
                  Sổ thu chi tháng
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => router.push(ledgerTab === 'paid' ? '/(tabs)/invoices' : '/(tabs)/transactions')}>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {ledgerTab === 'paid' ? (
            paidMonthInvoices.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="shield-checkmark-outline" size={32} color={Colors.textMuted} style={{ alignSelf: 'center', marginBottom: 6 }} />
                <Text style={styles.emptyText}>Chưa có hóa đơn nào đã thu</Text>
              </Card>
            ) : (
              paidMonthInvoices.map((inv: any) => (
                <TouchableOpacity
                  key={inv.id}
                  style={styles.invoiceItem}
                  onPress={() => router.push(`/invoice/${inv.id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceRoom}>{inv.room_name || `Phòng`}</Text>
                    <Text style={styles.invoicePeriod}>
                      T{inv.month}/{inv.year} · {inv.tenant_name || 'Khách thuê'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.invoiceAmount}>{formatMoney(inv.total_amount)}</Text>
                    <StatusBadge status="paid" type="invoice" />
                  </View>
                </TouchableOpacity>
              ))
            )
          ) : (
            thisMonthTransactions.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="list-outline" size={32} color={Colors.textMuted} style={{ alignSelf: 'center', marginBottom: 6 }} />
                <Text style={styles.emptyText}>Chưa phát sinh giao dịch nào</Text>
              </Card>
            ) : (
              thisMonthTransactions.map((tx: any) => {
                const isIncome = tx.type === 'income';
                return (
                  <View key={tx.id} style={styles.invoiceItem}>
                    <View style={styles.txIconCol}>
                      <View style={[styles.txIconWrapper, { backgroundColor: isIncome ? 'rgba(13, 148, 136, 0.08)' : 'rgba(244, 63, 94, 0.08)' }]}>
                        <Ionicons 
                          name={isIncome ? 'arrow-down' : 'arrow-up'} 
                          size={14} 
                          color={isIncome ? Colors.successDark : Colors.danger} 
                        />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceRoom} numberOfLines={1}>{tx.description || 'Giao dịch không tên'}</Text>
                      <Text style={styles.invoicePeriod}>
                        {tx.date ? new Date(tx.date).toLocaleDateString('vi-VN') : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text style={[styles.txAmountText, { color: isIncome ? Colors.successDark : Colors.danger }]}>
                        {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}10` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function QuickGridAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickGridAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}10` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  loadingLogoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 18,
  },
  loadingLogo: {
    width: 52,
    height: 52,
  },
  loadingTitle: {
    marginTop: 14,
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  loadingSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primaryLight,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semibold,
  },
  subContainer: {
    gap: 16,
  },
  kpiGrid: {
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCardItem: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderLeftWidth: 4,
  },
  kpiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kpiCardLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  kpiCardVal: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  financialCard: {
    padding: 18,
  },
  financialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  financialTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  financialSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  amountShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 14,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  amountVal: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    marginTop: 2,
  },
  dividerVertical: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  progressContainer: {
    gap: 6,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
  progressLabelRight: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  overdueAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFF7F9',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.22)',
  },
  overdueAlertIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
  },
  overdueAlertTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },
  overdueAlertText: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  seeAll: { fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.primary },
  headerBalanceCard: {
    backgroundColor: '#D6E8FC',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C0D5FC',
    shadowColor: '#0056D2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0056D2',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  balanceValText: {
    fontSize: 32,
    fontFamily: Typography.fontFamily.bold,
    color: '#002E7A',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  eyeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#A8C9F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#0056D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceActionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  balanceActionDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E4EDF8',
    alignSelf: 'center',
  },
  balanceActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceActionLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#002E7A',
  },
  roomStatusBarCard: {
    padding: 16,
    marginBottom: 16,
  },
  roomStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  roomStatusTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  proportionalBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e2e8f0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  barSegment: {
    height: '100%',
  },
  roomLegendsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  momoGridSection: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  momoSectionTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  momoGrid: {
    gap: 16,
  },
  momoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  momoItem: {
    width: 68,
    alignItems: 'center',
    gap: 6,
  },
  momoIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momoLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  invoiceRoom: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  invoicePeriod: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  walletCard: {
    padding: 18,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.appleBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  walletName: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  walletIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  walletBalance: {
    fontSize: 26,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginTop: 10,
    letterSpacing: -0.5,
  },
  walletSubtext: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 15,
  },
  tradingPromoCard: {
    padding: 16,
    backgroundColor: '#fffdf5',
    borderColor: '#fef08a',
    gap: 8,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promoTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  promoDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  promoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  promoBtnText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textWhite,
  },
  reportCard: {
    padding: 16,
  },
  reportHeader: {
    marginBottom: 12,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  reportSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  reportGrid: {
    gap: 8,
  },
  reportRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reportItem: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  reportItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reportItemLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  reportItemVal: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickGridAction: {
    width: '31.3%',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  ledgerTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 3,
    borderRadius: 10,
    gap: 2,
  },
  ledgerTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  ledgerTabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ledgerTabText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  ledgerTabTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  txIconCol: {
    marginRight: 10,
    justifyContent: 'center',
  },
  txIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txAmountText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
  },
});
