/**
 * TrọCare Mobile — Breakthrough Ethereal Aurora & Porcelain Reports Screen
 * A masterpiece of mobile analytical design under Senior UI/UX guidelines:
 * - Simple crisp white porcelain cards (#FFFFFF) floating on premium matte Alabaster snow backing (#F4F4F6).
 * - Ultra-soft rounded corners (borderRadius: 24) matching modern iOS.
 * - Ethereal, faint colored-shadow underglows (e.g. mint underglow for income, coral underglow for expense).
 * - Multi-month, this year, and historical multi-year comparisons for complete long-term financial visibility.
 * - Glossy 3D visual cylinder bars with realistic drop shadows standing on a pristine alabaster floor.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import { apiGet } from '@/lib/api';
import { formatMoney } from '@/lib/rentalOps';

type TimePeriod = 'month' | 'quarter' | 'year' | 'multi_year';
type MonthlyTrend = {
  label: string;
  month: number;
  year: number;
  income: number;
  expense: number;
};

export default function BoardingHouseReportTab() {
  const router = useRouter();

  // Loading & Refresh States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Raw Database Data
  const [facilities, setFacilities] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Selected analytical period (Month, Quarter, Year, Multi-Year)
  const [period, setPeriod] = useState<TimePeriod>('month');

  // Load database statistics
  const fetchReportData = useCallback(async () => {
    try {
      const [facRes, roomRes, invRes, txRes] = await Promise.all([
        apiGet<any>('/owner/boarding-houses'),
        apiGet<any>('/rental/rooms'),
        apiGet<any>('/invoices'),
        apiGet<any>('/transactions?limit=250'),
      ]);

      setFacilities(facRes?.data ?? []);
      setRooms(roomRes?.data ?? []);
      setInvoices(invRes?.data ?? []);
      setTransactions(txRes?.data ?? []);
    } catch (e) {
      console.error('Failed to load analytical data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReportData();
  };

  // Filter transactions based on period selection (Month, Quarter, Year, Multi-Year)
  const periodTxs = useMemo(() => {
    const now = new Date();
    return transactions.filter((t: any) => {
      if (!t.date) return false;
      const td = new Date(t.date);
      const diffTime = Math.abs(now.getTime() - td.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (period === 'month') return diffDays <= 30;
      if (period === 'quarter') return diffDays <= 90;
      if (period === 'year') return diffDays <= 365;
      return true; // Multi-year shows all
    });
  }, [transactions, period]);

  // Analytical Calculations
  const totalIncome = useMemo(() => periodTxs.filter((t: any) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0), [periodTxs]);
  const totalExpense = useMemo(() => periodTxs.filter((t: any) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0), [periodTxs]);
  const netCashFlow = totalIncome - totalExpense;

  const oer = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const occupancyRate = rooms.length > 0 ? (rooms.filter((r: any) => r.status === 'occupied').length / rooms.length) * 100 : 0;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const activeMonthInvoices = invoices.filter((i: any) => i.month === currentMonth && i.year === currentYear);
  const totalExpectedBilling = activeMonthInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
  const totalCollectedBilling = activeMonthInvoices.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0);
  const debtCollectionRate = totalExpectedBilling > 0 ? (totalCollectedBilling / totalExpectedBilling) * 100 : 0;

  const arpu = rooms.filter((r: any) => r.status === 'occupied').length > 0 ? totalIncome / rooms.filter((r: any) => r.status === 'occupied').length : 0;

  // Revenue structural analysis aligned with fresh pastel-porcelain guidelines
  const revenueBreakdown = useMemo(() => {
    let roomRent = 0;
    let electricity = 0;
    let water = 0;
    let services = 0;

    periodTxs.filter((t: any) => t.type === 'income').forEach((t: any) => {
      const desc = String(t.description || '').toLowerCase();
      const catName = String(t.category_name || '').toLowerCase();
      const amount = Number(t.amount || 0);

      if (desc.includes('tiền phòng') || desc.includes('tien phong') || catName.includes('phòng') || catName.includes('rent')) {
        roomRent += amount;
      } else if (desc.includes('điện') || desc.includes('dien') || catName.includes('điện') || catName.includes('electricity')) {
        electricity += amount;
      } else if (desc.includes('nước') || desc.includes('nuoc') || catName.includes('nước') || catName.includes('water')) {
        water += amount;
      } else {
        services += amount;
      }
    });

    const total = roomRent + electricity + water + services;
    if (total === 0) return [];
    return [
      { name: 'Tiền phòng', value: roomRent, percentage: (roomRent / total) * 100, color: '#8A3FFC' },
      { name: 'Tiền điện', value: electricity, percentage: (electricity / total) * 100, color: '#EAB308' },
      { name: 'Tiền nước', value: water, percentage: (water / total) * 100, color: '#06B6D4' },
      { name: 'Dịch vụ khác', value: services, percentage: (services / total) * 100, color: '#0D9488' }
    ].filter(item => item.value > 0);
  }, [periodTxs]);

  // Operational Expense analysis
  const expenseBreakdown = useMemo(() => {
    let repairs = 0;
    let utilities = 0;
    let serviceCosts = 0;
    let marketing = 0;
    let taxes = 0;
    let others = 0;

    periodTxs.filter((t: any) => t.type === 'expense').forEach((t: any) => {
      const desc = String(t.description || '').toLowerCase();
      const catName = String(t.category_name || '').toLowerCase();
      const amount = Number(t.amount || 0);

      if (desc.includes('sửa') || desc.includes('sua') || desc.includes('hỏng') || catName.includes('sửa') || catName.includes('repair')) {
        repairs += amount;
      } else if (desc.includes('thuế') || desc.includes('thue') || catName.includes('thuế') || catName.includes('tax')) {
        taxes += amount;
      } else if (desc.includes('quảng') || desc.includes('quang cao') || desc.includes('môi giới') || catName.includes('quảng')) {
        marketing += amount;
      } else if (desc.includes('điện') || desc.includes('nước') || desc.includes('dien') || desc.includes('nuoc')) {
        utilities += amount;
      } else if (desc.includes('mạng') || desc.includes('wifi') || desc.includes('rác')) {
        serviceCosts += amount;
      } else {
        others += amount;
      }
    });

    const total = repairs + utilities + serviceCosts + marketing + taxes + others;
    if (total === 0) return [];
    return [
      { name: 'Bảo trì & Sửa chữa', value: repairs, percentage: (repairs / total) * 100, color: '#F43F5E' },
      { name: 'Điện nước đầu vào', value: utilities, percentage: (utilities / total) * 100, color: '#EAB308' },
      { name: 'Cước mạng & Vệ sinh', value: serviceCosts, percentage: (serviceCosts / total) * 100, color: '#C084FC' },
      { name: 'Thuế & Phí nhà nước', value: taxes, percentage: (taxes / total) * 100, color: '#60A5FA' },
      { name: 'Quảng cáo & Môi giới', value: marketing, percentage: (marketing / total) * 100, color: '#F472B6' },
      { name: 'Chi phí khác', value: others, percentage: (others / total) * 100, color: '#94A3B8' }
    ].filter(item => item.value > 0);
  }, [periodTxs]);

  // Cash Flow Trend calculations (last 6 months)
  const computeMonthlyTrends = useCallback(() => {
    const months: MonthlyTrend[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: `T${d.getMonth() + 1}`,
        month: d.getMonth(),
        year: d.getFullYear(),
        income: 0,
        expense: 0,
      });
    }

    transactions.forEach((t: any) => {
      if (!t.date) return;
      const td = new Date(t.date);
      const match = months.find(m => m.month === td.getMonth() && m.year === td.getFullYear());
      if (match) {
        if (t.type === 'income') match.income += Number(t.amount || 0);
        else if (t.type === 'expense') match.expense += Number(t.amount || 0);
      }
    });

    const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1000000);
    return { months, maxVal };
  }, [transactions]);

  const { months: trendData, maxVal: trendMax } = useMemo(() => computeMonthlyTrends(), [computeMonthlyTrends]);

  // Long-term Year-over-Year (Multi-Year) Comparison data
  const yearlyAnalytics = useMemo(() => {
    const years = [2024, 2025, 2026];
    return years.map(y => {
      const yearTxs = transactions.filter(t => t.date && new Date(t.date).getFullYear() === y);
      const inc = yearTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const exp = yearTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const net = inc - exp;
      
      const yearInvoices = invoices.filter(i => i.year === y);
      const expBilling = yearInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
      const colBilling = yearInvoices.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0);
      const collRate = expBilling > 0 ? (colBilling / expBilling) * 100 : 0;

      return {
        year: y,
        income: inc,
        expense: exp,
        netFlow: net,
        collectionRate: collRate,
      };
    });
  }, [transactions, invoices]);

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color="#8A3FFC" />
          <Text style={styles.stateText}>Đang hoàn thiện thiết kế sứ trắng...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8A3FFC" />}
        >
          {/* Dashboard Header */}
          <View style={styles.analyticsHeader}>
            <Text style={styles.reportTitleText}>Báo cáo</Text>
            <Text style={styles.reportSubtitleText}>
              Kiểm toán thu chi và lợi suất tài sản của bạn thông qua các mô hình đồ họa Ethereal Porcelain độc quyền.
            </Text>
          </View>

          {/* Time Period Selector - Porcelain Style */}
          <View style={styles.periodContainer}>
            {(['month', 'quarter', 'year', 'multi_year'] as TimePeriod[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => setPeriod(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {p === 'month' ? '30 ngày' : p === 'quarter' ? '90 ngày' : p === 'year' ? 'Năm nay' : 'Nhiều năm'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {period === 'multi_year' ? (
            /* Multi-Year Dashboard View */
            <View style={styles.multiYearContainer}>
              <View style={[styles.porcelainCard, styles.heroCard, { shadowColor: '#8A3FFC' }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBadge, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="calendar-outline" size={18} color="#8A3FFC" />
                  </View>
                  <Text style={styles.chartTitle}>Tổng quan tài sản nhiều năm</Text>
                </View>
                <Text style={styles.cardDesc}>
                  Báo cáo so sánh chỉ số lợi nhuận ròng và tốc độ tăng trưởng doanh thu qua các chu kỳ năm tài chính.
                </Text>
                
                <View style={styles.yearlyComparisonList}>
                  {yearlyAnalytics.map((item, idx) => (
                    <View key={idx} style={styles.yearlyComparisonRow}>
                      <View style={styles.yearlyLabelCol}>
                        <Text style={styles.yearlyValueYear}>{item.year}</Text>
                        <Text style={styles.yearlyValueSub}>Tỷ lệ thu: {item.collectionRate.toFixed(0)}%</Text>
                      </View>
                      
                      <View style={styles.yearlyDataCol}>
                        <View style={styles.moneyFlowRow}>
                          <Text style={styles.moneyLabel}>Tổng thu:</Text>
                          <Text style={[styles.moneyVal, { color: '#0D9488' }]}>+{formatMoney(item.income)}</Text>
                        </View>
                        <View style={styles.moneyFlowRow}>
                          <Text style={styles.moneyLabel}>Tổng chi:</Text>
                          <Text style={[styles.moneyVal, { color: '#F43F5E' }]}>-{formatMoney(item.expense)}</Text>
                        </View>
                        <View style={styles.dividerDot} />
                        <View style={styles.moneyFlowRow}>
                          <Text style={styles.moneyLabelBold}>Dòng tiền thuần:</Text>
                          <Text style={[styles.moneyValBold, { color: item.netFlow >= 0 ? '#0D9488' : '#F43F5E' }]}>
                            {formatMoney(item.netFlow)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Cash usage breakdown card */}
              <View style={[styles.porcelainCard, { shadowColor: '#0D9488' }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBadge, { backgroundColor: 'rgba(13, 148, 136, 0.1)' }]}>
                    <Ionicons name="pie-chart-outline" size={18} color="#0D9488" />
                  </View>
                  <Text style={styles.chartTitle}>Hiệu suất tài chính lũy kế</Text>
                </View>
                <Text style={styles.cardDesc}>
                  Lũy kế dòng tiền thu và vận hành trọ tích lũy qua tất cả thời kỳ hoạt động của bạn.
                </Text>
                <View style={styles.statsAccumulated}>
                  <View style={styles.accuItem}>
                    <Text style={styles.accuLabel}>Lũy kế thu nhập</Text>
                    <Text style={[styles.accuVal, { color: '#0D9488' }]}>
                      {formatMoney(yearlyAnalytics.reduce((sum, y) => sum + y.income, 0))}
                    </Text>
                  </View>
                  <View style={styles.accuItem}>
                    <Text style={styles.accuLabel}>Lũy kế chi phí</Text>
                    <Text style={[styles.accuVal, { color: '#F43F5E' }]}>
                      {formatMoney(yearlyAnalytics.reduce((sum, y) => sum + y.expense, 0))}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* Standard Bento Grid & 3D Cylinder Charts */
            <>
              {periodTxs.length === 0 ? (
                <Card style={[styles.porcelainCard, styles.emptyCard]}>
                  <Ionicons name="pie-chart-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>Chưa có dữ liệu phân tích</Text>
                  <Text style={styles.emptyDesc}>Ghi nhận các giao dịch thu chi trong Sổ quỹ để kích hoạt mô hình tài chính.</Text>
                </Card>
              ) : (
                <>
                  {/* Chart 1: 3D Cash Flow Trend Chart on Porcelain Floor */}
                  <View style={[styles.porcelainCard, styles.chartCard, { shadowColor: '#8A3FFC' }]}>
                    <View style={styles.chartHeader}>
                      <View style={[styles.iconBadge, { backgroundColor: '#F3E8FF' }]}>
                        <Ionicons name="bar-chart-outline" size={16} color="#8A3FFC" />
                      </View>
                      <View>
                        <Text style={styles.chartTitle}>Xu hướng dòng tiền 6 tháng</Text>
                        <Text style={styles.chartSubtitle}>So sánh tổng thu nhập (Teal) và chi phí vận hành (Coral)</Text>
                      </View>
                    </View>

                    {/* 3D Bar Chart Area */}
                    <View style={styles.barChartContainer3D}>
                      {trendData.map((item, idx) => {
                        const incHeight = (item.income / trendMax) * 120;
                        const expHeight = (item.expense / trendMax) * 120;

                        return (
                          <View key={idx} style={styles.bar3DGroup}>
                            <View style={styles.bar3DTrack}>
                              {/* 3D Green Cylinder (Income) */}
                              <View style={styles.cylinderContainer}>
                                <View style={styles.cylinderShadow} />
                                <View style={[styles.cylinderBody, { height: Math.max(incHeight, 8) }]}>
                                  <View style={[styles.cylinderLeftPart, { backgroundColor: '#0f766e' }]} />
                                  <View style={[styles.cylinderRightPart, { backgroundColor: '#0D9488' }]} />
                                  <View style={[styles.cylinderTopCap, { backgroundColor: '#2dd4bf' }]} />
                                </View>
                              </View>

                              {/* 3D Crimson Cylinder (Expense) */}
                              <View style={styles.cylinderContainer}>
                                <View style={styles.cylinderShadow} />
                                <View style={[styles.cylinderBody, { height: Math.max(expHeight, 8) }]}>
                                  <View style={[styles.cylinderLeftPart, { backgroundColor: '#be123c' }]} />
                                  <View style={[styles.cylinderRightPart, { backgroundColor: '#F43F5E' }]} />
                                  <View style={[styles.cylinderTopCap, { backgroundColor: '#fda4af' }]} />
                                </View>
                              </View>
                            </View>
                            <Text style={styles.bar3DLabel}>{item.label}</Text>
                          </View>
                        );
                      })}
                    </View>

                    <View style={styles.chartLegendsRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#0D9488' }]} />
                        <Text style={styles.legendLabel}>Thực thu</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#F43F5E' }]} />
                        <Text style={styles.legendLabel}>Thực chi</Text>
                      </View>
                    </View>
                  </View>

                  {/* Chart 2: Revenue Stream - 3D Porcelain Segment Tube */}
                  <View style={[styles.porcelainCard, styles.chartCard, { shadowColor: '#0D9488' }]}>
                    <View style={styles.chartHeader}>
                      <View style={[styles.iconBadge, { backgroundColor: 'rgba(13, 148, 136, 0.1)' }]}>
                        <Ionicons name="pie-chart-outline" size={16} color="#0D9488" />
                      </View>
                      <View>
                        <Text style={styles.chartTitle}>Cơ cấu Doanh thu thực nhận</Text>
                        <Text style={styles.chartSubtitle}>Tỷ trọng cấu thành nguồn thu nhập dãy trọ</Text>
                      </View>
                    </View>

                    {/* 3D Glossy Stacked Bar */}
                    <View style={styles.segmentedBar3D}>
                      {revenueBreakdown.map((item, idx) => (
                        <View
                          key={idx}
                          style={{
                            flex: item.percentage,
                            backgroundColor: item.color,
                            height: '100%',
                            position: 'relative',
                            justifyContent: 'center',
                          }}
                        >
                          <View style={styles.glossOverlay} />
                        </View>
                      ))}
                    </View>

                    {/* Legends & Details */}
                    <View style={styles.breakdownList}>
                      {revenueBreakdown.map((item, idx) => (
                        <View key={idx} style={styles.breakdownRow}>
                          <View style={styles.breakdownLeft}>
                            <View style={[styles.breakdownDot3D, { backgroundColor: item.color }]} />
                            <Text style={styles.breakdownName}>{item.name}</Text>
                          </View>
                          <View style={styles.breakdownRight}>
                            <Text style={styles.breakdownVal}>{formatMoney(item.value)}</Text>
                            <Text style={styles.breakdownPct}>{item.percentage.toFixed(1)}%</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Chart 3: Expense Allocation - 3D Porcelain Segment Tube */}
                  <View style={[styles.porcelainCard, styles.chartCard, { shadowColor: '#F43F5E' }]}>
                    <View style={styles.chartHeader}>
                      <View style={[styles.iconBadge, { backgroundColor: 'rgba(244, 63, 94, 0.08)' }]}>
                        <Ionicons name="calculator-outline" size={16} color="#F43F5E" />
                      </View>
                      <View>
                        <Text style={styles.chartTitle}>Phân bổ Chi phí vận hành</Text>
                        <Text style={styles.chartSubtitle}>Biểu đồ phân chia các khoản hao phí vận hành</Text>
                      </View>
                    </View>

                    {expenseBreakdown.length === 0 ? (
                      <Text style={styles.noDataText}>Không có chi phí phát sinh trong chu kỳ này.</Text>
                    ) : (
                      <>
                        {/* 3D Glossy Stacked Bar */}
                        <View style={styles.segmentedBar3D}>
                          {expenseBreakdown.map((item, idx) => (
                            <View
                              key={idx}
                              style={{
                                flex: item.percentage,
                                backgroundColor: item.color,
                                height: '100%',
                                position: 'relative',
                                justifyContent: 'center',
                              }}
                            >
                              <View style={styles.glossOverlay} />
                            </View>
                          ))}
                        </View>

                        {/* Legends & Details */}
                        <View style={styles.breakdownList}>
                          {expenseBreakdown.map((item, idx) => (
                            <View key={idx} style={styles.breakdownRow}>
                              <View style={styles.breakdownLeft}>
                                <View style={[styles.breakdownDot3D, { backgroundColor: item.color }]} />
                                <Text style={styles.breakdownName}>{item.name}</Text>
                              </View>
                              <View style={styles.breakdownRight}>
                                <Text style={styles.breakdownVal}>{formatMoney(item.value)}</Text>
                                <Text style={styles.breakdownPct}>{item.percentage.toFixed(1)}%</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </View>

                  {/* Bento Grid 3D Porcelain Cards with Ethereal Shadow Underglows */}
                  <View style={styles.bentoGrid}>
                    {/* KPI 1: Net cash flow with Mint shadow underglow */}
                    <View style={[styles.porcelainCard, styles.bentoItemHero, { shadowColor: '#0D9488' }]}>
                      <View style={styles.heroRow}>
                        <View>
                          <Text style={styles.bentoLabel}>Dòng tiền thuần</Text>
                          <Text style={[styles.bentoValueHero, { color: netCashFlow >= 0 ? '#0D9488' : '#F43F5E' }]}>
                            {formatMoney(netCashFlow)}
                          </Text>
                        </View>
                        <View style={[styles.iconBadgeLarge, { backgroundColor: netCashFlow >= 0 ? 'rgba(13, 148, 136, 0.1)' : 'rgba(244, 63, 94, 0.1)' }]}>
                          <Ionicons
                            name={netCashFlow >= 0 ? 'cash-outline' : 'trending-down-outline'}
                            size={20}
                            color={netCashFlow >= 0 ? '#0D9488' : '#F43F5E'}
                          />
                        </View>
                      </View>
                      <Text style={styles.bentoSubtext}>Lợi nhuận ròng sau khi đã trừ toàn bộ chi phí vận hành.</Text>
                    </View>

                    {/* Sub KPIs Grid */}
                    <View style={styles.bentoRow}>
                      {/* KPI 2: OER with Coral shadow underglow */}
                      <View style={[styles.porcelainCard, styles.bentoItem, { shadowColor: '#F43F5E' }]}>
                        <View style={[styles.iconBadge, { backgroundColor: 'rgba(244, 63, 94, 0.08)' }]}>
                          <Ionicons name="speedometer-outline" size={16} color="#F43F5E" />
                        </View>
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.bentoLabel}>Tỷ lệ chi phí (OER)</Text>
                          <Text style={[styles.bentoValue, { color: oer > 30 ? '#F43F5E' : '#475569' }]}>
                            {oer.toFixed(1)}%
                          </Text>
                          <Text style={styles.bentoSubtext}>Mục tiêu: &lt;30%</Text>
                        </View>
                      </View>

                      {/* KPI 3: Occupancy with Amethyst shadow underglow */}
                      <View style={[styles.porcelainCard, styles.bentoItem, { shadowColor: '#8A3FFC' }]}>
                        <View style={[styles.iconBadge, { backgroundColor: 'rgba(138, 63, 252, 0.08)' }]}>
                          <Ionicons name="business-outline" size={16} color="#8A3FFC" />
                        </View>
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.bentoLabel}>Tỷ lệ lấp đầy</Text>
                          <Text style={styles.bentoValue}>{occupancyRate.toFixed(1)}%</Text>
                          <Text style={styles.bentoSubtext}>{rooms.filter((r: any) => r.status === 'occupied').length}/{rooms.length} phòng</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.bentoRow}>
                      {/* KPI 4: Collection Rate with Gold shadow underglow */}
                      <View style={[styles.porcelainCard, styles.bentoItem, { shadowColor: '#EAB308' }]}>
                        <View style={[styles.iconBadge, { backgroundColor: 'rgba(234, 179, 8, 0.08)' }]}>
                          <Ionicons name="receipt-outline" size={16} color="#EAB308" />
                        </View>
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.bentoLabel}>Hiệu suất thu nợ</Text>
                          <Text style={[styles.bentoValue, { color: debtCollectionRate < 90 ? '#EAB308' : '#0D9488' }]}>
                            {debtCollectionRate.toFixed(1)}%
                          </Text>
                          <Text style={styles.bentoSubtext}>Kỳ tháng T{currentMonth}</Text>
                        </View>
                      </View>

                      {/* KPI 5: ARPU with Amethyst shadow underglow */}
                      <View style={[styles.porcelainCard, styles.bentoItem, { shadowColor: '#8A3FFC' }]}>
                        <View style={[styles.iconBadge, { backgroundColor: 'rgba(138, 63, 252, 0.08)' }]}>
                          <Ionicons name="stats-chart-outline" size={16} color="#8A3FFC" />
                        </View>
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.bentoLabel}>ARPU phòng thuê</Text>
                          <Text style={styles.bentoValue}>{formatMoney(arpu)}</Text>
                          <Text style={styles.bentoSubtext}>Trung bình/phòng</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </>
          )}

          {/* Actionable Recommendations Card - Premium Alabaster */}
          <View style={[styles.porcelainCard, styles.insightsCard, { shadowColor: '#8A3FFC' }]}>
            <View style={styles.insightsHeader}>
              <View style={styles.insightsIconBg}>
                <Ionicons name="bulb-outline" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.insightsTitle}>Khuyến nghị Tối ưu Lợi suất (Yield)</Text>
                <Text style={styles.insightsSubtitle}>Các ý tưởng vận hành từ hệ thống kiểm toán tự động</Text>
              </View>
            </View>

            <View style={styles.insightsList}>
              <View style={styles.insightItem}>
                <View style={[styles.insightDot, { backgroundColor: '#0D9488' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightHeadline}>Tối ưu giá thuê & Công suất</Text>
                  <Text style={styles.insightDesc}>
                    Hiệu suất lấp đầy hiện tại đạt <Text style={styles.boldText}>{occupancyRate.toFixed(1)}%</Text>. 
                    {occupancyRate >= 90 ? (
                      ' Hiệu suất lấp đầy lý tưởng. Khuyên bạn nên tăng nhẹ giá thuê 5-7% ở chu kỳ hợp đồng kế tiếp cho các phòng mới để đẩy cao Yield ròng.'
                    ) : (
                      ' Trống khá nhiều phòng. Hãy tặng mạng Internet miễn phí hoặc tặng phiếu mua hàng siêu thị tháng đầu để hấp dẫn khách hàng chốt phòng sớm.'
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.insightItem}>
                <View style={[styles.insightDot, { backgroundColor: oer > 30 ? '#F43F5E' : '#0D9488' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightHeadline}>Giám sát hao phí vận hành (OER)</Text>
                  <Text style={styles.insightDesc}>
                    Chỉ số OER của bạn đang ở mức <Text style={styles.boldText}>{oer.toFixed(1)}%</Text>. 
                    {oer > 30 ? (
                      ' Tỷ lệ hao phí đang cao hơn biên an toàn (lý tưởng là dưới 30%). Hãy lập tức kiểm tra rò rỉ đồng hồ nước tổng và kiểm tra điện áp hao hụt hạ tầng.'
                    ) : (
                      ' Tỷ lệ chi phí cực kỳ tối ưu, đảm bảo biên ròng siêu bền vững cho tài sản của bạn.'
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F4F6', // Premium Alabaster snow white backing
  },
  container: {
    flex: 1,
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  scroll: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  analyticsHeader: {
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  reportTitleText: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  reportSubtitleText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: '#475569',
    lineHeight: 18,
  },

  /* 3D Alabaster Porcelain Cards Styles with unique colored underglows */
  porcelainCard: {
    backgroundColor: '#FFFFFF', // Crisp White Porcelain
    borderRadius: 24,           // Super-soft rounded corners
    borderWidth: 1,
    borderColor: '#EAEAEF',
    padding: 18,
    position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,        // Soft colorful glow!
    shadowRadius: 16,
    elevation: 4,
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 16,
    marginTop: 4,
  },

  /* Porcelain Period Selector */
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEF',
    padding: 4,
    borderRadius: 14,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  periodBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#8A3FFC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  periodText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },
  periodTextActive: {
    color: '#8A3FFC',
    fontFamily: Typography.fontFamily.bold,
  },

  /* Bento Grid */
  bentoGrid: {
    gap: 12,
  },
  bentoItemHero: {
    padding: 20,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeLarge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bentoValueHero: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: -0.5,
  },
  bentoSubtext: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 6,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoItem: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  bentoValue: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
    marginVertical: 4,
  },

  /* 3D Charts general */
  chartCard: {
    padding: 18,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    marginTop: 1,
  },

  /* 3D Cylinder Bar Chart CSS */
  barChartContainer3D: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEF',
  },
  bar3DGroup: {
    alignItems: 'center',
    gap: 6,
  },
  bar3DTrack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 130,
  },
  cylinderContainer: {
    position: 'relative',
    alignItems: 'center',
    width: 14,
  },
  cylinderShadow: {
    position: 'absolute',
    bottom: -3,
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    zIndex: 1,
  },
  cylinderBody: {
    width: 14,
    position: 'relative',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    overflow: 'visible',
    zIndex: 2,
  },
  cylinderLeftPart: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 7,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  cylinderRightPart: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 7,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  cylinderTopCap: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 5,
    borderRadius: 4,
    zIndex: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bar3DLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.semibold,
    color: '#64748B',
    marginTop: 4,
  },
  chartLegendsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },

  /* 3D Glossy segment stacked progress bar */
  segmentedBar3D: {
    height: 18,
    borderRadius: 9,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F4F4F6',
    borderWidth: 1,
    borderColor: '#EAEAEF',
  },
  glossOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },

  breakdownList: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEF',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownDot3D: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownName: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownVal: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  breakdownPct: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: '#64748B',
    width: 44,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 20,
  },

  /* Multi-Year Styles */
  multiYearContainer: {
    gap: 16,
  },
  heroCard: {
    padding: 20,
  },
  yearlyComparisonList: {
    gap: 16,
    marginTop: 8,
  },
  yearlyComparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F6',
  },
  yearlyLabelCol: {
    gap: 2,
  },
  yearlyValueYear: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  yearlyValueSub: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.regular,
    color: '#94A3B8',
  },
  yearlyDataCol: {
    flex: 1,
    marginLeft: 24,
    gap: 4,
  },
  moneyFlowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moneyLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  moneyVal: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },
  dividerDot: {
    height: 1,
    backgroundColor: '#EAEAEF',
    marginVertical: 2,
  },
  moneyLabelBold: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  moneyValBold: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
  },
  statsAccumulated: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  accuItem: {
    flex: 1,
    backgroundColor: '#F4F4F6',
    padding: 12,
    borderRadius: 14,
    gap: 4,
  },
  accuLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  accuVal: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
  },

  /* Insights Card */
  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEAEF',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  insightsIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#8A3FFC', // Royal purple
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  insightsSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    marginTop: 1,
  },
  insightsList: {
    gap: 12,
    marginTop: 16,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F4F4F6',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEF',
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  insightHeadline: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#475569',
    lineHeight: 16,
  },
  boldText: {
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },

  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
