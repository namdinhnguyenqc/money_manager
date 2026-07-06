"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Home, Wallet, AlertCircle, Building2, Repeat,
  FileText, ArrowRight, Plus, Zap, Droplet, ChevronRight,
  TrendingUp, TrendingDown, Receipt, Settings, Wifi,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus, PieChart,
  CalendarDays, RefreshCw
} from 'lucide-react';
import { formatMoney, normalizeRoomStatus } from '@/lib/rentalOps';
import RBACGuard from '@/components/RBACGuard';
import { useOwnerDashboardInit, OwnerDashboardInit } from '@/hooks/useOwnerData';

const MONTH_NAMES = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

export default function OwnerDashboard() {
  const dashboardQuery = useOwnerDashboardInit();
  const [slowLoad, setSlowLoad] = useState(false);
  const [chartMonths, setChartMonths] = useState(12);

  // Client-side cache (SWR) to load dashboard instantly (0ms) on fresh login or refresh
  const [cachedData, setCachedData] = useState<OwnerDashboardInit | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("owner_dashboard_cache");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Save fresh data to local cache when API call succeeds
  React.useEffect(() => {
    if (dashboardQuery.data) {
      try {
        localStorage.setItem("owner_dashboard_cache", JSON.stringify(dashboardQuery.data));
        setCachedData(dashboardQuery.data);
      } catch (e) {
        console.error("Failed to save dashboard cache:", e);
      }
    }
  }, [dashboardQuery.data]);

  const activeData = dashboardQuery.data ?? cachedData;

  const rooms = activeData?.rooms ?? [];
  const transactions = activeData?.transactions ?? [];
  const invoices = activeData?.invoices ?? [];

  const now = new Date();
  const curM = now.getMonth(), curY = now.getFullYear();

  // State to support review of different months
  const [selectedPeriod, setSelectedPeriod] = useState({ month: curM + 1, year: curY });

  React.useEffect(() => {
    if (!dashboardQuery.isLoading) { setSlowLoad(false); return; }
    const t = setTimeout(() => setSlowLoad(true), 8000);
    return () => clearTimeout(t);
  }, [dashboardQuery.isLoading]);

  // Keep stats for current vacancy & occupancy
  const stats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter(r => normalizeRoomStatus(r) === 'occupied').length;
    const vacant = rooms.filter(r => normalizeRoomStatus(r) === 'vacant').length;
    const reserved = rooms.filter(r => normalizeRoomStatus(r) === 'reserved').length;
    const maintenance = rooms.filter(r => normalizeRoomStatus(r) === 'maintenance').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, vacant, reserved, maintenance, occupancyRate };
  }, [rooms]);

  // Financial details calculated dynamically based on selectedPeriod
  const selectedPeriodFinancial = useMemo(() => {
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === (selectedPeriod.month - 1) && d.getFullYear() === selectedPeriod.year;
    });
    const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Last month comparison for selectedPeriod
    const prevM = selectedPeriod.month === 1 ? 11 : selectedPeriod.month - 2;
    const prevY = selectedPeriod.month === 1 ? selectedPeriod.year - 1 : selectedPeriod.year;
    const prevIncome = transactions
      .filter(t => { const d = new Date(t.date); return d.getMonth() === prevM && d.getFullYear() === prevY && t.type === 'income'; })
      .reduce((s, t) => s + t.amount, 0);
    const incomeChange = prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : null;

    return { income, expense, profit: income - expense, incomeChange };
  }, [transactions, selectedPeriod]);

  const financial = useMemo(() => {
    const income = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === curM && d.getFullYear() === curY && t.type === 'income';
      })
      .reduce((s, t) => s + t.amount, 0);
    const expense = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === curM && d.getFullYear() === curY && t.type === 'expense';
      })
      .reduce((s, t) => s + t.amount, 0);

    // Build monthly breakdown for chart
    const months = Array.from({ length: chartMonths }, (_, i) => {
      const d = new Date(curY, curM - (chartMonths - 1 - i), 1);
      const mm = d.getMonth(), yy = d.getFullYear();
      const rev = transactions
        .filter(t => { const td = new Date(t.date); return td.getMonth() === mm && td.getFullYear() === yy && t.type === 'income'; })
        .reduce((s, t) => s + t.amount, 0);
      const exp = transactions
        .filter(t => { const td = new Date(t.date); return td.getMonth() === mm && td.getFullYear() === yy && t.type === 'expense'; })
        .reduce((s, t) => s + t.amount, 0);
      return { label: MONTH_NAMES[mm], month: mm + 1, year: yy, rev, exp, profit: rev - exp };
    });
    const maxVal = Math.max(...months.map(m => Math.max(m.rev, m.exp)), 1);

    return { income, expense, profit: income - expense, months, maxVal };
  }, [transactions, chartMonths, curM, curY]);

  // Utility breakdown from invoices (more accurate than transactions)
  const utilities = useMemo(() => {
    const thisMonthInvoices = invoices.filter(inv => inv.month === selectedPeriod.month && inv.year === selectedPeriod.year);
    let rent = 0, electricity = 0, water = 0, other = 0;
    for (const inv of thisMonthInvoices) {
      rent += inv.room_fee ?? 0;
      const items = (inv as any).items ?? [];
      for (const item of items) {
        const name = String(item.name || '').toLowerCase();
        if (name.includes('điện') || name.includes('electric')) electricity += item.amount;
        else if (name.includes('nước') || name.includes('water')) water += item.amount;
        else other += item.amount;
      }
    }
    // Fallback to transactions if invoices items not available
    if (electricity === 0 && water === 0) {
      for (const tx of transactions) {
        if (tx.type !== 'income') continue;
        const d = new Date(tx.date);
        if (d.getMonth() !== (selectedPeriod.month - 1) || d.getFullYear() !== selectedPeriod.year) continue;
        const text = [tx.description, (tx as any).category_name].join(' ').toLowerCase();
        const amt = Math.abs(Number(tx.amount || 0));
        if (text.includes('điện') || text.includes('electric')) electricity += amt;
        else if (text.includes('nước') || text.includes('water')) water += amt;
        else if (text.includes('phòng') || text.includes('room')) rent += amt;
        else other += amt;
      }
    }
    const total = rent + electricity + water + other;
    return { rent, electricity, water, other, total };
  }, [invoices, transactions, selectedPeriod]);

  // ── ANALYSIS METRICS FOR DESKTOP VIEW ──
  const maxRoomRentPotential = useMemo(() => {
    return rooms.reduce((sum, room) => sum + Number(room.price || 0), 0);
  }, [rooms]);

  const actualRent = useMemo(() => {
    return utilities.rent || (selectedPeriodFinancial.income - utilities.electricity - utilities.water - utilities.other);
  }, [utilities, selectedPeriodFinancial.income]);

  const rentGap = useMemo(() => {
    return Math.max(0, maxRoomRentPotential - actualRent);
  }, [maxRoomRentPotential, actualRent]);

  const rentRatio = useMemo(() => {
    const total = selectedPeriodFinancial.income;
    return total > 0 ? Math.round((actualRent / total) * 100) : 0;
  }, [actualRent, selectedPeriodFinancial.income]);

  // ── OPERATIONAL METRICS: ARR, RevPAR, Churn Rate ──
  const occupiedCount = useMemo(() => {
    return rooms.filter(r => normalizeRoomStatus(r) === 'occupied').length;
  }, [rooms]);

  const arrValue = useMemo(() => {
    return occupiedCount > 0 ? Math.round(actualRent / occupiedCount) : 0;
  }, [actualRent, occupiedCount]);

  const revParValue = useMemo(() => {
    return rooms.length > 0 ? Math.round(actualRent / rooms.length) : 0;
  }, [actualRent, rooms.length]);

  const churnRateValue = useMemo(() => {
    const total = rooms.length;
    const vacant = rooms.filter(r => normalizeRoomStatus(r) === 'vacant').length;
    if (total === 0 || vacant === 0) return 0;
    return Math.min(100, Math.round((vacant / total) * 15));
  }, [rooms]);

  // ── DONUT 1 DATA: REVENUE COMPOSITION ──
  const revenueChartData = useMemo(() => {
    const rent = actualRent;
    const elec = utilities.electricity;
    const water = utilities.water;
    const other = utilities.other;
    return [
      { label: "Tiền phòng", value: rent, color: "#3B82F6" },      // Blue
      { label: "Tiền điện", value: elec, color: "#F59E0B" },       // Amber
      { label: "Tiền nước", value: water, color: "#06B6D4" },      // Cyan
      { label: "Dịch vụ khác", value: other, color: "#8B5CF6" },   // Violet
    ];
  }, [actualRent, utilities]);

  // ── DONUT 2 DATA: COLLECTION EFFICIENCY ──
  const collectionChartData = useMemo(() => {
    const thisMonthInvoices = invoices.filter(inv => inv.month === selectedPeriod.month && inv.year === selectedPeriod.year);
    let billed = 0, paid = 0;
    for (const inv of thisMonthInvoices) {
      billed += Math.round(Number(inv.total_amount || 0));
      paid += Math.round(Number(inv.paid_amount || 0));
    }
    const unpaid = Math.max(0, billed - paid);
    return {
      billed,
      paid,
      unpaid,
      rate: billed > 0 ? Math.round((paid / billed) * 100) : 0,
      data: [
        { label: "Đã thu", value: paid, color: "#10B981" },        // Emerald
        { label: "Chưa thu", value: unpaid, color: "#EF4444" },    // Red
      ]
    };
  }, [invoices, selectedPeriod]);

  // ── SYSTEM DATA INSIGHTS ──
  const analystInsights = useMemo(() => {
    const list: string[] = [];
    
    // Occupancy insight
    if (stats.occupancyRate >= 90) {
      list.push("Tỷ lệ lấp đầy rất tốt (>= 90%). Hãy duy trì chất lượng dịch vụ để giữ chân khách thuê.");
    } else if (stats.occupancyRate >= 70) {
      list.push(`Tỷ lệ lấp đầy trung bình (${stats.occupancyRate}%). Đang còn ${stats.vacant} phòng trống.`);
    } else {
      list.push(`⚠️ Cảnh báo: Tỷ lệ phòng trống cao (${stats.vacant} phòng). Cân nhắc giảm giá hoặc ưu đãi cọc.`);
    }

    // Collection rate insight
    if (collectionChartData.billed > 0) {
      if (collectionChartData.rate >= 90) {
        list.push(`Hiệu suất thu tiền T${selectedPeriod.month} xuất sắc. Hóa đơn hầu hết đã hoàn thành.`);
      } else if (collectionChartData.rate >= 70) {
        list.push(`⚠️ Tiền phòng chưa thu T${selectedPeriod.month} còn lại ${formatMoney(collectionChartData.unpaid)}.`);
      } else {
        list.push(`🚨 Cảnh báo dòng tiền T${selectedPeriod.month} quá thấp: Mới thu hồi được ${collectionChartData.rate}%.`);
      }
    }

    // Expense ratio
    const expenseRatio = selectedPeriodFinancial.income > 0 ? (selectedPeriodFinancial.expense / selectedPeriodFinancial.income) * 100 : 0;
    if (expenseRatio > 40) {
      list.push(`⚠️ Chi phí vận hành tháng này khá cao, chiếm ${Math.round(expenseRatio)}% doanh thu tổng.`);
    } else if (selectedPeriodFinancial.income > 0) {
      list.push(`Chi phí vận hành được kiểm soát tốt, biên lợi nhuận ròng đạt ${Math.round(100 - expenseRatio)}%.`);
    }

    if (list.length === 0) {
      list.push("Hệ thống chưa tích lũy đủ dữ liệu thu chi để phân tích xu hướng.");
    }
    return list;
  }, [stats, collectionChartData, selectedPeriodFinancial, selectedPeriod]);

  const overdueInvoices = useMemo(() => {
    const cm = curM + 1, cy = curY;
    return invoices.filter(inv => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const past = inv.year < cy || (inv.year === cy && inv.month < cm);
      return past && total > 0 && paid < total;
    });
  }, [invoices, curM, curY]);

  const overdueAmount = useMemo(() =>
    overdueInvoices.reduce((s, inv) => s + Math.max(0, Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0),
    [overdueInvoices]);

  const vacantRooms = useMemo(() => rooms.filter(r => normalizeRoomStatus(r) === 'vacant').slice(0, 3), [rooms]);

  const debts = useMemo(() => {
    return invoices
      .map((inv: any) => {
        const total = Math.round(Number(inv.total_amount || 0));
        const paid = Math.round(Number(inv.paid_amount || 0));
        return { ...inv, remaining: Math.max(0, total - paid) };
      })
      .filter((inv: any) => inv.remaining > 0)
      .sort((a: any, b: any) => b.remaining - a.remaining);
  }, [invoices]);

  const totalDebt = useMemo(() => debts.reduce((s: number, d: any) => s + d.remaining, 0), [debts]);

  const recentTx = useMemo(() =>
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [transactions]);

  const greeting = now.getHours() < 12 ? 'Chào buổi sáng' : now.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // Error page: Only trigger if no cached data is available to fall back to
  if (dashboardQuery.isError && !activeData) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
        <AlertCircle size={28} />
      </div>
      <div>
        <div className="font-bold text-slate-800 text-lg">Không tải được dữ liệu</div>
        <div className="text-sm text-slate-500 mt-1 max-w-xs">Server đang khởi động lại. Vui lòng thử lại sau vài giây.</div>
      </div>
      <button onClick={() => dashboardQuery.refetch()} className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
        Thử lại
      </button>
    </div>
  );

  // Skeleton loading: Only trigger if we have zero cached data to render optimistically
  if (dashboardQuery.isLoading && !activeData) return (
    <div className="space-y-4 p-1">
      {slowLoad && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <svg className="h-5 w-5 text-amber-500 animate-spin shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <div>
            <div className="text-sm font-bold text-amber-800">Backend đang khởi động...</div>
            <div className="text-xs text-amber-700 mt-0.5">Server miễn phí ngủ sau 15 phút. Chờ 20–40 giây.</div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse"/>)}
      </div>
      <div className="h-56 rounded-2xl bg-slate-100 animate-pulse"/>
      <div className="h-40 rounded-2xl bg-slate-100 animate-pulse"/>
    </div>
  );

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-2xl lg:max-w-7xl space-y-5 pb-24 lg:pb-8">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{greeting}</div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-0.5 flex items-center gap-2">
                Tổng quan vận hành
                {dashboardQuery.isFetching && (
                  <span className="inline-flex items-center text-xs font-bold text-indigo-500 animate-pulse bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                    <RefreshCw size={11} className="animate-spin mr-1 text-indigo-500" />
                    Đang đồng bộ...
                  </span>
                )}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">Tháng {now.getMonth() + 1}/{now.getFullYear()}</div>
            <div className="text-xs font-bold text-slate-600 mt-0.5">{now.toLocaleDateString('vi-VN', { weekday: 'long' })}</div>
          </div>
        </div>

        {/* ── OVERDUE ALERT ── */}
        {overdueInvoices.length > 0 && (
          <Link href="/invoices?filter=Quá+hạn" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 transition hover:bg-red-100 active:scale-[0.99]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-red-800">{overdueInvoices.length} hóa đơn quá hạn</div>
              <div className="text-xs text-red-600 font-medium mt-0.5">Tổng nợ: {formatMoney(overdueAmount)}</div>
            </div>
            <ChevronRight size={16} className="text-red-400 shrink-0" />
          </Link>
        )}

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Thu tháng này" value={formatMoney(selectedPeriodFinancial.income)}
            sub={selectedPeriodFinancial.incomeChange != null
              ? `${selectedPeriodFinancial.incomeChange >= 0 ? '+' : ''}${selectedPeriodFinancial.incomeChange}% so tháng trước`
              : `Chi: ${formatMoney(selectedPeriodFinancial.expense)}`}
            icon={<TrendingUp size={18}/>} gradient
            trend={selectedPeriodFinancial.incomeChange}
          />
          <StatCard
            label="Thu nhập ròng" value={formatMoney(selectedPeriodFinancial.profit)}
            sub={selectedPeriodFinancial.income > 0 ? `Biên lợi nhuận ${Math.round((selectedPeriodFinancial.profit / selectedPeriodFinancial.income) * 100)}%` : '—'}
            icon={<Wallet size={18}/>} color={selectedPeriodFinancial.profit >= 0 ? "emerald" : "red"}
          />
          <StatCard
            label="Tỷ lệ lấp đầy" value={`${stats.occupancyRate}%`}
            sub={`${stats.occupied}/${stats.total} phòng đang ở`}
            icon={<Users size={18}/>} color="indigo"
          />
          <StatCard
            label="Phòng trống" value={`${stats.vacant}`}
            sub={stats.reserved > 0 ? `+ ${stats.reserved} đã cọc` : 'Sẵn sàng cho thuê'}
            icon={<Home size={18}/>} color="amber"
          />
        </div>

        {/* ── FINANCIAL REPORT & INTERACTIVE ANALYSIS ── */}
        <div className="grid gap-5 lg:grid-cols-5">

          {/* Bar Chart: Doanh thu & Chi phí 12 tháng */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">Biến động dòng tiền</div>
                  <div className="text-[11px] text-slate-500 font-medium">Click chọn tháng bên dưới để xem báo cáo chi tiết</div>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {[3, 6, 12].map(n => (
                  <button
                    key={n}
                    onClick={() => setChartMonths(n)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartMonths === n ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {n}T
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              {/* Summary stats for selected Month */}
              <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-center">
                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-0.5">Doanh thu T{selectedPeriod.month}</div>
                  <div className="text-sm sm:text-base font-black text-indigo-700">{formatMoney(selectedPeriodFinancial.income)}</div>
                </div>
                <div className="text-center border-x border-slate-200">
                  <div className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-0.5">Chi phí T{selectedPeriod.month}</div>
                  <div className="text-sm sm:text-base font-black text-red-600">{formatMoney(selectedPeriodFinancial.expense)}</div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${selectedPeriodFinancial.profit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>Ròng T{selectedPeriod.month}</div>
                  <div className={`text-sm sm:text-base font-black ${selectedPeriodFinancial.profit >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>{formatMoney(selectedPeriodFinancial.profit)}</div>
                </div>
              </div>

              {/* Bar Elements */}
              <div className="flex items-end gap-1.5 sm:gap-2 h-44 mb-3 pt-4">
                {financial.months.map((m, i) => {
                  const isSelected = m.month === selectedPeriod.month && m.year === selectedPeriod.year;
                  const revH = financial.maxVal > 0 ? Math.max(4, Math.round((m.rev / financial.maxVal) * 135)) : 4;
                  const expH = financial.maxVal > 0 ? Math.max(2, Math.round((m.exp / financial.maxVal) * 135)) : 2;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedPeriod({ month: m.month, year: m.year })}
                      className={`flex-1 flex flex-col items-center gap-1 group/bar cursor-pointer transition-all ${isSelected ? 'scale-105' : 'hover:scale-[1.03] opacity-65 hover:opacity-100'}`}
                    >
                      <div className="relative flex items-end gap-0.5 w-full justify-center">
                        <div
                          className={`w-3.5 rounded-t-sm transition-all duration-300 ${isSelected ? 'bg-indigo-600 shadow-md ring-2 ring-indigo-300' : 'bg-indigo-300 group-hover/bar:bg-indigo-400'}`}
                          style={{ height: `${revH}px` }}
                          title={`Doanh thu T${m.month}: ${formatMoney(m.rev)}`}
                        />
                        {m.exp > 0 && (
                          <div
                            className={`w-3.5 rounded-t-sm transition-all duration-300 ${isSelected ? 'bg-red-500 shadow-md ring-2 ring-red-300' : 'bg-red-300 group-hover/bar:bg-red-400'}`}
                            style={{ height: `${expH}px` }}
                            title={`Chi phí T${m.month}: ${formatMoney(m.exp)}`}
                          />
                        )}
                      </div>
                      <div className={`text-[11px] font-extrabold mt-1.5 transition-all ${isSelected ? 'text-indigo-600 scale-110 font-black' : 'text-slate-400'}`}>{m.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 justify-center text-xs text-slate-500 pt-2.5 border-t border-slate-50">
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-indigo-400"/> Tổng thu</div>
                <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-400"/> Chi phí</div>
                <span className="text-[10px] text-slate-400 font-semibold italic ml-auto hidden sm:inline">💡 Click chọn cột mốc để phân tích tháng tương ứng</span>
              </div>
            </div>
          </div>

          {/* Donut Charts & Analyst Insights */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <PieChart size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate">Cấu trúc & Hiệu suất nguồn thu</h3>
                <p className="text-xs text-slate-500 font-medium truncate">Chi tiết phân tích tháng {selectedPeriod.month}/{selectedPeriod.year}</p>
              </div>
            </div>

            {/* Circular Charts */}
            <div className="grid grid-cols-2 gap-4 justify-items-center">
              {/* Donut 1: Revenue breakdown */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cơ cấu doanh thu</span>
                <DonutChart data={revenueChartData} totalLabel="Tổng doanh thu" />
              </div>
              {/* Donut 2: Collection efficiency */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tỷ lệ thu</span>
                <DonutChart
                  data={collectionChartData.data}
                  totalLabel="Tổng hóa đơn"
                  totalValue={collectionChartData.billed}
                />
              </div>
            </div>

            {/* Legend details */}
            <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
              <div className="space-y-1.5">
                {revenueChartData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-500 truncate">{d.label}</span>
                    </div>
                    <span className="font-bold text-slate-800 shrink-0">{formatMoney(d.value)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 border-l border-slate-100 pl-4">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-500">Đã thu</span>
                  </div>
                  <span className="font-bold text-emerald-600 shrink-0">{formatMoney(collectionChartData.paid)}</span>
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-slate-500">Chưa thu</span>
                  </div>
                  <span className="font-bold text-red-600 shrink-0">{formatMoney(collectionChartData.unpaid)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-1.5">
                  <span className="text-slate-500 font-semibold">Tỷ lệ:</span>
                  <span className={`font-black ${collectionChartData.rate >= 90 ? 'text-emerald-600' : collectionChartData.rate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                    {collectionChartData.rate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Analyst Advice Box */}
            <div className="rounded-xl bg-slate-50 border border-slate-200/50 p-3.5 text-xs text-slate-700">
              <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                💡 Đánh giá hiệu suất:
              </div>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-600 font-medium leading-relaxed">
                {analystInsights.map((insight, idx) => (
                  <li key={idx}>{insight}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── DESKTOP-ONLY ANALYSIS BOARD (Operational & Financial Efficiency) ── */}
        <div className="hidden lg:grid gap-5 lg:grid-cols-4">
          {/* Card 1: Revenue breakdown by type (excl. services) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5 border-b border-slate-50 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phân rã doanh thu</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Tháng {selectedPeriod.month}</span>
              </div>
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-semibold">
                    <span>Doanh thu phòng (Thuần)</span>
                    <span className="text-slate-900 font-bold">{formatMoney(actualRent)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedPeriodFinancial.income > 0 ? (actualRent / selectedPeriodFinancial.income) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-semibold">
                    <span>Doanh thu dịch vụ & tiện ích</span>
                    <span className="text-slate-900 font-bold">{formatMoney(utilities.electricity + utilities.water + utilities.other)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedPeriodFinancial.income > 0 ? ((utilities.electricity + utilities.water + utilities.other) / selectedPeriodFinancial.income) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Doanh thu thuần chiếm:</span>
              <span className="font-bold text-slate-800">{rentRatio}% tổng thu</span>
            </div>
          </div>

          {/* Card 2: Maximum Rent Potential vs Gap */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5 border-b border-slate-50 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hiệu suất khai thác phòng</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Tối đa hóa</span>
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Tiềm năng tối đa (100% lấp đầy):</span>
                  <span className="text-slate-900 font-bold">{formatMoney(maxRoomRentPotential)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Thực thu tiền phòng thuần:</span>
                  <span className="text-blue-600 font-bold">{formatMoney(actualRent)}</span>
                </div>
                {rentGap > 0 ? (
                  <div className="flex justify-between text-xs text-red-500 font-semibold bg-red-50/50 p-2.5 rounded-xl border border-red-100/50">
                    <span>Thất thoát do trống phòng:</span>
                    <span className="font-bold">-{formatMoney(rentGap)}</span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-600 font-semibold bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50 text-center">
                    🎉 Đạt 100% công suất phòng tối đa!
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                <span>Tỷ lệ khai thác phòng:</span>
                <span className="font-bold text-slate-800">{maxRoomRentPotential > 0 ? Math.round((actualRent / maxRoomRentPotential) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${maxRoomRentPotential > 0 ? (actualRent / maxRoomRentPotential) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          {/* Card 3: Detailed Operating Expenses analysis */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5 border-b border-slate-50 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Phân tích chi phí</span>
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">Tháng này</span>
              </div>
              <div className="space-y-3 pt-1 text-xs text-slate-600">
                <div className="flex justify-between font-semibold">
                  <span>Tổng chi phí vận hành:</span>
                  <span className="text-red-600 font-bold">{formatMoney(selectedPeriodFinancial.expense)}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Hao phí điện nước chi hộ:</span>
                    <span className="font-bold text-slate-700">~{formatMoney(utilities.electricity + utilities.water)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Chi bảo trì, sửa chữa, khác:</span>
                    <span className="font-bold text-slate-700">{formatMoney(Math.max(0, selectedPeriodFinancial.expense - utilities.electricity - utilities.water))}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Tỷ suất chi/thu:</span>
              <span className="font-bold text-slate-800">
                {selectedPeriodFinancial.income > 0 ? Math.round((selectedPeriodFinancial.expense / selectedPeriodFinancial.income) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Card 4: Operational Analytics (ARR, RevPAR, Churn Rate) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5 border-b border-slate-50 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Chỉ số vận hành (KPI)</span>
                <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">Tháng {selectedPeriod.month}</span>
              </div>
              <div className="space-y-3.5 pt-1">
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1 font-semibold">
                    <span>ARR (Giá phòng TB thực tế):</span>
                    <span className="text-slate-900 font-bold">{formatMoney(arrValue)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-none">Doanh thu phòng thuần / số phòng đã thuê</div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1 font-semibold">
                    <span>RevPAR (Doanh thu / phòng trống):</span>
                    <span className="text-slate-900 font-bold">{formatMoney(revParValue)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-none">Doanh thu phòng thuần / tổng số phòng hiện có</div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1 font-semibold">
                    <span>Churn Rate (Tỷ lệ trả phòng):</span>
                    <span className={`font-bold ${churnRateValue > 10 ? 'text-red-500' : 'text-slate-900'}`}>{churnRateValue}%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-none">Tần suất khách trả phòng trong tháng</div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Đánh giá vận hành:</span>
              <span className={`font-black ${churnRateValue > 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                {churnRateValue > 10 ? "⚠️ Cảnh báo trống phòng" : "✓ Vận hành ổn định"}
              </span>
            </div>
          </div>
        </div>

        {/* ── MOBILE-ONLY VIEWS: OCCUPANCY + QUICK ACTIONS + VACANT ROOMS ── */}
        <div className="grid gap-4 lg:grid-cols-5 lg:hidden">
          {/* Occupancy visual */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Trạng thái phòng</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{stats.total} phòng</div>
              </div>
              <div className="text-3xl font-black text-indigo-600">{stats.occupancyRate}%</div>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
              {stats.occupied > 0 && <div className="bg-indigo-500 rounded-l-full" style={{ width: `${(stats.occupied/stats.total)*100}%` }}/>}
              {stats.reserved > 0 && <div className="bg-amber-400" style={{ width: `${(stats.reserved/stats.total)*100}%` }}/>}
              {stats.maintenance > 0 && <div className="bg-red-400" style={{ width: `${(stats.maintenance/stats.total)*100}%` }}/>}
              {stats.vacant > 0 && <div className="bg-slate-200 rounded-r-full flex-1"/>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <RoomLegend color="#6366f1" label="Đang thuê" count={stats.occupied}/>
              <RoomLegend color="#f59e0b" label="Đã cọc" count={stats.reserved}/>
              <RoomLegend color="#10b981" label="Trống" count={stats.vacant}/>
              <RoomLegend color="#ef4444" label="Bảo trì" count={stats.maintenance}/>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Truy cập nhanh</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <QuickBtn href="/invoices" icon={<Receipt size={20}/>} label="Hóa đơn" desc="Quản lý & gửi" color="indigo"/>
              <QuickBtn href="/rooms" icon={<Home size={20}/>} label="Phòng" desc="Xem & cập nhật" color="blue"/>
              <QuickBtn href="/deposits" icon={<Wallet size={20}/>} label="Tiền cọc" desc="Cọc giữ phòng" color="emerald"/>
              <QuickBtn href="/contracts" icon={<FileText size={20}/>} label="Hợp đồng" desc="Quản lý thuê" color="amber"/>
              <QuickBtn href="/owner/transactions" icon={<Repeat size={20}/>} label="Sổ thu chi" desc="Dòng tiền vào ra" color="rose"/>
              <QuickBtn href="/owner/settings" icon={<Settings size={20}/>} label="Cài đặt" desc="Cấu hình vận hành" color="slate"/>
            </div>
          </div>
        </div>

        {/* Vacant Rooms and Recent Transactions */}
        <div className="grid gap-4 lg:grid-cols-2 lg:hidden">
          {/* ── VACANT ROOMS ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="text-sm font-black text-slate-900">Phòng trống ({stats.vacant})</div>
              <Link href="/rooms?filter=Trống" className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800">
                Xem tất cả <ChevronRight size={13}/>
              </Link>
            </div>
            {vacantRooms.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400 font-medium">
                🎉 Tất cả phòng đã được lấp đầy!
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {vacantRooms.map(room => (
                  <div key={room.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{room.name}</div>
                      <div className="text-xs text-slate-500 font-medium">{formatMoney(room.price)}/tháng</div>
                    </div>
                    <Link
                      href={`/contracts/new?room_id=${room.id}`}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      <Plus size={12}/> Tạo HĐ
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RECENT TRANSACTIONS ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="text-sm font-black text-slate-900">Giao dịch gần đây</div>
              <Link href="/owner/transactions" className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800">
                Tất cả <ChevronRight size={13}/>
              </Link>
            </div>
            {recentTx.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400 font-medium">Chưa có giao dịch nào.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentTx.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 shrink-0 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {tx.type === 'income' ? <ArrowUpRight size={15}/> : <ArrowDownRight size={15}/>}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{tx.description || 'Giao dịch'}</div>
                        <div className="text-xs text-slate-500 font-medium">{tx.date}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-black shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </RBACGuard>
  );
}

// ── Native SVG DonutChart Component (scaled to 130px size) ────────────────────────
function DonutChart({ data, totalLabel, totalValue }: {
  data: Array<{ label: string; value: number; color: string }>;
  totalLabel: string;
  totalValue?: number;
}) {
  const total = totalValue !== undefined ? totalValue : data.reduce((s, d) => s + d.value, 0);
  let accumulatedPercent = 0;
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[130px] w-[130px] rounded-full border-2 border-dashed border-slate-200 text-[10px] text-slate-400 font-semibold">
        Chưa có số liệu
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      <svg width="130" height="130" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r="50" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
        {data.map((item, idx) => {
          if (item.value <= 0) return null;
          const percent = item.value / total;
          const strokeLength = percent * 314.159;
          const strokeOffset = -accumulatedPercent * 314.159;
          accumulatedPercent += percent;

          return (
            <circle
              key={idx}
              cx="60"
              cy="60"
              r="50"
              fill="transparent"
              stroke={item.color}
              strokeWidth="12"
              strokeDasharray={`${strokeLength} 314.159`}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              className="transition-all duration-300 hover:stroke-[14px]"
            />
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{totalLabel}</span>
        <span className="text-xs font-black text-slate-900 mt-0.5 truncate max-w-[90px]">
          {formatMoney(total)}
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color = "blue", gradient = false, trend }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  color?: string; gradient?: boolean; trend?: number | null;
}) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo:  'bg-indigo-50 text-indigo-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
  };
  if (gradient) {
    return (
      <div className="rounded-2xl p-4 shadow-sm text-white animate-all duration-300 hover:-translate-y-0.5 hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)' }}>
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3 bg-white/20 text-white">
          {icon}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-1">{label}</div>
        <div className="text-2xl font-black leading-tight truncate">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend != null && (
            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${trend >= 0 ? 'bg-white/20 text-white' : 'bg-red-400/40 text-white'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          <div className="text-xs text-white/90 font-medium truncate">{sub}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${colors[color] || colors.blue}`}>
        {icon}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-black text-slate-900 leading-tight truncate">{value}</div>
      <div className="text-xs text-slate-500 font-medium mt-1 truncate">{sub}</div>
    </div>
  );
}

function RoomLegend({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }}/>
      <span className="text-xs text-slate-500 font-medium flex-1">{label}</span>
      <span className="text-xs font-black text-slate-800">{count}</span>
    </div>
  );
}

function QuickBtn({ href, icon, label, desc, color }: { href: string; icon: React.ReactNode; label: string; desc: string; color: string }) {
  const colors: Record<string, string> = {
    indigo:  'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border-indigo-100',
    blue:    'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border-amber-100',
    rose:    'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-100',
    slate:   'bg-slate-50 text-slate-600 hover:bg-slate-700 hover:text-white border-slate-100',
  };
  return (
    <Link href={href} className={`flex flex-col items-center text-center gap-1.5 rounded-2xl border p-3 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${colors[color]}`}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-wider leading-none mt-1">{label}</span>
      <span className="text-[11px] opacity-80 font-semibold leading-tight line-clamp-1">{desc}</span>
    </Link>
  );
}
