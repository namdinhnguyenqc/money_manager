"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users, Home, Wallet, AlertCircle, Building2, Repeat,
  FileText, ArrowRight, Plus, Zap, Droplet, ChevronRight,
  TrendingUp, Receipt, Settings, Wifi
} from 'lucide-react';
import { formatMoney, normalizeRoomStatus } from '@/lib/rentalOps';
import RBACGuard from '@/components/RBACGuard';
import { useOwnerDashboardInit } from '@/hooks/useOwnerData';

export default function OwnerDashboard() {
  const dashboardQuery = useOwnerDashboardInit();
  const [slowLoad, setSlowLoad] = useState(false);

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

  const financial = useMemo(() => {
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Last 6 months revenue
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(y, m - (5 - i), 1);
      const mm = d.getMonth(), yy = d.getFullYear();
      const rev = transactions
        .filter(t => { const td = new Date(t.date); return td.getMonth() === mm && td.getFullYear() === yy && t.type === 'income'; })
        .reduce((s, t) => s + t.amount, 0);
      return { label: `T${mm + 1}`, value: rev };
    });
    const maxRev = Math.max(...months.map(m => m.value), 1);

    return { income, expense, profit: income - expense, months, maxRev };
  }, [transactions]);

  const overdueInvoices = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth() + 1, cy = now.getFullYear();
    return invoices.filter(inv => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const past = inv.year < cy || (inv.year === cy && inv.month < cm);
      return past && total > 0 && paid < total;
    });
  }, [invoices]);

  const overdueAmount = useMemo(() =>
    overdueInvoices.reduce((s, inv) => s + Math.max(0, Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0),
    [overdueInvoices]);

  const vacantRooms = useMemo(() => rooms.filter(r => normalizeRoomStatus(r) === 'vacant').slice(0, 3), [rooms]);

  // Service revenue breakdown (electricity / water / wifi) from income transactions
  const utilities = useMemo(() => {
    const detect = (tx: any): 'electricity' | 'water' | 'wifi' | null => {
      const text = [tx.category_name, tx?.metadata?.utility_type, tx.description]
        .map((v: any) => String(v || '').toLowerCase()).join(' ');
      if (text.includes('wifi') || text.includes('fpt') || text.includes('internet') || text.includes('mạng')) return 'wifi';
      if (text.includes('điện') || text.includes('dien') || text.includes('electric')) return 'electricity';
      if (text.includes('nước') || text.includes('nuoc') || text.includes('water')) return 'water';
      return null;
    };
    let electricity = 0, water = 0, wifi = 0;
    for (const tx of transactions) {
      if (tx.type !== 'income') continue;
      const t = detect(tx);
      const amt = Math.abs(Number(tx.amount || 0));
      if (t === 'electricity') electricity += amt;
      else if (t === 'water') water += amt;
      else if (t === 'wifi') wifi += amt;
    }
    return { electricity, water, wifi };
  }, [transactions]);

  // Outstanding debts ledger (all unpaid invoices, biggest first)
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

  const now = new Date();
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
      <div className="h-40 rounded-2xl bg-slate-100 animate-pulse"/>
      <div className="h-32 rounded-2xl bg-slate-100 animate-pulse"/>
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
            sub={`Chi: ${formatMoney(financial.expense)}`}
            icon={<TrendingUp size={18}/>} gradient
          />
          <StatCard
            label="Lợi nhuận" value={formatMoney(financial.profit)}
            sub={financial.income > 0 ? `Biên ${Math.round((financial.profit / financial.income) * 100)}%` : '—'}
            icon={<Wallet size={18}/>} color="emerald"
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

        {/* ── OCCUPANCY BAR + REVENUE CHART ── */}
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

          {/* Revenue sparkline — 6 months */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Doanh thu 6 tháng</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{formatMoney(financial.income)} <span className="text-sm font-semibold text-slate-400">tháng này</span></div>
              </div>
            </div>
            <div className="flex items-end gap-2 h-24">
              {financial.months.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className={`w-full rounded-t-lg transition-all ${i === 5 ? 'bg-indigo-500' : 'bg-indigo-100'}`}
                    style={{ height: `${financial.maxRev > 0 ? Math.max(4, Math.round((m.value / financial.maxRev) * 80)) : 4}px` }}
                  />
                  <div className={`text-[10px] font-bold ${i === 5 ? 'text-indigo-600' : 'text-slate-400'}`}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                        {tx.type === 'income' ? <TrendingUp size={15}/> : <ArrowRight size={15}/>}
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

        {/* ── SERVICE REVENUE BREAKDOWN ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Doanh thu dịch vụ</div>
          <div className="grid grid-cols-3 gap-3">
            <UtilCard icon={<Zap size={18} className="text-amber-500"/>} label="Tiền điện" value={formatMoney(utilities.electricity)}/>
            <UtilCard icon={<Droplet size={18} className="text-blue-500"/>} label="Tiền nước" value={formatMoney(utilities.water)}/>
            <UtilCard icon={<Wifi size={18} className="text-indigo-500"/>} label="Wifi / Mạng" value={formatMoney(utilities.wifi)}/>
          </div>
        </div>

        {/* ── OUTSTANDING DEBTS LEDGER ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-red-50">
            <div className="text-sm font-black text-red-700">Công nợ tồn đọng</div>
            <div className="text-sm font-black text-red-700">{formatMoney(totalDebt)}</div>
          </div>
          {debts.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400 font-medium">Không có công nợ. Tuyệt vời! 🎉</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {debts.slice(0, 8).map((inv: any) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{inv.room_name || `Phòng #${inv.room_id}`}</div>
                    <div className="text-xs text-slate-400 font-medium truncate">{inv.tenant_name || '-'} · T{inv.month}/{inv.year}</div>
                  </div>
                  <div className="text-sm font-black text-red-600 shrink-0">{formatMoney(inv.remaining)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </RBACGuard>
  );
}

function UtilCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className="mb-1.5 flex justify-center">{icon}</div>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color = "blue", gradient = false }: { label: string; value: string; sub: string; icon: React.ReactNode; color?: string; gradient?: boolean }) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo:  'bg-indigo-50 text-indigo-600',
    amber:   'bg-amber-50 text-amber-600',
  };
  if (gradient) {
    return (
      <div className="rounded-2xl p-4 shadow-sm text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)' }}>
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3 bg-white/20 text-white">
          {icon}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-1">{label}</div>
        <div className="text-2xl font-black leading-tight truncate">{value}</div>
        <div className="text-[11px] text-white/80 font-medium mt-1 truncate">{sub}</div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${colors[color]}`}>
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
