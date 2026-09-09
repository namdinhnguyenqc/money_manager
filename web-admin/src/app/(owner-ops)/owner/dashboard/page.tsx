"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Home, Wallet, AlertCircle, Building2,
  FileText, ArrowRight, Plus, Zap, Droplet, ChevronRight,
  CalendarDays, ChevronLeft, BarChart3, Clock, PieChart, ArrowDownLeft,
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

  // Presentation-only, and it keeps two states apart that both end up looking
  // like zeros. /cashflow-summary pre-creates a bucket for every month in the
  // window, so a 0 that came back with a response is a real "nothing was
  // recorded that month" — not missing data, and the chart should say so.
  // A window with no response at all (the request failed, or never ran) is the
  // genuinely unknown case: findBucket then misses every month and the same
  // zeros appear, which must not be reported as a real zero.
  const cashflowLoaded = Boolean(cashflowQuery.data);
  const cashflowHasMovement = financial.months.some((m) => m.rev > 0 || m.exp > 0);

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
      <PageContainer width="wide" className="space-y-4 pb-20 animate-in fade-in duration-300">

        {/* ── HEADER ── */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">Dashboard</h1>
            <p className="mt-0.5 text-sm text-slate-500">Tổng quan hoạt động kinh doanh của bạn</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="dashboard-facility">Phạm vi quản lý</label>
            <div className="relative">
              <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                id="dashboard-facility"
                value={facilityId || ""}
                onChange={(event) => setFacilityId(event.target.value || null)}
                className="input h-10 max-w-[200px] !pl-9 text-sm"
              >
                <option value="">Tất cả cơ sở</option>
                {(summary?.facilities || []).map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
              </select>
            </div>
            <div className="flex h-10 items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1">
              <Button type="button" variant="ghost" size="sm" aria-label="Tháng trước" onClick={() => { let m = selectedPeriod.month - 1; let y = selectedPeriod.year; if (m < 1) { m = 12; y--; } setSelectedPeriod({ month: m, year: y }); }}><ChevronLeft size={16} /></Button>
              <span className="flex items-center gap-1.5 whitespace-nowrap px-1.5 text-sm font-semibold text-slate-700">
                <CalendarDays size={16} className="text-slate-400" />
                T{selectedPeriod.month}/{selectedPeriod.year}
              </span>
              <Button type="button" variant="ghost" size="sm" disabled={isCurrentPeriod} aria-label="Tháng sau" onClick={() => { let m = selectedPeriod.month + 1; let y = selectedPeriod.year; if (m > 12) { m = 1; y++; } setSelectedPeriod({ month: m, year: y }); }}><ChevronRight size={16} /></Button>
            </div>
          </div>
        </header>

        {/* ── ONBOARDING GUIDE ── */}
        <OwnerOnboardingGuide />

        {/* ── OVERDUE ALERT BANNER (chỉ hiện khi có hóa đơn quá hạn) ── */}
        {summary?.totals?.overdueCount ? (
          <Link href="/invoices?filter=Quá+hạn" className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 transition-colors hover:bg-amber-50">
            <AlertCircle size={16} className="shrink-0 text-amber-600" />
            <span className="min-w-0 flex-1 text-[13px] leading-5 text-amber-900">
              <strong className="font-semibold">{summary.totals.overdueCount} hóa đơn đã quá hạn</strong>
              <span className="text-amber-700"> · {formatMoney(summary.totals.overdue)} · trễ trung bình {summary.totals.averageOverdueDays} ngày</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-amber-600" />
          </Link>
        ) : null}

        {/* ── ROW 1: KPI ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<BarChart3 size={18} />}
            iconClass="bg-blue-50 text-blue-600"
            label="Doanh thu"
            value={formatMoney(summary?.totals?.billed ?? collectionChartData.billed)}
            hint="Tổng giá trị hóa đơn trong kỳ"
          />
          <KpiCard
            icon={<Wallet size={18} />}
            iconClass="bg-emerald-50 text-emerald-600"
            label="Đã thu"
            value={formatMoney(summary?.totals?.collected ?? collectionChartData.paid)}
            hint={`${Math.round((summary?.totals?.collectionRate ?? (collectionChartData.rate / 100)) * 100)}% doanh thu`}
          />
          <KpiCard
            icon={<Clock size={18} />}
            iconClass="bg-amber-50 text-amber-600"
            label="Chưa thu"
            value={formatMoney(summary?.totals?.receivable ?? collectionChartData.unpaid)}
            hint={summary?.totals?.overdueCount ? `${summary.totals.overdueCount} hóa đơn quá hạn` : "Không có hóa đơn quá hạn"}
            hintClass={summary?.totals?.overdueCount ? "text-red-600" : "text-slate-500"}
            href="/invoices?filter=Chưa+thu"
          />
          <KpiCard
            icon={<PieChart size={18} />}
            iconClass="bg-slate-100 text-slate-600"
            label="Lợi nhuận"
            value={formatMoney(summary?.totals?.profit ?? 0)}
            hint={`Biên lợi nhuận ${Math.round((summary?.totals?.margin || 0) * 100)}% · Dòng tiền ròng ${formatMoney(summary?.totals?.netCashflow || 0)}`}
          />
        </div>

        {/* ── ROW 2: DÒNG TIỀN (≈68%) + TÌNH TRẠNG THU TIỀN (≈32%) ── */}
        <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">

          {/* Dòng tiền */}
          <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Dòng tiền</h2>
                  <p className="text-xs text-slate-500">Biểu đồ doanh thu và chi phí trong {chartMonths} tháng gần nhất</p>
                </div>
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

            {cashflowLoaded && cashflowHasMovement ? (
              <CashflowChart
                months={financial.months}
                maxVal={financial.maxVal}
                selected={selectedPeriod}
                onSelect={(month, year) => setSelectedPeriod({ month, year })}
              />
            ) : (
              <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-1.5 py-16 text-center">
                <span className="text-sm font-semibold text-slate-600">
                  {cashflowLoaded ? "Chưa phát sinh thu chi trong kỳ này" : "Chưa tải được dữ liệu dòng tiền"}
                </span>
                <span className="max-w-xs text-[13px] leading-5 text-slate-400">
                  {cashflowLoaded
                    ? "Kỳ đang xem không ghi nhận khoản thu hoặc chi nào. Biểu đồ sẽ hiện khi có giao dịch."
                    : "Chưa nhận được số liệu thu chi cho kỳ này. Thử tải lại trang sau giây lát."}
                </span>
              </div>
            )}
          </section>

          {/* Tình trạng thu tiền */}
          <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Wallet size={18} />
                </span>
                <h2 className="text-base font-bold text-slate-900">Tình trạng thu tiền</h2>
              </div>
              <Link href="/invoices" aria-label="Mở danh sách hóa đơn" className="text-slate-400 transition-colors hover:text-blue-600">
                <ChevronRight size={18} />
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-6">
              <Donut
                size={128}
                centerValue={`${collectionChartData.rate}%`}
                centerLabel="Đã thu"
                segments={[
                  { value: summary?.totals?.collected ?? collectionChartData.paid, color: "#10B981" },
                  { value: summary?.totals?.notDue ?? collectionChartData.unpaid, color: "#F59E0B" },
                  { value: summary?.totals?.overdue ?? 0, color: "#EF4444" },
                ]}
              />
              <dl className="min-w-0 flex-1 space-y-3.5 text-sm leading-5">
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đã thu</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{formatMoney(summary?.totals?.collected ?? collectionChartData.paid)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-amber-500" />Chưa thu</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{formatMoney(summary?.totals?.receivable ?? collectionChartData.unpaid)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-red-500" />Quá hạn</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{formatMoney(summary?.totals?.overdue ?? overdueAmount)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-auto space-y-2 pt-5">
              <Link
                href="/invoices?filter=Chưa+gửi"
                className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <FileText size={16} className="text-slate-400" />
                  Xem {thisMonthInvoices.filter(i => i.status !== "PAID").length} hóa đơn chưa thu
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </Link>
              <Link
                href="/invoices?filter=Quá+hạn"
                className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <Send size={16} className="text-blue-600" />
                  Nhắc thanh toán Zalo
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </Link>
            </div>
          </section>

        </div>

        {/* ── ROW 3: CƠ CẤU CHI PHÍ · TÌNH TRẠNG PHÒNG · HOẠT ĐỘNG GẦN ĐÂY ── */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Cơ cấu chi phí */}
          <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <BarChart3 size={18} />
                </span>
                <h2 className="text-base font-bold text-slate-900">Cơ cấu chi phí</h2>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                T{selectedPeriod.month}/{selectedPeriod.year}
              </span>
            </div>

            {(summary?.expenseComposition || []).length ? (
              <>
                <div className="mt-5 flex items-center gap-4">
                  <Donut
                    size={80}
                    centerValue={formatMoney(summary?.totals?.expense || 0)}
                    centerLabel="Tổng chi phí"
                    compactCenter
                    segments={(summary?.expenseComposition || []).map((item, i) => ({
                      value: Number(item.amount || 0),
                      color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
                    }))}
                  />
                  <dl className="min-w-0 flex-1 space-y-3 text-[13px] leading-5">
                    {(summary?.expenseComposition || []).map((item, i) => {
                      const totalExpense = summary?.totals?.expense || 0;
                      const share = totalExpense > 0 ? Math.round((Number(item.amount || 0) / totalExpense) * 100) : 0;
                      return (
                        <div key={item.name} className="flex items-center justify-between gap-2">
                          <dt className="flex min-w-0 items-center gap-2.5 text-slate-600">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                            <span className="truncate" title={item.name}>{item.name}</span>
                          </dt>
                          <dd className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                            <span className="font-semibold text-slate-900">{formatMoney(item.amount)}</span>
                            <span className="text-xs text-slate-400">{share}%</span>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
                <div className="mt-auto border-t border-slate-100 pt-4 text-right">
                  <Link href="/owner/transactions" className="text-sm font-semibold text-blue-600 hover:underline">Xem chi tiết →</Link>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="text-sm text-slate-400">Chưa có chi phí trong kỳ</span>
                <Link href="/owner/transactions" className="text-sm font-semibold text-blue-600 hover:underline">Xem sổ thu chi →</Link>
              </div>
            )}
          </section>

          {/* Tình trạng phòng */}
          <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Home size={18} />
                </span>
                <h2 className="text-base font-bold text-slate-900">Tình trạng phòng</h2>
              </div>
              <Link href="/rooms" aria-label="Mở danh sách phòng" className="text-slate-400 transition-colors hover:text-blue-600">
                <ChevronRight size={18} />
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${summary?.occupancy?.total ? Math.round((summary.occupancy.occupied / summary.occupancy.total) * 100) : 0}%` }}
                />
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                {summary?.occupancy?.total ? Math.round((summary.occupancy.occupied / summary.occupancy.total) * 100) : 0}%
              </span>
            </div>

            <dl className="mt-6 space-y-3.5 text-sm leading-5">
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đang thuê</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{summary?.occupancy?.occupied || 0} / {summary?.occupancy?.total || 0} phòng</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-slate-300" />Phòng trống</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{summary?.occupancy?.vacant || 0}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-amber-500" />Sắp hết hợp đồng (30 ngày)</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{summary?.occupancy?.expiringContracts || 0}</dd>
              </div>
            </dl>

            <div className="mt-auto pt-5">
              <Button href="/rooms" variant="outline" className="w-full">Xem danh sách phòng →</Button>
            </div>
          </section>

          {/* Hoạt động gần đây — nguồn dữ liệu thật: giao dịch thu chi gần nhất */}
          <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Clock size={18} />
                </span>
                <h2 className="text-base font-bold text-slate-900">Hoạt động gần đây</h2>
              </div>
              <Link href="/owner/transactions" aria-label="Xem tất cả giao dịch" className="text-slate-400 transition-colors hover:text-blue-600">
                <ChevronRight size={18} />
              </Link>
            </div>

            {recentTx.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-slate-400">
                Chưa có giao dịch thu chi nào
              </div>
            ) : (
              <ul className="mt-5 space-y-4">
                {recentTx.map((tx: any, idx: number) => (
                  <li key={tx.id || idx} className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tx.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                      {tx.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold leading-5 text-slate-900">
                        {tx.type === "income" ? "Đã thu" : "Ghi chi phí"} {formatMoney(tx.amount)}
                      </div>
                      <div className="mt-0.5 truncate text-[13px] leading-5 text-slate-500">{tx.description || tx.category_name || "Giao dịch"}</div>
                    </div>
                    <span className="shrink-0 self-start text-[13px] leading-5 tabular-nums text-slate-400">{new Date(tx.date).toLocaleDateString("vi-VN")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>

        {/* ── HIỆU SUẤT THEO CƠ SỞ (giữ nguyên tính năng sẵn có) ── */}
        {!facilityId && (summary?.facilitiesPerformance || []).length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Building2 size={18} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Hiệu suất theo cơ sở</h2>
                  <p className="mt-0.5 text-[13px] leading-5 text-slate-500">Ưu tiên cơ sở có công nợ hoặc tỷ lệ thu thấp.</p>
                </div>
              </div>
              <Link href="/owner/boarding-houses" className="shrink-0 text-sm font-semibold text-blue-600 hover:underline">Xem cơ sở →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-slate-200 text-[13px] text-slate-500"><tr><th className="pb-3 font-semibold">Cơ sở</th><th className="pb-3 text-right font-semibold">Lấp đầy</th><th className="pb-3 text-right font-semibold">Đã thu</th><th className="pb-3 text-right font-semibold">Quá hạn</th><th className="pb-3 text-right font-semibold">Trạng thái</th></tr></thead>
                <tbody>{(summary?.facilitiesPerformance || []).slice(0, 5).map((facility) => {
                  const needsAttention = facility.overdue > 0 || facility.collectedRate < 80 || facility.occupancyRate < 80;
                  return <tr key={facility.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="py-3.5 font-semibold text-slate-800">{facility.name}</td><td className="py-3.5 text-right tabular-nums text-slate-600">{facility.occupancyRate}%</td><td className="py-3.5 text-right tabular-nums text-slate-600">{facility.collectedRate}%</td><td className="py-3.5 text-right font-semibold tabular-nums text-amber-700">{formatMoney(facility.overdue)}</td><td className="py-3.5 text-right"><button aria-pressed={facilityId === facility.id} type="button" onClick={() => setFacilityId(facility.id)} className={needsAttention ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>{needsAttention ? "Cần chú ý" : "Tốt"}</button></td></tr>;
                })}</tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── THAO TÁC NHANH (giữ nguyên tính năng sẵn có) ── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-slate-900">Thao tác nhanh</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Link href="/rooms/new" className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
              <Plus size={16} className="text-blue-600" /> Thêm phòng mới
            </Link>
            <Link href="/invoices/new" className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
              <FileText size={16} className="text-blue-600" /> Lập hóa đơn mới
            </Link>
            <Link href="/contracts/new" className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
              <Users size={16} className="text-blue-600" /> Tạo hợp đồng mới
            </Link>
            <Link href="/owner/transactions/new" className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
              <Wallet size={16} className="text-blue-600" /> Ghi chép thu chi
            </Link>
          </div>
        </section>

      </PageContainer>
    </RBACGuard>
  );
}

/* ── Dashboard-only presentational helpers ─────────────────────────
   Kept local to this screen so nothing here can change how another
   page renders. They receive already-computed values as props and do
   no fetching, no math on business rules — only layout and shape. */

const EXPENSE_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#64748B", "#0EA5E9", "#84CC16"];

function KpiCard({
  icon, iconClass, label, value, hint, hintClass = "text-slate-500", href,
}: {
  icon: React.ReactNode; iconClass: string; label: string; value: string;
  hint: string; hintClass?: string; href?: string;
}) {
  const body = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium leading-5 text-slate-500">{label}</span>
        {/* Four cards across leaves ~200px per card on a 1400px screen, where a
            24px figure clipped mid-number. It steps up only once there is room. */}
        <span className="mt-1 block truncate text-xl font-bold leading-7 tabular-nums text-slate-900 2xl:text-2xl 2xl:leading-8">{value}</span>
        {/* Wraps instead of truncating: at four cards across, "Biên lợi nhuận …
            · Dòng tiền ròng …" is wider than the card, and clipping it hid a
            figure the owner is meant to read. */}
        <span className={`mt-1 block text-[13px] leading-5 ${hintClass}`}>{hint}</span>
      </span>
    </>
  );
  const shell = "flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5";
  return href
    ? <Link href={href} className={`${shell} transition-colors hover:border-slate-300`}>{body}</Link>
    : <div className={shell}>{body}</div>;
}

/** Money formatted short enough for a chart axis: 24.500.000 → "24,5 triệu". */
function formatCompactMoney(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(value % 1_000_000_000 === 0 ? 0 : 1).replace(".", ",")} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1).replace(".", ",")} triệu`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} nghìn`;
  return String(value);
}

/** Rounds an axis maximum up to a readable 1/2/5×10ⁿ step. */
function niceAxisMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

type ChartMonth = { label: string; month: number; year: number; rev: number; exp: number };

function CashflowChart({
  months, maxVal, selected, onSelect,
}: {
  months: ChartMonth[];
  maxVal: number;
  selected: { month: number; year: number };
  onSelect: (month: number, year: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const axisMax = niceAxisMax(maxVal);
  const ticks = [1, 2 / 3, 1 / 3, 0];

  const pointAt = (index: number, value: number) => ({
    x: months.length > 1 ? (index / (months.length - 1)) * 100 : 50,
    y: 100 - (value / axisMax) * 100,
  });
  const lineFor = (key: "rev" | "exp") =>
    months.map((m, i) => { const p = pointAt(i, m[key]); return `${i === 0 ? "M" : "L"}${p.x},${p.y}`; }).join(" ");
  const areaFor = (key: "rev" | "exp") => {
    if (!months.length) return "";
    const first = pointAt(0, months[0][key]);
    const last = pointAt(months.length - 1, months[months.length - 1][key]);
    return `M${first.x},100 ${lineFor(key)} L${last.x},100 Z`;
  };

  // Dots and the guide line follow whichever month is in focus (hover wins over
  // the selected period). The tooltip is hover-only, so a selected month does
  // not park a permanent panel on top of the chart.
  const active = hovered ?? months.findIndex((m) => m.month === selected.month && m.year === selected.year);
  const tooltipMonth = hovered != null ? months[hovered] : null;

  return (
    <div className="mt-5">
      <div className="flex gap-3">
        {/* Y axis */}
        <div className="flex h-56 w-20 shrink-0 flex-col justify-between py-px text-right text-xs leading-4 text-slate-400">
          {ticks.map((t) => <span key={t}>{t === 0 ? "0" : formatCompactMoney(Math.round(axisMax * t))}</span>)}
        </div>

        {/* Plot */}
        <div className="relative h-56 min-w-0 flex-1">
          {/* grid */}
          {ticks.map((t) => (
            <span key={t} className="absolute inset-x-0 border-t border-slate-100/80" style={{ top: `${(1 - t) * 100}%` }} />
          ))}

          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="cf-rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="cf-exp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.07" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaFor("rev")} fill="url(#cf-rev)" />
            <path d={areaFor("exp")} fill="url(#cf-exp)" />
            <path d={lineFor("exp")} fill="none" stroke="#EF4444" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            <path d={lineFor("rev")} fill="none" stroke="#2563EB" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </svg>

          {/* dots + hit areas: one column per month, so hovering or clicking
              anywhere in the column targets that month the way the bars did. */}
          {months.map((m, i) => {
            const rev = pointAt(i, m.rev);
            const exp = pointAt(i, m.exp);
            const isActive = i === active;
            return (
              <div
                key={`${m.year}-${m.month}`}
                className="absolute top-0 h-full cursor-pointer"
                // Columns are spaced 100/(n-1)% apart, so they must be that wide to
                // tile the plot edge to edge — sizing them 100/n% left gaps the
                // pointer fell through, and the tooltip never opened there.
                style={{ left: `${rev.x}%`, width: `${100 / Math.max(1, months.length - 1)}%`, transform: "translateX(-50%)" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(m.month, m.year)}
                title={`Kỳ T${m.month}/${m.year}: Thu ${formatMoney(m.rev)} | Chi ${formatMoney(m.exp)}`}
              >
                {isActive && <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200" />}
                <span
                  className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 transition-all ${isActive ? "h-3 w-3" : "h-2 w-2 opacity-0"}`}
                  style={{ top: `${exp.y === rev.y ? rev.y : rev.y}%` }}
                />
                <span
                  className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 transition-all ${isActive ? "h-3 w-3" : "h-2 w-2 opacity-0"}`}
                  style={{ top: `${exp.y}%` }}
                />
              </div>
            );
          })}

          {/* tooltip */}
          {tooltipMonth && (
            <div
              className="pointer-events-none absolute z-10 w-48 rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-5 shadow-lg"
              style={{
                left: `${pointAt(hovered as number, tooltipMonth.rev).x}%`,
                top: 8,
                transform: (hovered as number) > months.length / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
              }}
            >
              <div className="font-semibold text-slate-900">T{tooltipMonth.month}/{tooltipMonth.year}</div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-2 rounded-full bg-blue-600" />Doanh thu</span>
                <span className="font-semibold tabular-nums text-slate-900">{formatMoney(tooltipMonth.rev)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-2 rounded-full bg-red-500" />Chi phí</span>
                <span className="font-semibold tabular-nums text-red-600">{formatMoney(tooltipMonth.exp)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* X axis */}
      <div className="mt-2.5 flex gap-3">
        <span className="w-20 shrink-0" />
        <div className="flex min-w-0 flex-1">
          {months.map((m, i) => (
            <span
              key={`${m.year}-${m.month}`}
              className={`flex-1 text-center text-xs leading-4 ${i === active ? "font-semibold text-slate-900" : "text-slate-400"}`}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 flex items-center gap-6 border-t border-slate-100 pt-4 text-[13px] leading-5 text-slate-500">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-600" />Doanh thu</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />Chi phí</span>
      </div>
    </div>
  );
}

function Donut({
  segments, size, centerValue, centerLabel, compactCenter = false,
}: {
  segments: Array<{ value: number; color: string }>;
  size: number;
  centerValue: string;
  centerLabel: string;
  compactCenter?: boolean;
}) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="11" />
        {total > 0 && segments.map((segment, i) => {
          const share = Math.max(0, segment.value) / total;
          const dash = share * circumference;
          const node = (
            <circle
              key={i}
              cx="50" cy="50" r={radius} fill="none"
              stroke={segment.color} strokeWidth="11"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return node;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        <span className={`font-bold tabular-nums text-slate-900 ${compactCenter ? "text-[13px] leading-tight" : "text-2xl"}`}>{centerValue}</span>
        <span className="mt-0.5 text-[11px] text-slate-500">{centerLabel}</span>
      </div>
    </div>
  );
}
