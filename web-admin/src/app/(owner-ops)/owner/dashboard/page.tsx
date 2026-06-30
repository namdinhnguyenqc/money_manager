"use client";

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Home, 
  Wallet, 
  AlertCircle,
  Building2,
  Calendar,
  Repeat,
  FileText,
  ArrowRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Droplet
} from 'lucide-react';
import { 
  formatMoney, 
  normalizeRoomStatus,
} from '@/lib/rentalOps';
import RBACGuard from '@/components/RBACGuard';
import LoadingSkeleton from '@/components/ops/LoadingSkeleton';
import { useOwnerDashboardInit } from '@/hooks/useOwnerData';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart as any), { ssr: false }) as any;
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar as any), { ssr: false }) as any;
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis as any), { ssr: false }) as any;
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis as any), { ssr: false }) as any;
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid as any), { ssr: false }) as any;
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip as any), { ssr: false }) as any;
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer as any), { ssr: false }) as any;
const PieChart = dynamic(() => import('recharts').then((mod) => mod.PieChart as any), { ssr: false }) as any;
const Pie = dynamic(() => import('recharts').then((mod) => mod.Pie as any), { ssr: false }) as any;
const Cell = dynamic(() => import('recharts').then((mod) => mod.Cell as any), { ssr: false }) as any;
const AreaChart = dynamic(() => import('recharts').then((mod) => mod.AreaChart as any), { ssr: false }) as any;
const Area = dynamic(() => import('recharts').then((mod) => mod.Area as any), { ssr: false }) as any;

export default function OwnerDashboard() {
  const dashboardQuery = useOwnerDashboardInit();
  const rooms = dashboardQuery.data?.rooms ?? [];
  const transactions = dashboardQuery.data?.transactions ?? [];

  const stats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter(r => normalizeRoomStatus(r) === 'occupied').length;
    const vacant = rooms.filter(r => normalizeRoomStatus(r) === 'vacant').length;
    const reserved = rooms.filter(r => normalizeRoomStatus(r) === 'reserved').length;
    const maintenance = rooms.filter(r => normalizeRoomStatus(r) === 'maintenance').length;
    
    return {
      total,
      occupied,
      vacant,
      reserved,
      maintenance,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0
    };
  }, [rooms]);

  const financialStats = useMemo(() => {
    const txs = transactions;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthTxs = txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = thisMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = thisMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthLabel = `T${m + 1}`;
      
      const monthTxs = txs.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === m && td.getFullYear() === y;
      });

      chartData.push({
        name: monthLabel,
        thu: monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        chi: monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      });
    }

    return { income, expense, profit: income - expense, chartData };
  }, [transactions]);

  const vacantRoomsList = useMemo(() => {
    return rooms
      .filter(r => normalizeRoomStatus(r) === 'vacant')
      .slice(0, 4);
  }, [rooms]);

  const [activeUtilityTab, setActiveUtilityTab] = useState<'usage' | 'cost'>('usage');
  const invoices = dashboardQuery.data?.invoices ?? [];

  const utilityStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-indexed (1-12)
    const currentYear = now.getFullYear();

    const thisMonthInvoices = invoices.filter(inv => inv.month === currentMonth && inv.year === currentYear);

    const isElectric = (name: string) => {
      const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
      return n.includes("dien") || n.includes("electric");
    };
    const isWater = (name: string) => {
      const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
      return n.includes("nuoc") || n.includes("water");
    };

    let elecUsage = 0;
    let elecCost = 0;
    let elecRooms = 0;

    let waterUsage = 0;
    let waterCost = 0;
    let waterRooms = 0;

    thisMonthInvoices.forEach(inv => {
      let hasElec = false;
      let hasWater = false;

      const eUsage = (inv.elec_new ?? 0) - (inv.elec_old ?? 0);
      if (eUsage > 0 || inv.elec_new != null) {
        elecUsage += eUsage;
        hasElec = true;
      }

      const wUsage = (inv.water_new ?? 0) - (inv.water_old ?? 0);
      if (wUsage > 0 || inv.water_new != null) {
        waterUsage += wUsage;
        hasWater = true;
      }

      inv.items?.forEach(item => {
        if (isElectric(item.name)) {
          elecCost += item.amount;
          hasElec = true;
        } else if (isWater(item.name)) {
          waterCost += item.amount;
          hasWater = true;
        }
      });

      if (hasElec) elecRooms++;
      if (hasWater) waterRooms++;
    });

    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1; // 1-indexed
      const y = d.getFullYear();
      const monthLabel = `T${m}`;

      const monthInvoices = invoices.filter(inv => inv.month === m && inv.year === y);

      let mElecUsage = 0;
      let mElecCost = 0;
      let mWaterUsage = 0;
      let mWaterCost = 0;

      monthInvoices.forEach(inv => {
        mElecUsage += Math.max(0, (inv.elec_new ?? 0) - (inv.elec_old ?? 0));
        mWaterUsage += Math.max(0, (inv.water_new ?? 0) - (inv.water_old ?? 0));

        inv.items?.forEach(item => {
          if (isElectric(item.name)) {
            mElecCost += item.amount;
          } else if (isWater(item.name)) {
            mWaterCost += item.amount;
          }
        });
      });

      chartData.push({
        name: monthLabel,
        month: m,
        year: y,
        elecUsage: mElecUsage,
        elecCost: mElecCost,
        waterUsage: mWaterUsage,
        waterCost: mWaterCost,
      });
    }

    return {
      thisMonth: {
        elecUsage,
        elecCost,
        elecRooms,
        waterUsage,
        waterCost,
        waterRooms,
        totalRooms: rooms.length,
      },
      chartData,
    };
  }, [invoices, rooms]);

  const overdueInvoices = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return invoices.filter(inv => {
      const total = Math.round(Number(inv.total_amount || 0));
      const paid = Math.round(Number(inv.paid_amount || 0));
      const isPastPeriod = inv.year < currentYear || (inv.year === currentYear && inv.month < currentMonth);
      return isPastPeriod && total > 0 && paid < total;
    });
  }, [invoices]);
  const overdueAmount = useMemo(() => {
    return overdueInvoices.reduce((sum, inv) => sum + Math.max(0, Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)), 0);
  }, [overdueInvoices]);

  const isLoading = dashboardQuery.isLoading;
  const safeStats = stats ?? { total: 0, occupied: 0, vacant: 0, reserved: 0, maintenance: 0, occupancyRate: 0 };
  const chartData = financialStats?.chartData ?? [];

  if (isLoading) return <div className="p-8"><LoadingSkeleton rows={12} /></div>;

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-7xl space-y-10 pb-20 animate-in fade-in duration-700">
        
        {/* Header Section with Glassmorphism Accent */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <TrendingUp size={12} className="animate-pulse" />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600">Phân tích hệ thống</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Tổng quan vận hành</h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">Báo cáo hiệu quả kinh doanh và trạng thái phòng thời gian thực.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white px-5 py-3 shadow-lg shadow-slate-100 border border-slate-100/60 flex items-center gap-3 transition-all hover:shadow-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <Calendar size={18} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kỳ báo cáo</div>
                <div className="text-sm font-black text-slate-800">Tháng {new Date().getMonth() + 1}, {new Date().getFullYear()}</div>
              </div>
            </div>
          </div>
        </div>

        {overdueInvoices.length > 0 && (
          <Link
            href="/invoices"
            className="flex items-start gap-4 rounded-2xl sm:rounded-[28px] border border-red-200 bg-red-50 p-4 sm:p-5 text-red-800 shadow-lg shadow-red-100/50 transition hover:bg-red-100"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
              <AlertCircle size={20} />
            </span>
            <span className="flex-1">
              <span className="block text-base font-extrabold">
                Có {overdueInvoices.length} hóa đơn quá hạn
              </span>
              <span className="mt-1 block text-sm font-semibold text-red-700">
                Còn phải thu {formatMoney(overdueAmount)} từ các kỳ đã qua. Bấm để mở tab Hóa đơn và xử lý.
              </span>
            </span>
            <ArrowRight size={18} className="mt-2 shrink-0" />
          </Link>
        )}

        {/* Main Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Thu nhập tháng" 
            value={formatMoney(financialStats?.income)} 
            icon={<ArrowUpRight />} 
            color="indigo" 
            trend="+12.5%"
            subValue="So với tháng trước"
          />
          <StatCard 
            title="Chi phí vận hành" 
            value={formatMoney(financialStats?.expense)} 
            icon={<ArrowDownRight />} 
            color="rose" 
            trend="-3.2%"
            subValue="So với tháng trước"
          />
          <StatCard 
            title="Lợi nhuận ròng" 
            value={formatMoney(financialStats?.profit)} 
            icon={<Wallet />} 
            color="emerald" 
            trend="+18.4%"
            subValue="Biên lợi nhuận ~ 72%"
          />
          <StatCard 
            title="Tỷ lệ lấp đầy" 
            value={`${safeStats.occupancyRate}%`} 
            icon={<Users />} 
            color="amber" 
            trend="Ổn định"
            subValue={`${safeStats.occupied}/${safeStats.total} phòng đang ở`}
          />
        </div>

        {/* Mobile-only: Room status quick summary */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Đang thuê</span>
            <span className="text-2xl font-black text-indigo-700">{safeStats.occupied}</span>
            <span className="text-xs text-indigo-400 font-semibold">/ {safeStats.total} phòng</span>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Phòng trống</span>
            <span className="text-2xl font-black text-emerald-700">{safeStats.vacant}</span>
            <span className="text-xs text-emerald-400 font-semibold">Lấp đầy {safeStats.occupancyRate}%</span>
          </div>
        </div>

        <div className="hidden sm:grid gap-8 lg:grid-cols-3">
          {/* Cashflow Trend Chart (AreaChart) */}
          <div className="col-span-1 flex flex-col rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white p-4 sm:p-8 shadow-xl shadow-slate-200/40 lg:col-span-2">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Biến động dòng tiền</h3>
                <p className="text-xs text-slate-500 font-medium">Dữ liệu doanh thu và chi phí trong 6 tháng gần nhất</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-indigo-600"></div>
                  <span className="text-xs font-bold text-slate-600">Thu nhập</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500"></div>
                  <span className="text-xs font-bold text-slate-600">Chi phí</span>
                </div>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorChi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}}
                    tickFormatter={(v: number) => `${v / 1000000}M`}
                  />
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '20px', 
                      border: '1px solid rgba(226, 232, 240, 0.8)', 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', 
                      padding: '16px'
                    }}
                    itemStyle={{fontWeight: 'bold', fontSize: '13px'}}
                    labelStyle={{fontWeight: '900', color: '#0f172a', marginBottom: '8px'}}
                    formatter={(value: number) => formatMoney(Number(value || 0))} 
                  />
                  <Area type="monotone" dataKey="thu" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorThu)" name="Thu nhập" />
                  <Area type="monotone" dataKey="chi" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorChi)" name="Chi phí" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Room Status Donut Chart */}
          <div className="flex flex-col rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white p-4 sm:p-8 shadow-xl shadow-slate-200/40">
            <h3 className="text-xl font-extrabold text-slate-900">Trạng thái phòng</h3>
            <p className="mb-6 text-xs text-slate-500 font-medium">Tình trạng phòng cho thuê hiện tại</p>
            
            <div className="relative h-[220px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={[
                      { name: 'Đang ở', value: safeStats.occupied },
                      { name: 'Phòng trống', value: safeStats.vacant },
                      { name: 'Đặt cọc', value: safeStats.reserved },
                      { name: 'Bảo trì', value: safeStats.maintenance },
                    ]} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={72} 
                    outerRadius={92} 
                    paddingAngle={6} 
                    dataKey="value"
                  >
                    {COLORS.map((entry, index) => <Cell key={`cell-${index}`} fill={entry} stroke="none" />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-3xl font-black text-slate-900 tracking-tight">{safeStats.occupancyRate}%</div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Lấp đầy</div>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Legend color="#6366f1" label="Đang thuê" value={safeStats.occupied} />
              <Legend color="#10b981" label="Trống" value={safeStats.vacant} />
              <Legend color="#f59e0b" label="Đặt cọc" value={safeStats.reserved} />
              <Legend color="#ef4444" label="Bảo trì" value={safeStats.maintenance} />
            </div>
          </div>
        </div>

        {/* Section: Quản lý Điện & Nước */}
        <div className="hidden sm:block space-y-6">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <Zap size={12} className="animate-pulse" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-amber-600">Quản lý dịch vụ</span>
          </div>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Quản lý Điện & Nước</h2>
              <p className="mt-1 text-sm text-slate-500 font-medium">Theo dõi lượng tiêu thụ và chi phí dịch vụ thực tế của các phòng.</p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cột 1: Chỉ số tháng này */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              {/* Thẻ Điện */}
              <div className="relative group overflow-hidden rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white p-5 sm:p-6 shadow-xl shadow-slate-100/50 transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-50/50 group-hover:bg-amber-50 transition-colors"></div>
                <div className="relative flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-100">
                    <Zap size={20} />
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-600 border border-amber-100">
                    Điện Tháng {new Date().getMonth() + 1}
                  </span>
                </div>
                <div className="relative space-y-1">
                  <div className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Tiêu thụ hệ thống</div>
                  <div className="text-3xl font-black text-slate-950 tracking-tight">
                    {utilityStats.thisMonth.elecUsage.toLocaleString('vi-VN')} <span className="text-lg font-bold text-slate-400">kWh</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                    Đã ghi nhận {utilityStats.thisMonth.elecRooms}/{utilityStats.thisMonth.totalRooms} phòng
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Ước tính chi phí</span>
                  <span className="text-sm font-black text-amber-600">{formatMoney(utilityStats.thisMonth.elecCost)}</span>
                </div>
              </div>

              {/* Thẻ Nước */}
              <div className="relative group overflow-hidden rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white p-5 sm:p-6 shadow-xl shadow-slate-100/50 transition-all hover:-translate-y-1 hover:shadow-2xl">
                <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-50/50 group-hover:bg-blue-50 transition-colors"></div>
                <div className="relative flex items-center justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-lg shadow-blue-100">
                    <Droplet size={20} />
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-600 border border-blue-100">
                    Nước Tháng {new Date().getMonth() + 1}
                  </span>
                </div>
                <div className="relative space-y-1">
                  <div className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Tiêu thụ hệ thống</div>
                  <div className="text-3xl font-black text-slate-950 tracking-tight">
                    {utilityStats.thisMonth.waterUsage.toLocaleString('vi-VN')} <span className="text-lg font-bold text-slate-400">m³</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                    Đã ghi nhận {utilityStats.thisMonth.waterRooms}/{utilityStats.thisMonth.totalRooms} phòng
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Ước tính chi phí</span>
                  <span className="text-sm font-black text-blue-600">{formatMoney(utilityStats.thisMonth.waterCost)}</span>
                </div>
              </div>
            </div>

            {/* Cột 2 & 3: Biểu đồ xu hướng */}
            <div className="flex flex-col rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white p-4 sm:p-8 shadow-xl shadow-slate-200/40 lg:col-span-2">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Biến động tiêu thụ điện nước</h3>
                  <p className="text-xs text-slate-500 font-medium">Số liệu thống kê trong 6 tháng gần nhất</p>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1 self-start sm:self-auto">
                  <button
                    onClick={() => setActiveUtilityTab('usage')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                      activeUtilityTab === 'usage'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tiêu thụ (kWh / m³)
                  </button>
                  <button
                    onClick={() => setActiveUtilityTab('cost')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                      activeUtilityTab === 'cost'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Chi phí (₫)
                  </button>
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilityStats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}}
                      tickFormatter={(v: number) => activeUtilityTab === 'cost' ? `${v / 1000}k` : v}
                    />
                    <Tooltip 
                      contentStyle={{
                        borderRadius: '20px', 
                        border: '1px solid rgba(226, 232, 240, 0.8)', 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', 
                        padding: '16px'
                      }}
                      itemStyle={{fontWeight: 'bold', fontSize: '13px'}}
                      labelStyle={{fontWeight: '900', color: '#0f172a', marginBottom: '8px'}}
                      formatter={(value: number, name: string) => {
                        if (activeUtilityTab === 'cost') {
                          return [formatMoney(Number(value)), name === 'elecCost' ? 'Tiền Điện' : 'Tiền Nước'];
                        }
                        return [`${Number(value).toLocaleString('vi-VN')} ${name === 'elecUsage' ? 'kWh' : 'm³'}`, name === 'elecUsage' ? 'Điện tiêu thụ' : 'Nước tiêu thụ'];
                      }}
                    />
                    {activeUtilityTab === 'usage' ? (
                      <>
                        <Bar dataKey="elecUsage" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Điện tiêu thụ" />
                        <Bar dataKey="waterUsage" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Nước tiêu thụ" />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="elecCost" fill="#eab308" radius={[4, 4, 0, 0]} name="Tiền Điện" />
                        <Bar dataKey="waterCost" fill="#2563eb" radius={[4, 4, 0, 0]} name="Tiền Nước" />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Vacant Rooms List */}
          <div className="lg:col-span-3 flex flex-col rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white p-4 sm:p-8 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Phòng trống cần cho thuê</h3>
                <p className="text-xs text-slate-500 font-medium">Tạo nhanh hợp đồng cho các phòng còn trống</p>
              </div>
              <a href="/rooms" className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                Xem tất cả <ArrowRight size={14} />
              </a>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {vacantRoomsList.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  Chúc mừng! Tất cả các phòng đều đã được lấp đầy.
                </div>
              ) : vacantRoomsList.map(room => (
                <div key={room.id} className="group relative flex flex-col p-5 bg-slate-50/50 border border-slate-100 rounded-[24px] transition-all hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-100/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-black text-slate-900">{room.name}</div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-600 border border-emerald-100">Sẵn sàng</span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Giá niêm yết</div>
                  <div className="text-lg font-black text-indigo-600">{formatMoney(room.price)}</div>
                  <Link href={`/contracts/new?room_id=${room.id}`} className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600">
                    <Plus size={14} /> Tạo Hợp Đồng
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 flex flex-col rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white p-4 sm:p-8 shadow-xl shadow-slate-200/40">
            <h3 className="mb-6 text-xl font-extrabold text-slate-900">Truy cập nhanh</h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickAction title="Hóa đơn" href="/invoices" icon={<FileText />} color="indigo" />
              <QuickAction title="Tiền cọc" href="/deposits" icon={<Wallet />} color="emerald" />
              <QuickAction title="Quản lý Phòng" href="/rooms" icon={<Home />} color="amber" />
              <QuickAction title="Ví tiền" href="/owner/settings?tab=wallets" icon={<Building2 />} color="rose" />
              <QuickAction title="Giao dịch" href="/owner/transactions" icon={<Repeat />} color="blue" />
              <QuickAction title="Khách thuê" href="/owner/tenants" icon={<Users />} color="slate" />
            </div>
            
            <div className="mt-auto pt-8">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-lg shadow-indigo-100">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <AlertCircle size={18} />
                </div>
                <h4 className="font-extrabold">Báo cáo sự cố?</h4>
                <p className="mt-1 text-xs text-indigo-100 font-medium leading-relaxed">
                  Gửi phản hồi cho chúng tôi nếu bạn gặp bất kỳ vấn đề gì trong quá trình vận hành.
                </p>
                <button className="mt-4 text-xs font-black bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
                  Gửi phản hồi ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RBACGuard>
  );
}

function StatCard({ title, value, icon, color, trend, subValue }: any) {
  const hoverBorders: any = {
    indigo: 'hover:border-indigo-300 hover:shadow-indigo-100/40',
    rose: 'hover:border-rose-300 hover:shadow-rose-100/40',
    emerald: 'hover:border-emerald-300 hover:shadow-emerald-100/40',
    amber: 'hover:border-amber-300 hover:shadow-amber-100/40',
  };
  
  const iconGradients: any = {
    indigo: 'from-indigo-500 to-indigo-600',
    rose: 'from-rose-500 to-rose-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
  };
  
  return (
    <div className={`relative group overflow-hidden rounded-2xl sm:rounded-[32px] border border-slate-200 bg-white p-5 sm:p-7 shadow-xl shadow-slate-100/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${hoverBorders[color]}`}>
      <div className="absolute top-0 right-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-slate-50 transition-colors group-hover:bg-slate-100/60"></div>
      
      <div className="relative flex items-center justify-between mb-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${iconGradients[color]} text-white shadow-lg`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{title}</div>
          <div className="text-xs font-black text-emerald-600 mt-0.5">{trend}</div>
        </div>
      </div>
      
      <div className="relative">
        <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">{value}</div>
        <div className="mt-1 text-xs font-bold text-slate-400">{subValue}</div>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: any) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50/50 px-4 py-3 border border-slate-100/60 hover:border-slate-200 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: color}} /> 
        <span className="text-xs font-bold text-slate-600">{label}</span>
      </div>
      <span className="text-xs font-black text-slate-950">{value} phòng</span>
    </div>
  );
}

function QuickAction({ title, href, icon, color }: any) {
  const colors: any = {
    indigo: 'bg-indigo-50/40 text-indigo-600 border-indigo-100/70 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-md hover:shadow-indigo-100/60',
    emerald: 'bg-emerald-50/40 text-emerald-600 border-emerald-100/70 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-md hover:shadow-emerald-100/60',
    amber: 'bg-amber-50/40 text-amber-600 border-amber-100/70 hover:bg-amber-600 hover:text-white hover:border-amber-600 hover:shadow-md hover:shadow-amber-100/60',
    rose: 'bg-rose-50/40 text-rose-600 border-rose-100/70 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md hover:shadow-rose-100/60',
    blue: 'bg-blue-50/40 text-blue-600 border-blue-100/70 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md hover:shadow-blue-100/60',
    slate: 'bg-slate-50/40 text-slate-600 border-slate-100/70 hover:bg-slate-600 hover:text-white hover:border-slate-600 hover:shadow-md hover:shadow-slate-100/60',
  };

  return (
    <a href={href} className={`flex flex-col items-center justify-center gap-3 rounded-2xl p-4 sm:p-5 transition-all duration-300 border shadow-sm hover:-translate-y-0.5 group ${colors[color]}`}>
      <div className="transition-transform duration-300 group-hover:scale-110">{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
    </a>
  );
}
