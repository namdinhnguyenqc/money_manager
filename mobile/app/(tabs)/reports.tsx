/**
 * TrọCare Mobile — High-Fidelity Landlord Reports Screen
 * An exquisite, analytical dashboard featuring:
 * - Dynamic Boarding House Chip Filter Horizontal Selector
 * - Two Master Operational Tabs: Finance & Utilities / Occupancy & Debts
 * - 6-Month Cash Flow Trend 3D cylinder bar graphs
 * - Complete breakdown of Billed Utilities (Electricity, Water, Service Fees)
 * - Rented/Vacant occupancy ratio progress bars
 * - Outstanding Debts Ledger & Paid Rooms ledger with direct call capabilities
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import { apiGet } from '@/lib/api';

const formatMoney = (v?: number | null) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(v || 0)))} ₫`;

type TimePeriod = 'month' | 'quarter' | 'year' | 'multi_year';
type MonthlyTrend = {
  label: string;
  month: number;
  year: number;
  income: number;
  expense: number;
};

type UtilityComparison = {
  key: string;
  label: string;
  electricityIncome: number;
  electricityExpense: number;
  waterIncome: number;
  waterExpense: number;
};

type UtilityCostMonth = {
  key: string;
  label: string;
  electricity: number | null;
  water: number | null;
  wifi: number | null;
  total: number | null;
};

const getMonthKeyFromTransaction = (tx: any) => {
  const period = String(tx.metadata?.period || tx.period || '');
  if (/^\d{4}-\d{2}$/.test(period)) return period;

  const date = new Date(tx.date);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getUtilityCostType = (tx: any): 'electricity' | 'water' | 'wifi' | null => {
  const text = [
    tx.category_name,
    tx.metadata?.utility_type,
    tx.description,
  ].map((value) => String(value || '').toLowerCase()).join(' ');

  if (text.includes('wifi') || text.includes('fpt') || text.includes('internet') || text.includes('mạng')) return 'wifi';
  if (text.includes('điện') || text.includes('dien') || text.includes('electric')) return 'electricity';
  if (text.includes('nước') || text.includes('nuoc') || text.includes('water')) return 'water';
  return null;
};

function normalizeRoomStatus(room: any): string {
  const stat = String(room.status || '').toLowerCase();
  if (stat === 'occupied' || stat === 'occupied_soon') return 'occupied';
  if (stat === 'maintenance') return 'maintenance';
  if (stat === 'reserved') return 'reserved';
  return 'vacant';
}

export default function RedesignedReportsTab() {
  const router = useRouter();

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'finance' | 'occupancy'>('finance');
  const [selectedBhId, setSelectedBhId] = useState<string>('all');
  const [period, setPeriod] = useState<TimePeriod>('month');

  // Database Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  // Fetch Database Information
  const fetchReportData = useCallback(async (forceRefresh = false) => {
    try {
      const [facRes, roomRes, invRes, txRes, conRes] = await Promise.all([
        apiGet<any>('/owner/boarding-houses', { forceRefresh }),
        apiGet<any>('/rental/rooms', { forceRefresh }),
        apiGet<any>('/invoices?includeItems=true', { forceRefresh }),
        apiGet<any>('/transactions?limit=1000', { forceRefresh }),
        apiGet<any>('/rental/contracts', { forceRefresh }).catch(() => ({ data: [] })),
      ]);

      setFacilities(facRes?.data ?? []);
      setRooms(roomRes?.data ?? []);
      setInvoices(invRes?.data ?? []);
      setTransactions(txRes?.data ?? []);
      setContracts(conRes?.data ?? []);
    } catch (e) {
      console.error('Failed to load analytical reports data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReportData();
    }, [fetchReportData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReportData(true);
  };

  // 1. Filter Rooms by Selected Boarding House
  const filteredRooms = useMemo(() => {
    if (!selectedBhId || selectedBhId === 'all') return rooms;
    return rooms.filter((r: any) => {
      const bhId = r.boarding_house_id ?? r.boardingHouseId ?? r.building_id ?? r.facility_id;
      return String(bhId) === String(selectedBhId);
    });
  }, [rooms, selectedBhId]);

  // 2. Filter Invoices based on filtered rooms
  const filteredInvoices = useMemo(() => {
    const roomIds = new Set(filteredRooms.map((r: any) => String(r.id)));
    return invoices.filter((i: any) => roomIds.has(String(i.room_id)));
  }, [invoices, filteredRooms]);

  // 3. Filter Transactions based on filtered rooms (via invoices, contracts, or description matching)
  const filteredTxs = useMemo(() => {
    let result = [...transactions];
    if (selectedBhId && selectedBhId !== 'all') {
      const bhRooms = filteredRooms;
      const roomIds = new Set(bhRooms.map((r: any) => String(r.id)));
      result = result.filter((tx) => {
        const txBhId = tx.metadata?.boarding_house_id
          ?? tx.metadata?.boardingHouseId
          ?? tx.boarding_house_id
          ?? tx.boardingHouseId
          ?? tx.facility_id
          ?? tx.facilityId;
        if (txBhId && String(txBhId) === String(selectedBhId)) return true;
        if (tx.invoice_id) {
          const inv = invoices.find((i: any) => String(i.id) === String(tx.invoice_id));
          if (inv && roomIds.has(String(inv.room_id))) return true;
        }
        if (tx.contract_id) {
          const con = contracts.find((c: any) => String(c.id) === String(tx.contract_id));
          if (con && roomIds.has(String(con.room_id))) return true;
        }
        return bhRooms.some((r: any) =>
          String(tx.description || '').toLowerCase().includes(String(r.name).toLowerCase())
        );
      });
    }
    return result;
  }, [transactions, selectedBhId, filteredRooms, invoices, contracts]);

  // 4. Period Filtering on filtered transactions
  const periodTxs = useMemo(() => {
    const now = new Date();
    return filteredTxs.filter((t: any) => {
      if (!t.date) return false;
      const td = new Date(t.date);
      const diffTime = Math.abs(now.getTime() - td.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (period === 'month') return diffDays <= 30;
      if (period === 'quarter') return diffDays <= 90;
      if (period === 'year') return diffDays <= 365;
      return true; // shows all
    });
  }, [filteredTxs, period]);

  // Financial calculations
  const totalIncome = useMemo(() =>
    periodTxs.filter((t: any) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [periodTxs]
  );

  const totalExpense = useMemo(() =>
    periodTxs.filter((t: any) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [periodTxs]
  );

  const netCashFlow = totalIncome - totalExpense;
  const oer = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;

  // Occupancy rate & ratios
  const totalRoomsCount = filteredRooms.length;
  const occupiedCount = filteredRooms.filter((r) => normalizeRoomStatus(r) === 'occupied').length;
  const vacantCount = filteredRooms.filter((r) => normalizeRoomStatus(r) === 'vacant').length;
  const otherCount = filteredRooms.filter((r) => {
    const stat = normalizeRoomStatus(r);
    return stat === 'maintenance' || stat === 'reserved';
  }).length;

  const occupancyRate = totalRoomsCount > 0 ? (occupiedCount / totalRoomsCount) * 100 : 0;

  // Billed utility amounts computed dynamically from transactions
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
      { name: 'Tiền phòng', value: roomRent, percentage: (roomRent / total) * 100, color: '#3B82F6' },
      { name: 'Tiền điện', value: electricity, percentage: (electricity / total) * 100, color: '#EAB308' },
      { name: 'Tiền nước', value: water, percentage: (water / total) * 100, color: '#06B6D4' },
      { name: 'Dịch vụ khác', value: services, percentage: (services / total) * 100, color: '#10B981' }
    ].filter(item => item.value > 0);
  }, [periodTxs]);

  const expenseBreakdown = useMemo(() => {
    let repairs = 0;
    let utilities = 0;
    let serviceCosts = 0;
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
      } else if (desc.includes('điện') || desc.includes('nước') || desc.includes('dien') || desc.includes('nuoc')) {
        utilities += amount;
      } else if (desc.includes('mạng') || desc.includes('wifi') || desc.includes('rác') || desc.includes('vệ sinh')) {
        serviceCosts += amount;
      } else {
        others += amount;
      }
    });

    const total = repairs + utilities + serviceCosts + taxes + others;
    if (total === 0) return [];
    return [
      { name: 'Bảo trì & Sửa chữa', value: repairs, percentage: (repairs / total) * 100, color: '#F59E0B' },
      { name: 'Điện nước đầu vào', value: utilities, percentage: (utilities / total) * 100, color: '#F59E0B' },
      { name: 'Wifi & Vệ sinh', value: serviceCosts, percentage: (serviceCosts / total) * 100, color: '#8B5CF6' },
      { name: 'Thuế & Lệ phí', value: taxes, percentage: (taxes / total) * 100, color: '#6366F1' },
      { name: 'Chi phí khác', value: others, percentage: (others / total) * 100, color: '#6B7280' }
    ].filter(item => item.value > 0);
  }, [periodTxs]);

  const utilityComparison = useMemo(() => {
    const now = new Date();
    const rows: UtilityComparison[] = Array.from({ length: 8 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 7 + index, 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
        electricityIncome: 0,
        electricityExpense: 0,
        waterIncome: 0,
        waterExpense: 0,
      };
    });
    const byKey = new Map(rows.map((row) => [row.key, row]));

    filteredInvoices.forEach((invoice: any) => {
      const row = byKey.get(`${invoice.year}-${String(invoice.month).padStart(2, '0')}`);
      if (!row) return;
      const total = Number(invoice.total_amount || 0);
      const paidRatio = total > 0 ? Math.min(1, Number(invoice.paid_amount || 0) / total) : 0;
      (invoice.items || []).forEach((item: any) => {
        const name = String(item.name || '').toLowerCase();
        const received = Number(item.amount || 0) * paidRatio;
        if (name.includes('điện') || name.includes('dien')) row.electricityIncome += received;
        if (name.includes('nước') || name.includes('nuoc')) row.waterIncome += received;
      });
    });

    filteredTxs.filter((tx: any) => tx.type === 'expense').forEach((tx: any) => {
      const monthKey = getMonthKeyFromTransaction(tx);
      if (!monthKey) return;
      const row = byKey.get(monthKey);
      if (!row) return;
      const category = [
        tx.category_name,
        tx.metadata?.utility_type,
        tx.description,
      ].map((value) => String(value || '').toLowerCase()).join(' ');
      if (category.includes('điện') || category.includes('dien')) row.electricityExpense += Number(tx.amount || 0);
      if (category.includes('nước') || category.includes('nuoc')) row.waterExpense += Number(tx.amount || 0);
    });

    return rows;
  }, [filteredInvoices, filteredTxs]);

  const utilityCostStats = useMemo(() => {
    const now = new Date();
    const rows: UtilityCostMonth[] = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
        electricity: null,
        water: null,
        wifi: null,
        total: null,
      };
    });
    const byKey = new Map(rows.map((row) => [row.key, row]));

    filteredTxs.filter((tx: any) => tx.type === 'expense').forEach((tx: any) => {
      const monthKey = getMonthKeyFromTransaction(tx);
      if (!monthKey) return;
      const row = byKey.get(monthKey);
      if (!row) return;

      const type = getUtilityCostType(tx);
      if (!type) return;
      const amount = Number(tx.amount || 0);

      if (type === 'electricity') {
        row.electricity = Math.max(row.electricity || 0, amount);
      } else if (type === 'water') {
        row.water = (row.water || 0) + amount;
      } else {
        row.wifi = (row.wifi || 0) + amount;
      }
    });

    rows.forEach((row) => {
      const values = [row.electricity, row.water, row.wifi].filter((value): value is number => value !== null);
      row.total = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
    });

    const current = rows[rows.length - 1];
    const previous = rows[rows.length - 2];
    const delta = current?.total !== null && previous?.total !== null
      ? Number(current.total || 0) - Number(previous.total || 0)
      : null;
    const validRows = rows.filter((row) => row.total !== null);
    const highest = validRows.reduce<UtilityCostMonth | null>(
      (best, row) => (!best || Number(row.total || 0) > Number(best.total || 0) ? row : best),
      null
    );
    const lowest = validRows.reduce<UtilityCostMonth | null>(
      (best, row) => (!best || Number(row.total || 0) < Number(best.total || 0) ? row : best),
      null
    );
    const average = validRows.length
      ? validRows.reduce((sum, row) => sum + Number(row.total || 0), 0) / validRows.length
      : null;
    const electricityIncreasePct = current?.electricity !== null && previous?.electricity
      ? ((Number(current.electricity || 0) - previous.electricity) / previous.electricity) * 100
      : null;
    const maxTotal = Math.max(...rows.map((row) => Number(row.total || 0)), 1);

    return {
      rows,
      current,
      previous,
      delta,
      highest,
      lowest,
      average,
      electricityIncreasePct: electricityIncreasePct !== null && electricityIncreasePct > 30 ? electricityIncreasePct : null,
      maxTotal,
    };
  }, [filteredTxs]);

  // Compute Debts & Paid rooms list based on all active/historical invoices
  const roomDebtList = useMemo(() => {
    return filteredRooms.map((room: any) => {
      const roomInvoices = filteredInvoices.filter((i: any) => String(i.room_id) === String(room.id));
      const totalAmount = roomInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
      const paidAmount = roomInvoices.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0);
      const debt = Math.max(0, totalAmount - paidAmount);
      return {
        ...room,
        totalAmount,
        paidAmount,
        debt,
      };
    });
  }, [filteredRooms, filteredInvoices]);

  const debtRooms = useMemo(() => {
    return roomDebtList.filter((r: any) => r.debt > 0 && r.tenant_name);
  }, [roomDebtList]);

  const paidRooms = useMemo(() => {
    return roomDebtList.filter((r: any) => r.debt === 0 && r.tenant_name);
  }, [roomDebtList]);

  const totalOutstandingDebt = useMemo(() => {
    return debtRooms.reduce((sum, r) => sum + r.debt, 0);
  }, [debtRooms]);

  // Monthly trends calculations (last 6 months)
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

    filteredTxs.forEach((t: any) => {
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
  }, [filteredTxs]);

  const { months: trendData, maxVal: trendMax } = useMemo(() => computeMonthlyTrends(), [computeMonthlyTrends]);

  // Year-over-Year comparison data
  const yearlyAnalytics = useMemo(() => {
    const years = [2024, 2025, 2026];
    return years.map(y => {
      const yearTxs = filteredTxs.filter(t => t.date && new Date(t.date).getFullYear() === y);
      const inc = yearTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const exp = yearTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const net = inc - exp;

      const yearInvoices = filteredInvoices.filter(i => i.year === y);
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
  }, [filteredTxs, filteredInvoices]);

  // Make direct phone calls to tenants
  const handlePhoneCall = (phone: string, tenantName: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    Alert.alert(
      'Liên hệ người thuê',
      `Bạn có muốn gọi cho khách thuê ${tenantName} (${phone})?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gọi điện', onPress: () => Linking.openURL(`tel:${cleanPhone}`).catch(() => {
          Alert.alert('Lỗi', 'Không thể khởi động ứng dụng gọi điện.');
        })}
      ]
    );
  };

  return (
    <View style={styles.safe}>
      {/* Boarding House Filter Chips horizontally */}
      <View style={styles.bhSelectorWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bhSelectorScroll}>
          <TouchableOpacity
            style={[styles.bhChip, selectedBhId === 'all' && styles.bhChipActive]}
            onPress={() => setSelectedBhId('all')}
            activeOpacity={0.7}
          >
            <Ionicons name="business" size={13} color={selectedBhId === 'all' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.bhChipText, selectedBhId === 'all' && styles.bhChipTextActive]}>
              Tất cả dãy trọ
            </Text>
          </TouchableOpacity>
          {facilities.map((fac) => (
            <TouchableOpacity
              key={fac.id}
              style={[styles.bhChip, selectedBhId === fac.id && styles.bhChipActive]}
              onPress={() => setSelectedBhId(fac.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="home-outline" size={13} color={selectedBhId === fac.id ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.bhChipText, selectedBhId === fac.id && styles.bhChipTextActive]}>
                {fac.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Top Segmented Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'finance' && styles.tabButtonActive]}
          onPress={() => setActiveTab('finance')}
          activeOpacity={0.8}
        >
          <Ionicons name="trending-up" size={16} color={activeTab === 'finance' ? '#2563EB' : '#64748B'} />
          <Text style={[styles.tabButtonText, activeTab === 'finance' && styles.tabButtonTextActive]}>
            Tài chính & Điện nước
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'occupancy' && styles.tabButtonActive]}
          onPress={() => setActiveTab('occupancy')}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={16} color={activeTab === 'occupancy' ? '#2563EB' : '#64748B'} />
          <Text style={[styles.tabButtonText, activeTab === 'occupancy' && styles.tabButtonTextActive]}>
            Trạng thái & Công nợ
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải dữ liệu phân tích...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'finance' ? (
            /* FINANCE & UTILITIES TAB */
            <View style={styles.tabView}>
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
                <View style={styles.subContainer}>
                  <Card style={styles.porcelainCard}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconBadge, { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons name="calendar" size={18} color="#2563EB" />
                      </View>
                      <Text style={styles.cardTitle}>So sánh lũy kế nhiều năm</Text>
                    </View>
                    
                    <View style={styles.yearlyComparisonList}>
                      {yearlyAnalytics.map((item, idx) => (
                        <View key={idx} style={styles.yearlyComparisonRow}>
                          <View style={styles.yearlyLabelCol}>
                            <Text style={styles.yearlyValueYear}>Năm {item.year}</Text>
                            <Text style={styles.yearlyValueSub}>Tỷ lệ thu nợ: {item.collectionRate.toFixed(0)}%</Text>
                          </View>
                          
                          <View style={styles.yearlyDataCol}>
                            <View style={styles.moneyFlowRow}>
                              <Text style={styles.moneyLabel}>Đã thu:</Text>
                              <Text style={[styles.moneyVal, { color: '#10B981' }]}>+{formatMoney(item.income)}</Text>
                            </View>
                            <View style={styles.moneyFlowRow}>
                              <Text style={styles.moneyLabel}>Đã chi:</Text>
                              <Text style={[styles.moneyVal, { color: '#D97706' }]}>-{formatMoney(item.expense)}</Text>
                            </View>
                            <View style={styles.dividerDot} />
                            <View style={styles.moneyFlowRow}>
                              <Text style={styles.moneyLabelBold}>Dòng tiền thuần:</Text>
                              <Text style={[styles.moneyValBold, { color: item.netFlow >= 0 ? '#10B981' : '#D97706' }]}>
                                {formatMoney(item.netFlow)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </Card>

                  {/* Lũy kế dòng tiền */}
                  <Card style={styles.porcelainCard}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconBadge, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="pie-chart" size={18} color="#10B981" />
                      </View>
                      <Text style={styles.cardTitle}>Tổng quan tích lũy</Text>
                    </View>
                    <View style={styles.statsAccumulated}>
                      <View style={styles.accuItem}>
                        <Text style={styles.accuLabel}>Lũy kế thực thu</Text>
                        <Text style={[styles.accuVal, { color: '#10B981' }]}>
                          {formatMoney(yearlyAnalytics.reduce((sum, y) => sum + y.income, 0))}
                        </Text>
                      </View>
                      <View style={styles.accuItem}>
                        <Text style={styles.accuLabel}>Lũy kế thực chi</Text>
                        <Text style={[styles.accuVal, { color: '#D97706' }]}>
                          {formatMoney(yearlyAnalytics.reduce((sum, y) => sum + y.expense, 0))}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </View>
              ) : (
                /* Standard Bento Grid & Trend charts */
                <View style={styles.subContainer}>
                  {/* Financial KPI Cards Grid */}
                  <View style={styles.bentoGrid}>
                    <Card style={[styles.porcelainCard, styles.bentoItemHero]}>
                      <View style={styles.heroRow}>
                        <View>
                          <Text style={styles.bentoLabel}>Lợi nhuận ròng dự kiến</Text>
                          <Text style={[styles.bentoValueHero, { color: netCashFlow >= 0 ? '#10B981' : '#D97706' }]}>
                            {formatMoney(netCashFlow)}
                          </Text>
                        </View>
                        <View style={[styles.iconBadgeLarge, { backgroundColor: netCashFlow >= 0 ? '#ECFDF5' : '#FEF3C7' }]}>
                          <Ionicons
                            name={netCashFlow >= 0 ? 'cash' : 'trending-down'}
                            size={22}
                            color={netCashFlow >= 0 ? '#10B981' : '#D97706'}
                          />
                        </View>
                      </View>
                      <Text style={styles.bentoSubtext}>Biên lợi nhuận ròng thực tế sau khi khấu trừ tất cả chi phí vận hành.</Text>
                    </Card>

                    <View style={styles.bentoRow}>
                      <Card style={[styles.porcelainCard, styles.bentoItem]}>
                        <View style={[styles.iconBadge, { backgroundColor: '#ECFDF5' }]}>
                          <Ionicons name="arrow-up" size={16} color="#10B981" />
                        </View>
                        <Text style={styles.bentoLabelSmall}>Tổng doanh thu</Text>
                        <Text style={[styles.bentoValue, { color: '#10B981' }]}>{formatMoney(totalIncome)}</Text>
                      </Card>

                      <Card style={[styles.porcelainCard, styles.bentoItem]}>
                        <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Ionicons name="arrow-down" size={16} color="#D97706" />
                        </View>
                        <Text style={styles.bentoLabelSmall}>Tổng chi phí</Text>
                        <Text style={[styles.bentoValue, { color: '#D97706' }]}>{formatMoney(totalExpense)}</Text>
                      </Card>
                    </View>
                  </View>

                  {/* 3D Cash Flow Trend cylinder chart */}
                  {periodTxs.length === 0 ? (
                    <Card style={[styles.porcelainCard, styles.emptyCard]}>
                      <Ionicons name="bar-chart-outline" size={40} color="#94A3B8" />
                      <Text style={styles.emptyTitle}>Chưa có giao dịch thu chi</Text>
                      <Text style={styles.emptyDesc}>Hãy thêm các giao dịch vào sổ quỹ thu chi để kích hoạt mô hình đồ thị tài chính.</Text>
                    </Card>
                  ) : (
                    <>
                      <Card style={styles.porcelainCard}>
                        <View style={styles.chartHeader}>
                          <View style={[styles.iconBadge, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="bar-chart" size={16} color="#2563EB" />
                          </View>
                          <View>
                            <Text style={styles.cardTitle}>Xu hướng tài chính 6 tháng</Text>
                            <Text style={styles.cardSubtitle}>So sánh tổng thu nhập (xanh dương) và chi phí vận hành (cam)</Text>
                          </View>
                        </View>

                        {/* 3D Cylinder Graph Area */}
                        <View style={styles.barChartContainer3D}>
                          {trendData.map((item, idx) => {
                            const incHeight = (item.income / trendMax) * 110;
                            const expHeight = (item.expense / trendMax) * 110;

                            return (
                              <View key={idx} style={styles.bar3DGroup}>
                                <View style={styles.bar3DTrack}>
                                  {/* Income cylinder (Blue) */}
                                  <View style={styles.cylinderContainer}>
                                    <View style={styles.cylinderShadow} />
                                    <View style={[styles.cylinderBody, { height: Math.max(incHeight, 8) }]}>
                                      <View style={[styles.cylinderLeftPart, { backgroundColor: '#1D4ED8' }]} />
                                      <View style={[styles.cylinderRightPart, { backgroundColor: '#2563EB' }]} />
                                      <View style={[styles.cylinderTopCap, { backgroundColor: '#60A5FA' }]} />
                                    </View>
                                  </View>

                                  {/* Expense cylinder */}
                                  <View style={styles.cylinderContainer}>
                                    <View style={styles.cylinderShadow} />
                                    <View style={[styles.cylinderBody, { height: Math.max(expHeight, 8) }]}>
                                      <View style={[styles.cylinderLeftPart, { backgroundColor: '#B45309' }]} />
                                      <View style={[styles.cylinderRightPart, { backgroundColor: '#F59E0B' }]} />
                                      <View style={[styles.cylinderTopCap, { backgroundColor: '#FBBF24' }]} />
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
                            <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                            <Text style={styles.legendLabel}>Thực thu</Text>
                          </View>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.legendLabel}>Thực chi</Text>
                          </View>
                        </View>
                      </Card>

                      {/* Utilities & Billed items report */}
                      <Card style={styles.porcelainCard}>
                        <View style={styles.chartHeader}>
                          <View style={[styles.iconBadge, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="flash" size={16} color="#10B981" />
                          </View>
                          <View>
                            <Text style={styles.cardTitle}>Báo cáo tiền điện, nước & dịch vụ</Text>
                            <Text style={styles.cardSubtitle}>Cơ cấu doanh thu dịch vụ thực nhận của dãy trọ</Text>
                          </View>
                        </View>

                        {revenueBreakdown.length === 0 ? (
                          <Text style={styles.noDataText}>Chưa có ghi nhận phí dịch vụ trong kỳ này.</Text>
                        ) : (
                          <>
                            {/* Stacked Porcelain segment tube */}
                            <View style={styles.segmentedBar3D}>
                              {revenueBreakdown.map((item, idx) => (
                                <View
                                  key={idx}
                                  style={{
                                    flex: item.percentage,
                                    backgroundColor: item.color,
                                    height: '100%',
                                    position: 'relative',
                                  }}
                                >
                                  <View style={styles.glossOverlay} />
                                </View>
                              ))}
                            </View>

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
                          </>
                        )}
                      </Card>

                      <Card style={styles.porcelainCard}>
                        <View style={styles.chartHeader}>
                          <View style={[styles.iconBadge, { backgroundColor: Colors.primaryLight }]}>
                            <Ionicons name="flash" size={16} color={Colors.primary} />
                          </View>
                          <View style={styles.chartHeaderText}>
                            <Text style={styles.cardTitle}>Thống kê tiện ích</Text>
                            <Text style={styles.cardSubtitle}>Chi phí điện, nước, Wifi/FPT theo bill thực tế 6 tháng gần nhất</Text>
                          </View>
                        </View>

                        {utilityCostStats.current?.total === null ? (
                          <View style={styles.utilitySafeEmpty}>
                            <Ionicons name="document-text-outline" size={28} color={Colors.textMuted} />
                            <Text style={styles.emptyTitle}>Chưa có dữ liệu tiện ích cho khoảng thời gian này.</Text>
                            <Text style={styles.emptyDesc}>Hãy thêm bill hoặc kiểm tra lại bộ lọc dãy trọ.</Text>
                          </View>
                        ) : (
                          <>
                            <View style={styles.utilitySafeHero}>
                              <View>
                                <Text style={styles.utilitySafeHeroLabel}>Tổng tháng này</Text>
                                <Text style={styles.utilitySafeHeroValue}>{formatMoney(utilityCostStats.current?.total)}</Text>
                              </View>
                              <View style={styles.utilitySafeDelta}>
                                <Text style={[
                                  styles.utilitySafeDeltaText,
                                  Number(utilityCostStats.delta || 0) >= 0 ? styles.utilitySafeDeltaUp : styles.utilitySafeDeltaDown
                                ]}>
                                  {utilityCostStats.delta === null
                                    ? 'Chưa so sánh'
                                    : `${utilityCostStats.delta >= 0 ? '+' : ''}${formatMoney(utilityCostStats.delta)}`}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.utilitySafeKpiRow}>
                              <View style={styles.utilitySafeKpi}>
                                <Text style={styles.utilitySafeKpiLabel}>Điện</Text>
                                <Text style={styles.utilitySafeKpiValue}>
                                  {utilityCostStats.current?.electricity === null ? 'Chưa có dữ liệu' : formatMoney(utilityCostStats.current?.electricity)}
                                </Text>
                              </View>
                              <View style={styles.utilitySafeKpi}>
                                <Text style={styles.utilitySafeKpiLabel}>Nước</Text>
                                <Text style={styles.utilitySafeKpiValue}>
                                  {utilityCostStats.current?.water === null ? 'Chưa có dữ liệu' : formatMoney(utilityCostStats.current?.water)}
                                </Text>
                              </View>
                              <View style={styles.utilitySafeKpi}>
                                <Text style={styles.utilitySafeKpiLabel}>Wifi</Text>
                                <Text style={styles.utilitySafeKpiValue}>
                                  {utilityCostStats.current?.wifi === null ? 'Chưa có dữ liệu' : formatMoney(utilityCostStats.current?.wifi)}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.utilitySafeInsight}>
                              <Text style={styles.utilitySafeInsightText}>Cao nhất: {utilityCostStats.highest?.label || 'Chưa có dữ liệu'}</Text>
                              <Text style={styles.utilitySafeInsightText}>Thấp nhất: {utilityCostStats.lowest?.label || 'Chưa có dữ liệu'}</Text>
                              <Text style={styles.utilitySafeInsightText}>TB/tháng: {utilityCostStats.average === null ? 'Chưa có dữ liệu' : formatMoney(utilityCostStats.average)}</Text>
                              {utilityCostStats.electricityIncreasePct !== null && (
                                <Text style={styles.utilitySafeAlert}>Cảnh báo: Điện tăng {utilityCostStats.electricityIncreasePct.toFixed(0)}% so với tháng trước</Text>
                              )}
                            </View>

                            <View style={styles.utilitySafeMonthList}>
                              {utilityCostStats.rows.map((row) => (
                                <View key={row.key} style={styles.utilitySafeMonthRow}>
                                  <View style={styles.utilitySafeMonthTop}>
                                    <Text style={styles.utilitySafeMonthLabel}>{row.label}</Text>
                                    <Text style={styles.utilitySafeMonthValue}>
                                      {row.total === null ? 'Chưa có dữ liệu' : formatMoney(row.total)}
                                    </Text>
                                  </View>
                                  <View style={styles.utilitySafeMonthTrack}>
                                    <View
                                      style={[
                                        styles.utilitySafeMonthFill,
                                        { width: `${Math.max(4, (Number(row.total || 0) / utilityCostStats.maxTotal) * 100)}%` }
                                      ]}
                                    />
                                  </View>
                                </View>
                              ))}
                            </View>
                          </>
                        )}
                      </Card>

                      <Card style={styles.porcelainCard}>
                        <View style={styles.chartHeader}>
                          <View style={[styles.iconBadge, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="swap-horizontal" size={16} color="#2563EB" />
                          </View>
                          <View style={styles.chartHeaderText}>
                            <Text style={styles.cardTitle}>Thực nhận và thực chi điện nước</Text>
                            <Text style={styles.cardSubtitle}>So sánh theo tháng, thực nhận tính theo phần hóa đơn đã thu</Text>
                          </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.utilityTable}>
                            <View style={[styles.utilityRow, styles.utilityHeaderRow]}>
                              <Text style={[styles.utilityHeaderText, styles.utilityMonthCell]}>Tháng</Text>
                              <Text style={styles.utilityHeaderText}>Điện thu</Text>
                              <Text style={styles.utilityHeaderText}>Điện chi</Text>
                              <Text style={styles.utilityHeaderText}>Nước thu</Text>
                              <Text style={styles.utilityHeaderText}>Nước chi</Text>
                              <Text style={styles.utilityHeaderText}>Chênh lệch</Text>
                            </View>
                            {utilityComparison.map((item) => {
                              const margin = item.electricityIncome + item.waterIncome
                                - item.electricityExpense - item.waterExpense;
                              return (
                                <View key={item.key} style={styles.utilityRow}>
                                  <Text style={[styles.utilityMonth, styles.utilityMonthCell]}>{item.label}</Text>
                                  <Text style={styles.utilityValue}>{formatMoney(item.electricityIncome)}</Text>
                                  <Text style={styles.utilityExpense}>{formatMoney(item.electricityExpense)}</Text>
                                  <Text style={styles.utilityValue}>{formatMoney(item.waterIncome)}</Text>
                                  <Text style={styles.utilityExpense}>{formatMoney(item.waterExpense)}</Text>
                                  <Text style={[styles.utilityMargin, margin < 0 && styles.utilityMarginNegative]}>
                                    {formatMoney(margin)}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </Card>

                      {/* Báo cáo Chi phí Vận hành */}
                      <Card style={styles.porcelainCard}>
                        <View style={styles.chartHeader}>
                          <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="calculator" size={16} color="#D97706" />
                          </View>
                          <View>
                            <Text style={styles.cardTitle}>Phân bổ hao phí vận hành</Text>
                            <Text style={styles.cardSubtitle}>Các khoản chi vận hành bảo trì cơ sở hạ tầng</Text>
                          </View>
                        </View>

                        {expenseBreakdown.length === 0 ? (
                          <Text style={styles.noDataText}>Không có chi phí vận hành nào phát sinh.</Text>
                        ) : (
                          <>
                            <View style={styles.segmentedBar3D}>
                              {expenseBreakdown.map((item, idx) => (
                                <View
                                  key={idx}
                                  style={{
                                    flex: item.percentage,
                                    backgroundColor: item.color,
                                    height: '100%',
                                    position: 'relative',
                                  }}
                                >
                                  <View style={styles.glossOverlay} />
                                </View>
                              ))}
                            </View>

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
                      </Card>
                    </>
                  )}
                </View>
              )}
            </View>
          ) : (
            /* OCCUPANCY & DEBTS TAB */
            <View style={styles.tabView}>
              {/* Debt & Occupancy KPI summary */}
              <View style={styles.bentoRow}>
                <Card style={[styles.porcelainCard, styles.bentoItem]}>
                  <View style={[styles.iconBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="warning" size={16} color="#D97706" />
                  </View>
                  <Text style={styles.bentoLabelSmall}>Tổng công nợ</Text>
                  <Text style={[styles.bentoValue, { color: '#D97706' }]}>{formatMoney(totalOutstandingDebt)}</Text>
                  <Text style={styles.bentoSubtext}>Số tiền chưa thu</Text>
                </Card>

                <Card style={[styles.porcelainCard, styles.bentoItem]}>
                  <View style={[styles.iconBadge, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="home" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.bentoLabelSmall}>Tỷ lệ lấp đầy</Text>
                  <Text style={[styles.bentoValue, { color: '#2563EB' }]}>{occupancyRate.toFixed(0)}%</Text>
                  <Text style={styles.bentoSubtext}>{occupiedCount}/{totalRoomsCount} phòng thuê</Text>
                </Card>
              </View>

              {/* Rented vs Vacant room ratios & Sleek iOS progress bar */}
              <Card style={styles.porcelainCard}>
                <View style={styles.statusHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="bed-outline" size={16} color="#2563EB" />
                    <Text style={styles.cardTitle}>Tỷ lệ phòng đang thuê / trống</Text>
                  </View>
                  <Text style={styles.statusPercentageText}>{occupancyRate.toFixed(0)}%</Text>
                </View>

                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${occupancyRate}%` }]} />
                </View>

                <View style={styles.statusCountersRow}>
                  <View style={styles.counterItem}>
                    <View style={[styles.counterIndicator, { backgroundColor: '#2563EB' }]} />
                    <Text style={styles.counterLabel}>Đang thuê: {occupiedCount}</Text>
                  </View>
                  <View style={styles.counterItem}>
                    <View style={[styles.counterIndicator, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.counterLabel}>Phòng trống: {vacantCount}</Text>
                  </View>
                  {otherCount > 0 && (
                    <View style={styles.counterItem}>
                      <View style={[styles.counterIndicator, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.counterLabel}>Bảo trì/Cọc: {otherCount}</Text>
                    </View>
                  )}
                </View>
              </Card>

              {/* List of outstanding debt rooms */}
              <View style={styles.listSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="alert-circle" size={18} color="#D97706" />
                  <Text style={styles.sectionTitleText}>Phòng còn nợ tiền ({debtRooms.length})</Text>
                </View>

                {debtRooms.length === 0 ? (
                  <Card style={[styles.porcelainCard, styles.emptyCard]}>
                    <Ionicons name="checkmark-circle-outline" size={36} color="#10B981" />
                    <Text style={styles.emptyTitle}>Tuyệt vời! Không có nợ đọng</Text>
                    <Text style={styles.emptyDesc}>Tất cả các phòng đã được thanh toán đầy đủ các hóa đơn.</Text>
                  </Card>
                ) : (
                  <View style={styles.ledgerList}>
                    {debtRooms.map((room) => (
                      <Card key={room.id} style={styles.ledgerCard}>
                        <View style={styles.ledgerCardHeader}>
                          <View>
                            <Text style={styles.ledgerRoomName}>{room.name}</Text>
                            <View style={styles.tenantMetaRow}>
                              <Ionicons name="person-outline" size={11} color="#6B7280" />
                              <Text style={styles.ledgerTenantName}>{room.tenant_name}</Text>
                            </View>
                          </View>

                          <View style={styles.ledgerDebtInfo}>
                            <Text style={styles.ledgerDebtLabel}>Còn nợ:</Text>
                            <Text style={styles.ledgerDebtValue}>{formatMoney(room.debt)}</Text>
                          </View>
                        </View>

                        {room.tenant_phone ? (
                          <View style={styles.ledgerActions}>
                            <TouchableOpacity
                              style={styles.actionBtnCall}
                              onPress={() => handlePhoneCall(room.tenant_phone, room.tenant_name)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="call" size={12} color="#FFFFFF" />
                              <Text style={styles.actionBtnCallText}>Gọi nhắc nợ</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={styles.actionBtnDetail}
                              onPress={() => router.push(`/room/${room.id}`)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.actionBtnDetailText}>Xem chi tiết phòng</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.ledgerActions}>
                            <TouchableOpacity
                              style={styles.actionBtnDetailFull}
                              onPress={() => router.push(`/room/${room.id}`)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.actionBtnDetailText}>Xem chi tiết phòng</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </Card>
                    ))}
                  </View>
                )}
              </View>

              {/* List of fully paid rooms */}
              <View style={styles.listSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text style={styles.sectionTitleText}>Phòng đã thanh toán ({paidRooms.length})</Text>
                </View>

                {paidRooms.length === 0 ? (
                  <Card style={[styles.porcelainCard, styles.emptyCard]}>
                    <Ionicons name="people-outline" size={32} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>Chưa có phòng thanh toán</Text>
                    <Text style={styles.emptyDesc}>Chưa ghi nhận hóa đơn nào được thanh toán đầy đủ trong kỳ này.</Text>
                  </Card>
                ) : (
                  <View style={styles.ledgerList}>
                    {paidRooms.map((room) => (
                      <Card key={room.id} style={styles.ledgerCard}>
                        <View style={styles.ledgerCardHeader}>
                          <View>
                            <Text style={styles.ledgerRoomName}>{room.name}</Text>
                            <View style={styles.tenantMetaRow}>
                              <Ionicons name="person-outline" size={11} color="#6B7280" />
                              <Text style={styles.ledgerTenantName}>{room.tenant_name}</Text>
                            </View>
                          </View>

                          <View style={styles.ledgerPaidBadge}>
                            <Ionicons name="checkmark-sharp" size={12} color="#10B981" />
                            <Text style={styles.ledgerPaidText}>Đã thu đủ</Text>
                          </View>
                        </View>

                        <View style={styles.paidMetadata}>
                          <Text style={styles.paidLabel}>Tổng đã thu tháng này:</Text>
                          <Text style={styles.paidValue}>{formatMoney(room.paidAmount || room.price)}</Text>
                        </View>
                      </Card>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F4F6', // Matte Alabaster backing
  },
  /* Boarding House Filter selector horizontal */
  bhSelectorWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEF',
  },
  bhSelectorScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  bhChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  bhChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  bhChipText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },
  bhChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
  },

  /* Tab Segment switcher styles */
  tabContainer: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEF',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#EFF6FF',
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#2563EB',
    fontFamily: Typography.fontFamily.bold,
  },

  /* Loading State Styles */
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },

  /* Scroll layouts */
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  tabView: {
    gap: 16,
  },
  subContainer: {
    gap: 16,
  },

  /* Period Selector */
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#E4E4E7',
    padding: 4,
    borderRadius: 12,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  periodText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#52525B',
  },
  periodTextActive: {
    color: '#2563EB',
    fontFamily: Typography.fontFamily.bold,
  },

  /* Bento Grid system for KPIs */
  bentoGrid: {
    gap: 12,
  },
  bentoItemHero: {
    padding: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBadgeLarge: {
    width: 46,
    height: 46,
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
  bentoLabelSmall: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
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
    padding: 14,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  bentoValue: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: -0.3,
    marginVertical: 2,
  },

  /* 3D Alabaster Porcelain Cards */
  porcelainCard: {
    backgroundColor: '#FFFFFF', // Crisp White Porcelain
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    marginTop: 1,
  },

  /* 3D cylinder Bar charts */
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  chartHeaderText: {
    flex: 1,
  },
  utilitySafeEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  utilitySafeHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryAlpha20,
  },
  utilitySafeHeroLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  utilitySafeHeroValue: {
    marginTop: 4,
    fontSize: 24,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  utilitySafeDelta: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  utilitySafeDeltaText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
  },
  utilitySafeDeltaUp: {
    color: Colors.danger,
  },
  utilitySafeDeltaDown: {
    color: Colors.successDark,
  },
  utilitySafeKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  utilitySafeKpi: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  utilitySafeKpiLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textMuted,
  },
  utilitySafeKpiValue: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  utilitySafeInsight: {
    gap: 5,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  utilitySafeInsightText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  utilitySafeAlert: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },
  utilitySafeMonthList: {
    gap: 8,
    marginTop: 12,
  },
  utilitySafeMonthRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  utilitySafeMonthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  utilitySafeMonthLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  utilitySafeMonthValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary,
  },
  utilitySafeMonthTrack: {
    height: 7,
    marginTop: 7,
    borderRadius: 999,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  utilitySafeMonthFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  utilityTable: {
    minWidth: 820,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  utilityRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  utilityHeaderRow: {
    backgroundColor: '#F1F5F9',
  },
  utilityHeaderText: {
    width: 130,
    paddingHorizontal: 8,
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
    textAlign: 'right',
  },
  utilityMonthCell: {
    width: 90,
    textAlign: 'left',
  },
  utilityMonth: {
    paddingHorizontal: 8,
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  utilityValue: {
    width: 130,
    paddingHorizontal: 8,
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: '#059669',
    textAlign: 'right',
  },
  utilityExpense: {
    width: 130,
    paddingHorizontal: 8,
    fontSize: 11,
    fontFamily: Typography.fontFamily.semibold,
    color: '#D97706',
    textAlign: 'right',
  },
  utilityMargin: {
    width: 130,
    paddingHorizontal: 8,
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#059669',
    textAlign: 'right',
  },
  utilityMarginNegative: {
    color: '#DC2626',
  },
  barChartContainer3D: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEF',
  },
  bar3DGroup: {
    alignItems: 'center',
    gap: 4,
  },
  bar3DTrack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 120,
  },
  cylinderContainer: {
    position: 'relative',
    alignItems: 'center',
    width: 14,
  },
  cylinderShadow: {
    position: 'absolute',
    bottom: -3,
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    zIndex: 1,
  },
  cylinderBody: {
    width: 13,
    position: 'relative',
    borderRadius: 5,
    overflow: 'visible',
    zIndex: 2,
  },
  cylinderLeftPart: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 6.5,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  cylinderRightPart: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 6.5,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  cylinderTopCap: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 3,
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
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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

  /* Stacked Segment Tube */
  segmentedBar3D: {
    height: 16,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  glossOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  breakdownList: {
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontSize: 10,
    fontFamily: Typography.fontFamily.semibold,
    color: '#64748B',
    width: 38,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 14,
  },

  /* Multi-year lists */
  yearlyComparisonList: {
    gap: 12,
  },
  yearlyComparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  yearlyLabelCol: {
    gap: 2,
  },
  yearlyValueYear: {
    fontSize: 14,
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
    marginLeft: 20,
    gap: 3,
  },
  moneyFlowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moneyLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  moneyVal: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
  },
  dividerDot: {
    height: 1,
    backgroundColor: '#EAEAEF',
    marginVertical: 2,
  },
  moneyLabelBold: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  moneyValBold: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
  },
  statsAccumulated: {
    flexDirection: 'row',
    gap: 10,
  },
  accuItem: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 12,
    gap: 3,
  },
  accuLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  accuVal: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
  },

  /* Empty state indicators */
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },

  /* Tab 2: Occupancy & Debts layout */
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusPercentageText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#2563EB',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  statusCountersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  counterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  counterIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  counterLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#475569',
  },

  /* Ledger section */
  listSection: {
    gap: 10,
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  sectionTitleText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  ledgerList: {
    gap: 10,
  },
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    padding: 12,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  ledgerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ledgerRoomName: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  tenantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ledgerTenantName: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#6B7280',
  },
  ledgerDebtInfo: {
    alignItems: 'flex-end',
  },
  ledgerDebtLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  ledgerDebtValue: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#D97706',
  },
  ledgerPaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  ledgerPaidText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: '#10B981',
  },
  paidMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  paidLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  paidValue: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#1E293B',
  },
  ledgerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  actionBtnCall: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionBtnCallText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  actionBtnDetail: {
    flex: 1.2,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDetailFull: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDetailText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
  },
});
