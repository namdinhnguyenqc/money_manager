"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Home, Wallet, AlertCircle, Building2,
  FileText, ArrowRight, Plus, Zap, Droplet, ChevronRight,
  CalendarDays, ChevronLeft,
  CheckCircle2, ArrowUpRight, ShieldCheck, Phone, Send, Sparkles
} from 'lucide-react';
import { formatMoney, normalizeRoomStatus } from '@/lib/rentalOps';
import RBACGuard from '@/components/RBACGuard';
import { useOwnerDashboardInit, useOwnerCashflowSummary, useOwnerDashboardSummary, OwnerDashboardInit } from '@/hooks/useOwnerData';
import OwnerOnboardingGuide from '@/components/owner/OwnerOnboardingGuide';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import PageContainer from "@/components/ui/PageContainer";
import { getStoredSessionUser } from '@/utils/session';

const MONTH_NAMES = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

export default function OwnerDashboard() {
  const dashboardQuery = useOwnerDashboardInit();
  const [slowLoad, setSlowLoad] = useState(false);
  const [chartMonths, setChartMonths] = useState(12);
  const [facilityId, setFacilityId] = useState<string | null>(null);

  // Keep the fast first paint, but never let one owner's cached figures appear
  // in another owner's dashboard on a shared browser.
  const dashboardCacheKey = useMemo(() => {
    const user = getStoredSessionUser();
    return `owner_dashboard_cache:${String(user.email || 'anonymous').trim().toLowerCase()}`;
  }, []);
  const [cachedData, setCachedData] = useState<OwnerDashboardInit | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const user = getStoredSessionUser();
        const cacheKey = `owner_dashboard_cache:${String(user.email || 'anonymous').trim().toLowerCase()}`;
        const saved = localStorage.getItem(cacheKey);
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
        localStorage.setItem(dashboardCacheKey, JSON.stringify(dashboardQuery.data));
        setCachedData(dashboardQuery.data);
      } catch (e) {
        console.error("Failed to save dashboard cache:", e);
      }
    }
  }, [dashboardCacheKey, dashboardQuery.data]);

  const activeData = dashboardQuery.data ?? cachedData;

  const rooms = activeData?.rooms ?? [];
  const transactions = activeData?.transactions ?? [];
  const invoices = activeData?.invoices ?? [];

  const now = new Date();
  const curM = now.getMonth(), curY = now.getFullYear();

  // State to support review of different months
  const [selectedPeriod, setSelectedPeriod] = useState({ month: curM + 1, year: curY });
  const summaryQuery = useOwnerDashboardSummary(selectedPeriod.month, selectedPeriod.year, facilityId);
  const summary = summaryQuery.data;

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
  // The chart draws exactly `chartMonths` buckets ending at the selected period,
  // so ask the API for that window directly. This used to request
  // `max(chartMonths, diff + 1)` months ending at *today*, which for any past
  // period returned a range that barely overlapped the one being drawn — the
  // uncovered buckets fell back to 0 and the chart flat-lined. It also stopped
  // working entirely once `diff` pushed the count past the API's 18-month cap.
  const cashflowQuery = useOwnerCashflowSummary(chartMonths, selectedPeriod.month, selectedPeriod.year);
  const cashflowMonths = useMemo(() => cashflowQuery.data?.months ?? [], [cashflowQuery.data]);

  const findBucket = React.useCallback((month: number, year: number) =>
    cashflowMonths.find(b => b.month === month && b.year === year),
    [cashflowMonths]);

  const isCurrentPeriod = selectedPeriod.month === curM + 1 && selectedPeriod.year === curY;

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

  // Presentation-only: whether the selected window has any revenue/expense to
  // plot. No new data source — derived from the same `financial.months` the
  // chart already renders, so an empty state can replace the bars without
  // ever fabricating a value.
  const hasCashflowData = financial.months.some((m) => m.rev > 0 || m.exp > 0);

  // Invoices for selected period
  const thisMonthInvoices = useMemo(() => {
    return invoices.filter(inv => inv.month === selectedPeriod.month && inv.year === selectedPeriod.year);
  }, [invoices, selectedPeriod]);

  // Revenue composition and cash-flow use the same source of truth: actual
  // transactions posted in the selected period. The API allocates an invoice
  // payment proportionally across rent and services, including partial payments.
  const utilities = useMemo(() => {
    const composition = findBucket(selectedPeriod.month, selectedPeriod.year)?.composition;
    const rent = Number(composition?.rent || 0);
    const electricity = Number(composition?.electricity || 0);
    const water = Number(composition?.water || 0);
    const other = Number(composition?.other || 0);
    const total = rent + electricity + water + other;
    return { rent, electricity, water, other, total };
  }, [findBucket, selectedPeriod]);

  // Rent potential
  const actualRent = useMemo(() => {
    return utilities.rent;
  }, [utilities.rent]);

  const revParValue = useMemo(() => {
    return rooms.length > 0 ? Math.round(actualRent / rooms.length) : 0;
  }, [actualRent, rooms.length]);

  // Donut/Collection Data
  const collectionChartData = useMemo(() => {
    // Guard on `totals`, not on `summary`: a response that is missing the
    // aggregate (an unmapped endpoint in demo mode, or a partial payload) is
    // still a truthy object, and reading `.billed` off it took the whole
    // dashboard down with a client-side exception.
    if (summary?.totals) {
      return { billed: summary.totals.billed, paid: summary.totals.collected, unpaid: summary.totals.receivable, rate: Math.round((summary.totals.collectionRate ?? 0) * 100) };
    }
    let billed = 0, paid = 0;
    for (const inv of thisMonthInvoices) {
      billed += Math.round(Number(inv.total_amount || 0));
      paid += Math.round(Number(inv.paid_amount || 0));
    }
    const unpaid = Math.max(0, billed - paid);
    const rate = billed > 0 ? Math.round((paid / billed) * 100) : 0;
    return { billed, paid, unpaid, rate };
  }, [summary, thisMonthInvoices]);

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
      <div className="w-16 h-16 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
        <AlertCircle size={28} />
      </div>
      <div>
        <div className="font-bold text-slate-800 text-lg">Không tải được dữ liệu</div>
        <div className="text-sm text-slate-500 mt-1 max-w-xs">Server đang khởi động lại. Vui lòng thử lại sau vài giây.</div>
      </div>
      <Button variant="primary" size="lg" onClick={() => dashboardQuery.refetch()}>
        Thử lại
      </Button>
    </div>
  );

  // Skeleton loading: only trigger if we have zero cached data to render optimistically.
  // Also gate on cashflowQuery so the KPI cards / chart don't first paint at 0đ and then
  // pop to their real value once the (separate, DB-aggregated) cash-flow request resolves —
  // that flash was worse than a slightly longer skeleton on a true cold load.
  if ((dashboardQuery.isLoading || (cashflowQuery.isLoading && !cashflowQuery.data)) && !activeData) return (
    <div className="space-y-4 p-1">
      {slowLoad && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <svg className="h-5 w-5 text-amber-500 animate-spin shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <div>
            <div className="text-sm font-bold text-amber-800">Backend đang khởi động...</div>
            <div className="text-xs text-amber-700 mt-0.5">Server miễn phí ngủ sau 15 phút. Chờ 20–40 giây.</div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse"/>)}
      </div>
      <div className="h-56 rounded-xl bg-slate-100 animate-pulse"/>
      <div className="h-40 rounded-xl bg-slate-100 animate-pulse"/>
    </div>
  );

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <PageContainer width="wide" className="space-y-5 pb-20 animate-in fade-in duration-300">

        {/* ── HEADER ── */}
        <PageHeader
          subtitle="Quản lý vận hành"
          title="Tổng quan vận hành"
          description={`Thống kê hiệu suất nhà trọ kỳ T${selectedPeriod.month}/${selectedPeriod.year}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="dashboard-facility">Phạm vi quản lý</label>
              <select
                id="dashboard-facility"
                value={facilityId || ""}
                onChange={(event) => setFacilityId(event.target.value || null)}
                className="input max-w-[190px] text-xs font-semibold"
              >
                <option value="">Toàn bộ nhà trọ</option>
                {(summary?.facilities || []).map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
              </select>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                <Button type="button" variant="ghost" size="sm" aria-label="Tháng trước" onClick={() => { let m = selectedPeriod.month - 1; let y = selectedPeriod.year; if (m < 1) { m = 12; y--; } setSelectedPeriod({ month: m, year: y }); }}><ChevronLeft size={16} /></Button>
                <div className="flex items-center gap-1.5 whitespace-nowrap px-2 text-xs font-semibold text-slate-700">
                  <CalendarDays size={14} className="text-blue-600" />
                  Tháng {selectedPeriod.month}/{selectedPeriod.year}
                </div>
                <Button type="button" variant="ghost" size="sm" disabled={isCurrentPeriod} aria-label="Tháng sau" onClick={() => { let m = selectedPeriod.month + 1; let y = selectedPeriod.year; if (m > 12) { m = 1; y++; } setSelectedPeriod({ month: m, year: y }); }}><ChevronRight size={16} /></Button>
              </div>
            </div>
          }
        />

        {/* ── ONBOARDING GUIDE ── */}
        <OwnerOnboardingGuide />

        {/* ── OVERDUE ALERT BANNER ── */}
        {summary?.totals?.overdueCount ? (
          <Link href="/invoices?filter=Quá+hạn" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100/60">
            <AlertCircle size={18} className="shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-amber-900">{summary.totals.overdueCount} hóa đơn đã quá hạn</div>
              <div className="mt-0.5 text-xs text-amber-700">{formatMoney(summary.totals.overdue)} · trễ trung bình {summary.totals.averageOverdueDays} ngày</div>
            </div>
            <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-amber-800 sm:inline-flex">
              Xem chi tiết <ChevronRight size={14} />
            </span>
          </Link>
        ) : null}

        {/* ── SECTION A: KPI OVERVIEW (4 CARDS) ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500">Doanh thu phát sinh</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
              {formatMoney(summary?.totals?.billed ?? collectionChartData.billed)}
            </div>
            <div className="mt-1.5 truncate text-xs text-slate-500">Tổng giá trị hóa đơn trong kỳ</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500">Đã thực thu</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
              {formatMoney(summary?.totals?.collected ?? collectionChartData.paid)}
            </div>
            <div className="mt-1.5 text-xs text-slate-500">{Math.round((summary?.totals?.collectionRate ?? (collectionChartData.rate / 100)) * 100)}% doanh thu đã thu</div>
          </div>

          <Link href="/invoices?filter=Chưa+thu" className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
            <div className="text-xs font-semibold text-slate-500">Còn phải thu</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
              {formatMoney(summary?.totals?.receivable ?? collectionChartData.unpaid)}
            </div>
            <div className="mt-1.5 text-xs font-medium text-amber-700">Quá hạn: {formatMoney(summary?.totals?.overdue ?? overdueAmount)}</div>
          </Link>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500">Lợi nhuận</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
              {formatMoney(summary?.totals?.profit ?? 0)}
            </div>
            <div className="mt-1.5 text-xs text-slate-500">Biên lợi nhuận {Math.round((summary?.totals?.margin || 0) * 100)}% · Dòng tiền ròng {formatMoney(summary?.totals?.netCashflow || 0)}</div>
          </div>

        </div>

        {/* ── SECTION B: MAIN ANALYTICS (65% / 35% GRID) ── */}
        <div className="grid gap-5 lg:grid-cols-12 items-stretch">

          {/* Left Column (~70% desktop): Dòng tiền Cashflow Bar Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8">
            {/* Header & Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">Dòng tiền</h3>
                <p className="text-xs text-slate-500">So sánh tổng thu nhập và chi phí vận hành qua các tháng</p>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {[3, 6, 12, 18].map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant={chartMonths === n ? "primary" : "ghost"}
                    onClick={() => setChartMonths(n)}
                  >{n}T</Button>
                ))}
              </div>
            </div>

            {hasCashflowData ? (
              <>
                {/* Bar Chart */}
                <div className="mt-6 flex h-44 items-end gap-1.5 border-b border-slate-100 sm:gap-2">
                  {financial.months.map((m, i) => {
                    const isSelected = m.month === selectedPeriod.month && m.year === selectedPeriod.year;
                    const revH = financial.maxVal > 0 ? Math.max(4, Math.round((m.rev / financial.maxVal) * 130)) : 4;
                    const expH = financial.maxVal > 0 ? Math.max(2, Math.round((m.exp / financial.maxVal) * 130)) : 2;
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedPeriod({ month: m.month, year: m.year })}
                        className={`flex flex-1 cursor-pointer flex-col items-center gap-1 transition-opacity ${
                          isSelected ? "" : "opacity-60 hover:opacity-100"
                        }`}
                        title={`Kỳ T${m.month}/${m.year}: Thu ${formatMoney(m.rev)} | Chi ${formatMoney(m.exp)}`}
                      >
                        <div className="relative flex w-full items-end justify-center gap-0.5">
                          <div
                            className={`w-3 rounded-t-sm transition-all sm:w-4 ${isSelected ? "bg-blue-600" : "bg-blue-300"}`}
                            style={{ height: `${revH}px` }}
                          />
                          {m.exp > 0 && (
                            <div
                              className={`w-3 rounded-t-sm transition-all sm:w-4 ${isSelected ? "bg-red-500" : "bg-red-300"}`}
                              style={{ height: `${expH}px` }}
                            />
                          )}
                        </div>
                        <span className={`mt-1 text-[10px] font-semibold ${isSelected ? "text-blue-600" : "text-slate-400"}`}>
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-3 flex items-center justify-between gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Doanh thu</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /> Chi phí</span>
                  </div>
                  <span className="hidden text-[11px] text-slate-400 sm:inline">Nhấn vào cột để đổi kỳ phân tích</span>
                </div>
              </>
            ) : (
              <div className="mt-6 flex h-44 flex-col items-center justify-center gap-1 border-b border-slate-100 text-center">
                <span className="text-sm font-semibold text-slate-600">Chưa có dữ liệu dòng tiền</span>
                <span className="max-w-xs text-xs text-slate-400">Dữ liệu sẽ được hiển thị khi có phát sinh doanh thu hoặc chi phí trong kỳ.</span>
              </div>
            )}
          </div>

          {/* Right Column (~30% desktop): Tình trạng thu tiền */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Tình trạng thu tiền</h3>
              <span className="text-xs font-semibold text-slate-500">
                T{selectedPeriod.month}/{selectedPeriod.year}
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs text-slate-500">Tổng hóa đơn phát sinh</span>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-xl font-bold tabular-nums text-slate-900">{formatMoney(collectionChartData.billed)}</span>
                <span className={`text-xs font-semibold ${collectionChartData.rate >= 80 ? "text-emerald-700" : "text-amber-700"}`}>
                  {collectionChartData.rate}% đã thu
                </span>
              </div>

              <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-emerald-500" style={{ width: `${collectionChartData.rate}%` }} />
                <div className="h-full bg-amber-500" style={{ width: `${100 - collectionChartData.rate}%` }} />
              </div>

              <div className="mt-2 flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Đã thu: {formatMoney(collectionChartData.paid)}
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Chưa thu: {formatMoney(collectionChartData.unpaid)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              <Link
                href="/invoices?filter=Chưa+gửi"
                className="flex w-full items-center justify-between rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <span>Xem hóa đơn chưa thu ({thisMonthInvoices.filter(i => i.status !== "PAID").length})</span>
                <ArrowRight size={14} />
              </Link>

              <Link
                href="/invoices?filter=Quá+hạn"
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="flex items-center gap-1.5">
                  <Send size={13} className="text-blue-600" /> Nhắc thanh toán Zalo
                </span>
                <ChevronRight size={14} className="text-slate-400" />
              </Link>
            </div>

            {/* Actionable Insight Box */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cần chú ý</span>
              {collectionChartData.unpaid > 0 ? (
                <div className="mt-1.5 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span>{formatMoney(collectionChartData.unpaid)} chưa thu hồi</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Một số hóa đơn T{selectedPeriod.month} đang chờ khách thanh toán.</p>
                </div>
              ) : (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Đã thu hoàn tất 100% tiền phòng T{selectedPeriod.month}</span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ── SECTION C: BOTTOM ANALYTICS MODULES (3 MODULES GRID) ── */}
        <div className="grid gap-5 sm:grid-cols-3">

          {/* Module 1: P&L */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">P&L · T{selectedPeriod.month}/{selectedPeriod.year}</h4>
              <Link href="/owner/transactions" className="text-[11px] font-semibold text-blue-600">Chi tiết →</Link>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600"><span>Doanh thu phát sinh</span><strong className="text-slate-900">{formatMoney(summary?.totals?.billed || 0)}</strong></div>
              <div className="flex justify-between text-slate-600"><span>(-) Chi phí vận hành</span><strong className="text-slate-900">{formatMoney(summary?.totals?.expense || 0)}</strong></div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs font-medium flex justify-between"><span className="font-bold text-slate-700">Lợi nhuận</span><span className="font-bold text-emerald-600">{formatMoney(summary?.totals?.profit || 0)}</span></div>
            <div className="text-[11px] text-slate-500">Biên lợi nhuận {Math.round((summary?.totals?.margin || 0) * 100)}%</div>
          </div>

          {/* Module 2: Chi phí vận hành */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cơ cấu chi phí</h4>
              <span className="text-[11px] font-semibold text-slate-500">
                {formatMoney(summary?.totals?.expense || 0)}
              </span>
            </div>

            <div>
              <div className="space-y-1.5 text-xs">
                {(summary?.expenseComposition || []).length ? (summary?.expenseComposition || []).map((item) => <div key={item.name} className="flex justify-between text-slate-600"><span className="truncate pr-2">{item.name}</span><strong className="text-slate-800">{formatMoney(item.amount)}</strong></div>) : <span className="text-slate-400">Chưa có chi phí trong kỳ</span>}
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-1.5">
                <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((summary?.totals?.expense || 0) / Math.max(1, summary?.totals?.billed || 0) * 100))}%` }} />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs font-medium text-slate-500 flex justify-between">
              <span>{Math.round((summary?.totals?.margin || 0) * 100)}% doanh thu</span>
              <Link href="/owner/transactions" className="font-semibold text-blue-600">Xem sổ thu chi →</Link>
            </div>
          </div>

          {/* Module 3: Tình trạng phòng */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tình trạng phòng</h4>
              <span className="text-[11px] font-semibold text-blue-600">
                {summary?.occupancy?.total ? Math.round((summary.occupancy.occupied / summary.occupancy.total) * 100) : 0}% lấp đầy
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Đang thuê</span><strong>{summary?.occupancy?.occupied || 0} / {summary?.occupancy?.total || 0} phòng</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Phòng trống</span><strong className="text-amber-700">{summary?.occupancy?.vacant || 0}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Sắp hết hợp đồng (30 ngày)</span><strong>{summary?.occupancy?.expiringContracts || 0}</strong></div>
            </div>
          </div>

        </div>

        {!facilityId && (summary?.facilitiesPerformance || []).length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-bold text-slate-900">Hiệu suất theo cơ sở</h3><p className="mt-0.5 text-xs text-slate-500">Ưu tiên cơ sở có công nợ hoặc tỷ lệ thu thấp.</p></div>
              <Link href="/owner/boarding-houses" className="text-xs font-semibold text-blue-600">Xem cơ sở →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="border-b border-slate-100 text-slate-500"><tr><th className="pb-2 font-semibold">Cơ sở</th><th className="pb-2 text-right font-bold">Lấp đầy</th><th className="pb-2 text-right font-bold">Đã thu</th><th className="pb-2 text-right font-bold">Quá hạn</th><th className="pb-2 text-right font-bold">Trạng thái</th></tr></thead>
                <tbody>{(summary?.facilitiesPerformance || []).slice(0, 5).map((facility) => {
                  const needsAttention = facility.overdue > 0 || facility.collectedRate < 80 || facility.occupancyRate < 80;
                  return <tr key={facility.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50"><td className="py-3 font-semibold text-slate-800">{facility.name}</td><td className="py-3 text-right">{facility.occupancyRate}%</td><td className="py-3 text-right">{facility.collectedRate}%</td><td className="py-3 text-right font-semibold text-amber-700">{formatMoney(facility.overdue)}</td><td className="py-3 text-right"><button aria-pressed={facilityId === facility.id} type="button" onClick={() => setFacilityId(facility.id)} className={needsAttention ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>{needsAttention ? "Cần chú ý" : "Tốt"}</button></td></tr>;
                })}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FOOTER: QUICK ACTIONS & RECENT TRANSACTIONS ── */}
        <div className="grid gap-5 lg:grid-cols-12">
          
          {/* Quick Actions (5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác nhanh</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/rooms/new" className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                <Plus size={16} className="text-blue-600" /> Thêm phòng mới
              </Link>
              <Link href="/invoices/new" className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                <FileText size={16} className="text-blue-600" /> Lập hóa đơn mới
              </Link>
              <Link href="/contracts/new" className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                <Users size={16} className="text-blue-600" /> Tạo hợp đồng mới
              </Link>
              <Link href="/owner/transactions/new" className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                <Wallet size={16} className="text-blue-600" /> Ghi chép thu chi
              </Link>
            </div>
          </div>

          {/* Recent Transactions (7 cols) */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giao dịch gần đây</h4>
              <Link href="/owner/transactions" className="flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:underline">
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

      </PageContainer>
    </RBACGuard>
  );
}
