"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Home, Wallet, AlertCircle, Building2,
  FileText, ArrowRight, Plus, Zap, Droplet, ChevronRight,
  TrendingUp, TrendingDown, CalendarDays, ChevronLeft,
  CheckCircle2, ArrowUpRight, ShieldCheck, Phone, Send, Sparkles
} from 'lucide-react';
import { formatMoney, normalizeRoomStatus } from '@/lib/rentalOps';
import RBACGuard from '@/components/RBACGuard';
import { useOwnerDashboardInit, useOwnerCashflowSummary, OwnerDashboardInit } from '@/hooks/useOwnerData';
import OwnerOnboardingGuide from '@/components/owner/OwnerOnboardingGuide';
import PageHeader from '@/components/ui/PageHeader';

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

  // Historical monthly income/expense comes from a dedicated, DB-aggregated
  // endpoint (not the `transactions` array above, which /dashboard-init
  // deliberately scopes to the current month only to keep app-startup
  // payload small — see backend/src/routes/owner.ts:/cashflow-summary).
  // Request enough months to also cover whatever period the user has
  // navigated to via "Tháng trước/sau", capped at the 18 the backend allows.
  const monthsNeeded = useMemo(() => {
    const diff = (curY - selectedPeriod.year) * 12 + (curM - (selectedPeriod.month - 1));
    return Math.min(18, Math.max(chartMonths, diff + 1));
  }, [chartMonths, selectedPeriod, curY, curM]);
  const cashflowQuery = useOwnerCashflowSummary(monthsNeeded);
  const cashflowMonths = useMemo(() => cashflowQuery.data?.months ?? [], [cashflowQuery.data]);

  const findBucket = React.useCallback((month: number, year: number) =>
    cashflowMonths.find(b => b.month === month && b.year === year),
    [cashflowMonths]);

  // Financial details calculated dynamically based on selectedPeriod
  const selectedPeriodFinancial = useMemo(() => {
    const current = findBucket(selectedPeriod.month, selectedPeriod.year);
    const income = current?.income ?? 0;
    const expense = current?.expense ?? 0;

    const prevM = selectedPeriod.month === 1 ? 12 : selectedPeriod.month - 1;
    const prevY = selectedPeriod.month === 1 ? selectedPeriod.year - 1 : selectedPeriod.year;
    const prevIncome = findBucket(prevM, prevY)?.income ?? 0;
    const incomeChange = prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : null;

    return { income, expense, profit: income - expense, incomeChange };
  }, [findBucket, selectedPeriod]);

  const financial = useMemo(() => {
    const current = findBucket(selectedPeriod.month, selectedPeriod.year);
    const income = current?.income ?? 0;
    const expense = current?.expense ?? 0;

    // Build monthly breakdown for chart from the aggregated buckets
    const months = Array.from({ length: chartMonths }, (_, i) => {
      const d = new Date(selectedPeriod.year, (selectedPeriod.month - 1) - (chartMonths - 1 - i), 1);
      const mm = d.getMonth(), yy = d.getFullYear();
      const bucket = findBucket(mm + 1, yy);
      const rev = bucket?.income ?? 0;
      const exp = bucket?.expense ?? 0;
      return { label: MONTH_NAMES[mm], month: mm + 1, year: yy, rev, exp, profit: rev - exp };
    });
    const maxVal = Math.max(...months.map(m => Math.max(m.rev, m.exp)), 1);

    return { income, expense, profit: income - expense, months, maxVal };
  }, [findBucket, chartMonths, selectedPeriod]);

  // Invoices for selected period
  const thisMonthInvoices = useMemo(() => {
    return invoices.filter(inv => inv.month === selectedPeriod.month && inv.year === selectedPeriod.year);
  }, [invoices, selectedPeriod]);

  // Utility breakdown from invoices
  const utilities = useMemo(() => {
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
  }, [thisMonthInvoices, transactions, selectedPeriod]);

  // Rent potential
  const actualRent = useMemo(() => {
    const invoiceRent = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.room_fee || 0), 0);
    if (invoiceRent > 0) return invoiceRent;
    const currentOccupiedRent = rooms
      .filter(r => normalizeRoomStatus(r) === 'occupied')
      .reduce((sum, r) => sum + Number(r.price || 0), 0);
    if (currentOccupiedRent > 0) return currentOccupiedRent;
    return utilities.rent || 0;
  }, [thisMonthInvoices, rooms, utilities.rent]);

  const revParValue = useMemo(() => {
    return rooms.length > 0 ? Math.round(actualRent / rooms.length) : 0;
  }, [actualRent, rooms.length]);

  // Donut/Collection Data
  const collectionChartData = useMemo(() => {
    let billed = 0, paid = 0;
    for (const inv of thisMonthInvoices) {
      billed += Math.round(Number(inv.total_amount || 0));
      paid += Math.round(Number(inv.paid_amount || 0));
    }
    const unpaid = Math.max(0, billed - paid);
    const rate = billed > 0 ? Math.round((paid / billed) * 100) : 0;
    return { billed, paid, unpaid, rate };
  }, [thisMonthInvoices]);

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

  const recentTx = useMemo(() =>
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [transactions]);

  // Expense ratio %
  const expenseRatio = useMemo(() => {
    return selectedPeriodFinancial.income > 0 ? Math.min(100, Math.round((selectedPeriodFinancial.expense / selectedPeriodFinancial.income) * 100)) : 0;
  }, [selectedPeriodFinancial]);

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

  // Skeleton loading: only trigger if we have zero cached data to render optimistically.
  // Also gate on cashflowQuery so the KPI cards / chart don't first paint at 0đ and then
  // pop to their real value once the (separate, DB-aggregated) cash-flow request resolves —
  // that flash was worse than a slightly longer skeleton on a true cold load.
  if ((dashboardQuery.isLoading || (cashflowQuery.isLoading && !cashflowQuery.data)) && !activeData) return (
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
      <div className="mx-auto max-w-7xl space-y-5 pb-20 animate-in fade-in duration-300">

        {/* ── HEADER ── */}
        <PageHeader
          subtitle="Quản lý vận hành"
          title="Tổng quan vận hành"
          description={`Thống kê hiệu suất nhà trọ kỳ T${selectedPeriod.month}/${selectedPeriod.year}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    let m = selectedPeriod.month - 1;
                    let y = selectedPeriod.year;
                    if (m < 1) { m = 12; y--; }
                    setSelectedPeriod({ month: m, year: y });
                  }}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
                  title="Tháng trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-800 whitespace-nowrap">
                  <CalendarDays size={14} className="text-blue-600" />
                  Tháng {selectedPeriod.month}/{selectedPeriod.year}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    let m = selectedPeriod.month + 1;
                    let y = selectedPeriod.year;
                    if (m > 12) { m = 1; y++; }
                    setSelectedPeriod({ month: m, year: y });
                  }}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
                  title="Tháng sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

            </div>
          }
        />

        {/* ── ONBOARDING GUIDE ── */}
        <OwnerOnboardingGuide />

        {/* ── OVERDUE ALERT BANNER ── */}
        {overdueInvoices.length > 0 && (
          <Link href="/invoices?filter=Quá+hạn" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 transition hover:bg-amber-100/80 active:scale-[0.99] shadow-xs">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <AlertCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-amber-900">{overdueInvoices.length} hóa đơn đang chờ thanh toán / quá hạn</div>
              <div className="text-xs text-amber-700 font-medium mt-0.5">Tổng nợ đọng cần thu: <span className="font-bold">{formatMoney(overdueAmount)}</span></div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-white/80 border border-amber-200 px-3 py-1.5 rounded-xl shrink-0">
              Xem chi tiết <ChevronRight size={14} />
            </span>
          </Link>
        )}

        {/* ── SECTION A: KPI OVERVIEW (4 CARDS) ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
          
          {/* Card 1: Đã thu tháng này */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Đã thu tháng này</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
              {formatMoney(collectionChartData.paid)}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              {selectedPeriodFinancial.incomeChange != null ? (
                <span className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded text-[11px] ${selectedPeriodFinancial.incomeChange >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {selectedPeriodFinancial.incomeChange >= 0 ? "↑" : "↓"} {Math.abs(selectedPeriodFinancial.incomeChange)}%
                </span>
              ) : null}
              <span className="truncate">{selectedPeriodFinancial.incomeChange != null ? "so với tháng trước" : `Phát sinh: ${formatMoney(selectedPeriodFinancial.income)}`}</span>
            </div>
          </div>

          {/* Card 2: Lợi nhuận ròng */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lợi nhuận ròng</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <Wallet size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
              {formatMoney(selectedPeriodFinancial.profit)}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Biên lợi nhuận</span>
              <span className="font-bold text-emerald-600">
                {selectedPeriodFinancial.income > 0 ? Math.round((selectedPeriodFinancial.profit / selectedPeriodFinancial.income) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Card 3: Tỷ lệ lấp đầy */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tỷ lệ lấp đầy</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <Users size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
              {stats.occupancyRate}%
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>{stats.occupied}/{stats.total} phòng thuê</span>
              {stats.occupancyRate === 100 ? (
                <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 size={12} /> Tối đa
                </span>
              ) : (
                <span className="font-bold text-amber-600">{stats.vacant} phòng trống</span>
              )}
            </div>
          </div>

          {/* Card 4: Chưa thu (Accent Amber) */}
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-4 sm:p-5 shadow-xs transition-all hover:bg-amber-50/70">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Chưa thu</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-amber-950 leading-none">
              {formatMoney(collectionChartData.unpaid)}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs font-medium">
              <span className="text-amber-700">{collectionChartData.billed > 0 ? 100 - collectionChartData.rate : 0}% tổng hóa đơn</span>
              <Link href="/invoices" className="font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                Chi tiết <ChevronRight size={12} />
              </Link>
            </div>
          </div>

        </div>

        {/* ── SECTION B: MAIN ANALYTICS (65% / 35% GRID) ── */}
        <div className="grid gap-5 lg:grid-cols-12 items-stretch">

          {/* Left Column (65% - 8 cols on desktop): Dòng tiền Cashflow Bar Chart */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header & Filter */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Dòng tiền</h3>
                  <p className="text-xs text-slate-500 font-medium">So sánh tổng thu nhập và chi phí vận hành qua các tháng</p>
                </div>

                <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
                  {[3, 6, 12, 18].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setChartMonths(n)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        chartMonths === n ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {n}T
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Metric Strip */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100 mb-5 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">Doanh thu T{selectedPeriod.month}</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900">{formatMoney(selectedPeriodFinancial.income)}</span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block mb-0.5">Chi phí T{selectedPeriod.month}</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900">{formatMoney(selectedPeriodFinancial.expense)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">Lợi nhuận T{selectedPeriod.month}</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900">{formatMoney(selectedPeriodFinancial.profit)}</span>
                </div>
              </div>

              {/* Compact Bar Chart (Height reduced 25-30%) */}
              <div className="flex items-end gap-1.5 sm:gap-2 h-44 pt-2 pb-1">
                {financial.months.map((m, i) => {
                  const isSelected = m.month === selectedPeriod.month && m.year === selectedPeriod.year;
                  const revH = financial.maxVal > 0 ? Math.max(4, Math.round((m.rev / financial.maxVal) * 130)) : 4;
                  const expH = financial.maxVal > 0 ? Math.max(2, Math.round((m.exp / financial.maxVal) * 130)) : 2;
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedPeriod({ month: m.month, year: m.year })}
                      className={`flex-1 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        isSelected ? "scale-105" : "hover:scale-102 opacity-75 hover:opacity-100"
                      }`}
                      title={`Kỳ T${m.month}/${m.year}: Thu ${formatMoney(m.rev)} | Chi ${formatMoney(m.exp)}`}
                    >
                      <div className="relative flex items-end gap-0.5 w-full justify-center">
                        <div
                          className={`w-3 sm:w-4 rounded-t-sm transition-all ${
                            isSelected ? "bg-blue-600 ring-2 ring-blue-300" : "bg-blue-300"
                          }`}
                          style={{ height: `${revH}px` }}
                        />
                        {m.exp > 0 && (
                          <div
                            className={`w-3 sm:w-4 rounded-t-sm transition-all ${
                              isSelected ? "bg-red-500 ring-2 ring-red-300" : "bg-red-300"
                            }`}
                            style={{ height: `${expH}px` }}
                          />
                        )}
                      </div>
                      <span className={`text-[10px] font-bold mt-1 ${isSelected ? "text-blue-600 font-black" : "text-slate-400"}`}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-blue-500" /> Doanh thu</div>
                <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-red-400" /> Chi phí</div>
              </div>
              <span className="text-[11px] text-slate-400 font-medium italic hidden sm:inline">Nhấn vào cột để đổi kỳ phân tích</span>
            </div>
          </div>

          {/* Right Column (35% - 4 cols on desktop): Tình trạng thu tiền & Actionable Center */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            
            {/* Header & Total Billed */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Tình trạng thu tiền</h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  T{selectedPeriod.month}/{selectedPeriod.year}
                </span>
              </div>

              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 mb-4">
                <span className="text-xs font-semibold text-slate-500 block mb-0.5">Tổng hóa đơn phát sinh</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-slate-900">{formatMoney(collectionChartData.billed)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${collectionChartData.rate >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {collectionChartData.rate}% đã thu
                  </span>
                </div>

                {/* Progress Dual Bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden flex mt-2.5">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${collectionChartData.rate}%` }} />
                  <div className="bg-amber-500 h-full transition-all" style={{ width: `${100 - collectionChartData.rate}%` }} />
                </div>

                <div className="flex justify-between text-xs font-semibold mt-2 pt-1 border-t border-slate-200/50">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Đã thu: {formatMoney(collectionChartData.paid)}
                  </span>
                  <span className="text-amber-700 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Chưa thu: {formatMoney(collectionChartData.unpaid)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Link
                  href="/invoices?filter=Chưa+gửi"
                  className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <span>Xem hóa đơn chưa thu ({thisMonthInvoices.filter(i => i.status !== "PAID").length})</span>
                  <ArrowRight size={14} />
                </Link>

                <Link
                  href="/invoices?filter=Quá+hạn"
                  className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Send size={13} className="text-blue-600" /> Nhắc thanh toán Zalo
                  </span>
                  <ChevronRight size={14} className="text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Actionable Insight Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">Cần chú ý</span>
              {collectionChartData.unpaid > 0 ? (
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                    <span>{formatMoney(collectionChartData.unpaid)} chưa thu hồi</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Một số hóa đơn T{selectedPeriod.month} đang chờ khách thanh toán.</p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Đã thu hoàn tất 100% tiền phòng T{selectedPeriod.month}</span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ── SECTION C: BOTTOM ANALYTICS MODULES (3 MODULES GRID) ── */}
        <div className="grid gap-5 sm:grid-cols-3">

          {/* Module 1: Hiệu suất phòng */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Hiệu suất phòng</h4>
              {stats.occupancyRate === 100 ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 size={11} /> Công suất tối đa
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  {stats.vacant} phòng trống
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-slate-900">{stats.occupied} / {stats.total} phòng</span>
                <span className="text-xs font-bold text-slate-600">{stats.occupancyRate}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-1.5">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${stats.occupancyRate}%` }} />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs font-medium text-slate-500 flex justify-between">
              <span>Doanh thu TB/phòng (RevPAR):</span>
              <span className="font-bold text-slate-800">{formatMoney(revParValue)}</span>
            </div>
          </div>

          {/* Module 2: Chi phí vận hành */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Chi phí vận hành</h4>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {expenseRatio}% doanh thu
              </span>
            </div>

            <div>
              <div className="text-lg font-black text-slate-900">{formatMoney(selectedPeriodFinancial.expense)}</div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-1.5">
                <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${expenseRatio}%` }} />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs font-medium text-slate-500 flex justify-between">
              <span>Lợi nhuận gộp sau chi phí:</span>
              <span className="font-bold text-emerald-600">{formatMoney(selectedPeriodFinancial.profit)}</span>
            </div>
          </div>

          {/* Module 3: Cơ cấu doanh thu */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Cơ cấu doanh thu</h4>
              <span className="text-[11px] font-bold text-blue-600">
                {formatMoney(utilities.total || selectedPeriodFinancial.income)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /> Tiền phòng</span>
                <span className="font-bold text-slate-800">{formatMoney(utilities.rent || actualRent)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /> Tiền điện</span>
                <span className="font-bold text-slate-800">{formatMoney(utilities.electricity)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-cyan-500" /> Tiền nước</span>
                <span className="font-bold text-slate-800">{formatMoney(utilities.water)}</span>
              </div>
              {utilities.other > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-purple-500" /> Dịch vụ khác</span>
                  <span className="font-bold text-slate-800">{formatMoney(utilities.other)}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── FOOTER: QUICK ACTIONS & RECENT TRANSACTIONS ── */}
        <div className="grid gap-5 lg:grid-cols-12">
          
          {/* Quick Actions (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">Thao tác nhanh</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/rooms/new" className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-xs font-bold text-slate-700">
                <Plus size={16} className="text-blue-600" /> Thêm phòng mới
              </Link>
              <Link href="/invoices/new" className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-xs font-bold text-slate-700">
                <FileText size={16} className="text-blue-600" /> Lập hóa đơn mới
              </Link>
              <Link href="/contracts/new" className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-xs font-bold text-slate-700">
                <Users size={16} className="text-blue-600" /> Tạo hợp đồng mới
              </Link>
              <Link href="/owner/transactions/new" className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all text-xs font-bold text-slate-700">
                <Wallet size={16} className="text-blue-600" /> Ghi chép thu chi
              </Link>
            </div>
          </div>

          {/* Recent Transactions (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Giao dịch gần đây</h4>
              <Link href="/owner/transactions" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight size={12} />
              </Link>
            </div>

            {recentTx.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">Chưa có giao dịch thu chi nào</div>
            ) : (
              <div className="space-y-2">
                {recentTx.map((tx: any, idx: number) => (
                  <div key={tx.id || idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold shrink-0 ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{tx.description || tx.category_name || "Giao dịch"}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{new Date(tx.date).toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>
                    <span className={`font-bold shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                    </span>
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
