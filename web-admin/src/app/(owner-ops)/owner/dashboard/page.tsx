"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Home, Wallet, AlertCircle, Building2, Repeat,
  FileText, ArrowRight, Plus, Zap, Droplet, ChevronRight,
  TrendingUp, TrendingDown, Receipt, Settings, Wifi,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { formatMoney, normalizeRoomStatus } from '@/lib/rentalOps';
import RBACGuard from '@/components/RBACGuard';
import { useOwnerDashboardInit } from '@/hooks/useOwnerData';

const MONTH_NAMES = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

export default function OwnerDashboard() {
  const dashboardQuery = useOwnerDashboardInit();
  const [slowLoad, setSlowLoad] = useState(false);
  const [chartMonths, setChartMonths] = useState(6);

  React.useEffect(() => {
    if (!dashboardQuery.isLoading) { setSlowLoad(false); return; }
    const t = setTimeout(() => setSlowLoad(true), 8000);
    return () => clearTimeout(t);
  }, [dashboardQuery.isLoading]);

  const rooms = dashboardQuery.data?.rooms ?? [];
  const transactions = dashboardQuery.data?.transactions ?? [];
  const invoices = dashboardQuery.data?.invoices ?? [];

  const stats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter(r => normalizeRoomStatus(r) === 'occupied').length;
    const vacant = rooms.filter(r => normalizeRoomStatus(r) === 'vacant').length;
    const reserved = rooms.filter(r => normalizeRoomStatus(r) === 'reserved').length;
    const maintenance = rooms.filter(r => normalizeRoomStatus(r) === 'maintenance').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, vacant, reserved, maintenance, occupancyRate };
  }, [rooms]);

  const now = new Date();
  const curM = now.getMonth(), curY = now.getFullYear();

  const financial = useMemo(() => {
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === curM && d.getFullYear() === curY;
    });
    const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

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

    // Last month comparison
    const prevM = curM === 0 ? 11 : curM - 1;
    const prevY = curM === 0 ? curY - 1 : curY;
    const prevIncome = transactions
      .filter(t => { const d = new Date(t.date); return d.getMonth() === prevM && d.getFullYear() === prevY && t.type === 'income'; })
      .reduce((s, t) => s + t.amount, 0);
    const incomeChange = prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : null;

    return { income, expense, profit: income - expense, months, maxVal, incomeChange };
  }, [transactions, chartMonths, curM, curY]);

  // Utility breakdown from invoices (more accurate than transactions)
  const utilities = useMemo(() => {
    const thisMonthInvoices = invoices.filter(inv => inv.month === curM + 1 && inv.year === curY);
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
        const text = [tx.description, (tx as any).category_name].join(' ').toLowerCase();
        const amt = Math.abs(Number(tx.amount || 0));
        if (text.includes('điện') || text.includes('electric')) electricity += amt;
        else if (text.includes('nước') || text.includes('water')) water += amt;
      }
    }
    const total = rent + electricity + water + other;
    return { rent, electricity, water, other, total };
  }, [invoices, transactions, curM, curY]);

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

  if (dashboardQuery.isError) return (
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

  if (dashboardQuery.isLoading) return (
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
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{greeting}</div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-0.5">Tổng quan vận hành</h1>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Tháng {now.getMonth() + 1}/{now.getFullYear()}</div>
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
            label="Thu tháng này" value={formatMoney(financial.income)}
            sub={financial.incomeChange != null
              ? `${financial.incomeChange >= 0 ? '+' : ''}${financial.incomeChange}% so tháng trước`
              : `Chi: ${formatMoney(financial.expense)}`}
            icon={<TrendingUp size={18}/>} gradient
            trend={financial.incomeChange}
          />
          <StatCard
            label="Thu nhập ròng" value={formatMoney(financial.profit)}
            sub={financial.income > 0 ? `Biên lợi nhuận ${Math.round((financial.profit / financial.income) * 100)}%` : '—'}
            icon={<Wallet size={18}/>} color={financial.profit >= 0 ? "emerald" : "red"}
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

        {/* ── FINANCIAL REPORT ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <BarChart3 size={18} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Báo cáo tài chính</div>
                <div className="text-[11px] text-slate-400 font-medium">Doanh thu · Chi phí · Thu nhập ròng</div>
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

          <div className="p-5">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wide mb-1">Doanh thu T{curM + 1}</div>
                <div className="text-lg font-black text-indigo-700">{formatMoney(financial.income)}</div>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                <div className="text-[11px] font-bold text-red-500 uppercase tracking-wide mb-1">Chi phí T{curM + 1}</div>
                <div className="text-lg font-black text-red-600">{formatMoney(financial.expense)}</div>
              </div>
              <div className={`rounded-xl border p-3 ${financial.profit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                <div className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${financial.profit >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>Thu nhập ròng</div>
                <div className={`text-lg font-black ${financial.profit >= 0 ? 'text-emerald-700' : 'text-orange-600'}`}>{formatMoney(financial.profit)}</div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="flex items-end gap-1.5 h-40 mb-3">
              {financial.months.map((m, i) => {
                const isLast = i === financial.months.length - 1;
                const revH = financial.maxVal > 0 ? Math.max(4, Math.round((m.rev / financial.maxVal) * 130)) : 4;
                const expH = financial.maxVal > 0 ? Math.max(2, Math.round((m.exp / financial.maxVal) * 130)) : 2;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar">
                    {/* Tooltip on hover */}
                    <div className="hidden group-hover/bar:flex flex-col items-center absolute z-10 -mt-16 bg-slate-900 text-white text-[10px] rounded-lg px-2 py-1.5 pointer-events-none whitespace-nowrap shadow-lg">
                      <span className="text-indigo-300 font-bold">Thu: {formatMoney(m.rev)}</span>
                      <span className="text-red-300">Chi: {formatMoney(m.exp)}</span>
                    </div>
                    <div className="relative flex items-end gap-0.5 w-full">
                      {/* Revenue bar */}
                      <div
                        className={`flex-1 rounded-t-md transition-all duration-500 ${isLast ? 'bg-indigo-500' : 'bg-indigo-200 group-hover/bar:bg-indigo-400'}`}
                        style={{ height: `${revH}px` }}
                        title={`Doanh thu: ${formatMoney(m.rev)}`}
                      />
                      {/* Expense bar */}
                      {m.exp > 0 && (
                        <div
                          className={`flex-1 rounded-t-md transition-all duration-500 ${isLast ? 'bg-red-400' : 'bg-red-100 group-hover/bar:bg-red-300'}`}
                          style={{ height: `${expH}px` }}
                          title={`Chi phí: ${formatMoney(m.exp)}`}
                        />
                      )}
                    </div>
                    <div className={`text-[10px] font-bold ${isLast ? 'text-indigo-600' : 'text-slate-400'}`}>{m.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="h-2.5 w-2.5 rounded-sm bg-indigo-400"/> Doanh thu
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="h-2.5 w-2.5 rounded-sm bg-red-300"/> Chi phí
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="h-2.5 w-2.5 rounded-sm bg-emerald-400"/> Ròng
              </div>
            </div>
          </div>

          {/* Revenue breakdown */}
          <div className="border-t border-slate-100 px-5 py-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Cơ cấu doanh thu tháng này</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <BreakdownCard
                icon={<Home size={15} className="text-blue-500" />}
                label="Tiền phòng"
                value={formatMoney(utilities.rent || financial.income - utilities.electricity - utilities.water)}
                bgColor="bg-blue-50"
              />
              <BreakdownCard
                icon={<Zap size={15} className="text-amber-500" />}
                label="Tiền điện"
                value={formatMoney(utilities.electricity)}
                bgColor="bg-amber-50"
              />
              <BreakdownCard
                icon={<Droplet size={15} className="text-cyan-500" />}
                label="Tiền nước"
                value={formatMoney(utilities.water)}
                bgColor="bg-cyan-50"
              />
              <BreakdownCard
                icon={<Receipt size={15} className="text-violet-500" />}
                label="Dịch vụ khác"
                value={formatMoney(utilities.other || 0)}
                bgColor="bg-violet-50"
              />
            </div>
          </div>
        </div>

        {/* ── OCCUPANCY + QUICK ACTIONS ── */}
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Occupancy visual */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Trạng thái phòng</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{stats.total} phòng</div>
              </div>
              <div className="text-3xl font-black text-indigo-600">{stats.occupancyRate}%</div>
            </div>
            {/* Stacked bar */}
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
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Truy cập nhanh</div>
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

        <div className="grid gap-4 lg:grid-cols-2">
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
                      <div className="text-xs text-slate-400 font-medium">{formatMoney(room.price)}/tháng</div>
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
                        <div className="text-[11px] text-slate-400 font-medium">{tx.date}</div>
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

        {/* ── OUTSTANDING DEBTS LEDGER ── */}
        {debts.length > 0 && (
          <div className="rounded-2xl border border-red-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" />
                <div className="text-sm font-black text-red-700">Công nợ tồn đọng</div>
              </div>
              <div className="text-sm font-black text-red-700">{formatMoney(totalDebt)}</div>
            </div>
            <div className="divide-y divide-slate-50">
              {debts.slice(0, 6).map((inv: any) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-red-50/40 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{inv.room_name || `Phòng #${inv.room_id}`}</div>
                    <div className="text-xs text-slate-400 font-medium truncate">{inv.tenant_name || '-'} · T{inv.month}/{inv.year}</div>
                  </div>
                  <div className="text-sm font-black text-red-600 shrink-0">{formatMoney(inv.remaining)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </RBACGuard>
  );
}

// ── Sub-components ─────────────────────────────────────────
function BreakdownCard({ icon, label, value, bgColor }: { icon: React.ReactNode; label: string; value: string; bgColor: string }) {
  return (
    <div className={`rounded-xl border border-slate-100 ${bgColor} p-3 flex items-center gap-2.5`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{label}</div>
        <div className="text-sm font-black text-slate-900 truncate">{value}</div>
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
      <div className="rounded-2xl p-4 shadow-sm text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)' }}>
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3 bg-white/20 text-white">
          {icon}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-1">{label}</div>
        <div className="text-2xl font-black leading-tight truncate">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend != null && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${trend >= 0 ? 'bg-white/20 text-white' : 'bg-red-400/40 text-white'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          <div className="text-[11px] text-white/70 font-medium truncate">{sub}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${colors[color] || colors.blue}`}>
        {icon}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-black text-slate-900 leading-tight truncate">{value}</div>
      <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">{sub}</div>
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
      <span className="text-[9px] opacity-70 font-semibold leading-tight line-clamp-1">{desc}</span>
    </Link>
  );
}
