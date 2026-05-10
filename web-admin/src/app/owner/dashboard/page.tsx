"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
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
  ArrowDownRight
} from 'lucide-react';
import { 
  loadRentalRooms, 
  loadTransactions, 
  loadBoardingHouses, 
  formatMoney, 
  normalizeRoomStatus,
  loadWallets
} from '@/lib/rentalOps';
import RBACGuard from '@/components/RBACGuard';
import LoadingSkeleton from '@/components/ops/LoadingSkeleton';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function OwnerDashboard() {
  const roomsQuery = useQuery({ queryKey: ['rooms'], queryFn: () => loadRentalRooms(), staleTime: 60000 });
  const transactionsQuery = useQuery({ queryKey: ['transactions'], queryFn: loadTransactions, staleTime: 60000 });
  const housesQuery = useQuery({ queryKey: ['boarding-houses'], queryFn: loadBoardingHouses, staleTime: 60000 });
  const walletsQuery = useQuery({ queryKey: ['wallets'], queryFn: loadWallets, staleTime: 60000 });

  const stats = useMemo(() => {
    if (!roomsQuery.data) return null;
    const rooms = roomsQuery.data;
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
  }, [roomsQuery.data]);

  const financialStats = useMemo(() => {
    if (!transactionsQuery.data) return null;
    const txs = transactionsQuery.data;
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
  }, [transactionsQuery.data]);

  const vacantRoomsList = useMemo(() => {
    if (!roomsQuery.data) return [];
    return roomsQuery.data
      .filter(r => normalizeRoomStatus(r) === 'vacant')
      .slice(0, 4);
  }, [roomsQuery.data]);

  const isLoading = roomsQuery.isLoading || transactionsQuery.isLoading || housesQuery.isLoading;
  const safeStats = stats ?? { total: 0, occupied: 0, vacant: 0, reserved: 0, maintenance: 0, occupancyRate: 0 };
  const chartData = financialStats?.chartData ?? [];

  if (isLoading) return <div className="p-8"><LoadingSkeleton rows={12} /></div>;

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-7xl space-y-10 pb-20 animate-in fade-in duration-1000">
        
        {/* Hero Section */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                <TrendingUp size={14} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Phân tích hệ thống</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-2 text-lg text-slate-500">Chào mừng trở lại! Đây là tình hình vận hành của bạn.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white px-5 py-3 shadow-lg shadow-slate-100 border border-slate-100 flex items-center gap-3 transition-all hover:scale-[1.02]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <Calendar size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kỳ báo cáo</div>
                <div className="text-sm font-black text-slate-800">Tháng {new Date().getMonth() + 1}, {new Date().getFullYear()}</div>
              </div>
            </div>
          </div>
        </div>

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
            subValue="Biên lợi nhuận 72%"
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

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Chart Card */}
          <div className="col-span-1 flex flex-col rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40 lg:col-span-2">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Biến động dòng tiền</h3>
                <p className="text-sm text-slate-500">Dữ liệu tài chính trong 6 tháng gần nhất</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                  <span className="text-xs font-bold text-slate-600">Thu nhập</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-slate-200"></div>
                  <span className="text-xs font-bold text-slate-600">Chi phí</span>
                </div>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                    tickFormatter={(v) => `${v/1000000}M`}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                    itemStyle={{fontWeight: 'bold', fontSize: '13px'}}
                    labelStyle={{fontWeight: '900', color: '#1e293b', marginBottom: '4px'}}
                    formatter={(value) => formatMoney(Number(value || 0))} 
                  />
                  <Area type="monotone" dataKey="thu" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorThu)" />
                  <Area type="monotone" dataKey="chi" stroke="#e2e8f0" strokeWidth={3} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Room Status Card */}
          <div className="flex flex-col rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
            <h3 className="mb-2 text-xl font-black text-slate-900">Trạng thái phòng</h3>
            <p className="mb-8 text-sm text-slate-500">Phân bổ sử dụng tài sản</p>
            
            <div className="relative h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={[
                      { name: 'Đang ở', value: safeStats.occupied },
                      { name: 'Phòng trống', value: safeStats.vacant },
                      { name: 'Khác', value: safeStats.reserved + safeStats.maintenance },
                    ]} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={70} 
                    outerRadius={90} 
                    paddingAngle={8} 
                    dataKey="value"
                  >
                    {COLORS.map((entry, index) => <Cell key={`cell-${index}`} fill={entry} stroke="none" />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-3xl font-black text-slate-900">{safeStats.total}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tổng phòng</div>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-3">
              <Legend color="#6366f1" label="Đang ở" value={safeStats.occupied} />
              <Legend color="#10b981" label="Trống" value={safeStats.vacant} />
              <Legend color="#f59e0b" label="Đặt cọc" value={safeStats.reserved} />
              <Legend color="#ef4444" label="Bảo trì" value={safeStats.maintenance} />
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Vacant Rooms List */}
          <div className="lg:col-span-3 flex flex-col rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Phòng trống cần cho thuê</h3>
                <p className="text-sm text-slate-500">Ưu tiên đẩy tin cho các phòng này</p>
              </div>
              <a href="/rooms?filter=Trống" className="text-sm font-black text-indigo-600 hover:underline flex items-center gap-1">
                Tất cả <ArrowRight size={14} />
              </a>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {vacantRoomsList.length === 0 ? (
                <div className="col-span-2 py-10 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  Chúc mừng! Tất cả các phòng đều đã được lấp đầy.
                </div>
              ) : vacantRoomsList.map(room => (
                <div key={room.id} className="group relative flex flex-col p-5 bg-slate-50 border border-transparent rounded-[24px] transition-all hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-100/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-black text-slate-900">{room.name}</div>
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Giá niêm yết</div>
                  <div className="text-xl font-black text-indigo-600">{formatMoney(room.price)}</div>
                  <Link href={`/contracts/new?room_id=${room.id}`} className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600">
                    <Plus size={14} /> Tạo Hợp Đồng
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 flex flex-col rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40">
            <h3 className="mb-6 text-xl font-black text-slate-900">Truy cập nhanh</h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickAction title="Hóa đơn" href="/invoices" icon={<FileText />} color="indigo" />
              <QuickAction title="Tiền cọc" href="/deposits" icon={<Wallet />} color="emerald" />
              <QuickAction title="Quản lý Phòng" href="/rooms" icon={<Home />} color="amber" />
              <QuickAction title="Ví tiền" href="/owner/settings?tab=wallets" icon={<Building2 />} color="rose" />
              <QuickAction title="Giao dịch" href="/owner/transactions" icon={<Repeat />} color="blue" />
              <QuickAction title="Khách thuê" href="/owner/tenants" icon={<Users />} color="slate" />
            </div>
            
            <div className="mt-auto pt-8">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white shadow-lg shadow-indigo-200">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <AlertCircle size={20} />
                </div>
                <h4 className="font-black">Báo cáo sự cố?</h4>
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
  const colors: any = {
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-100',
    rose: 'from-rose-500 to-rose-600 shadow-rose-100',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-100',
    amber: 'from-amber-500 to-amber-600 shadow-amber-100',
  };
  
  return (
    <div className="relative group overflow-hidden rounded-[32px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 hover:shadow-2xl">
      <div className={`absolute top-0 right-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-slate-50 transition-colors group-hover:bg-slate-100`}></div>
      
      <div className="relative flex items-center justify-between mb-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br ${colors[color]} text-white shadow-lg`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</div>
          <div className="text-xs font-bold text-emerald-600">{trend}</div>
        </div>
      </div>
      
      <div className="relative">
        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
        <div className="mt-1 text-xs font-bold text-slate-400">{subValue}</div>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: any) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-transparent hover:border-slate-200 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: color}} /> 
        <span className="text-xs font-bold text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-black text-slate-900">{value}</span>
    </div>
  );
}

function QuickAction({ title, href, icon, color }: any) {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white',
    rose: 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white',
    slate: 'bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white',
  };

  return (
    <a href={href} className={`flex flex-col items-center gap-3 rounded-2xl p-5 transition-all duration-300 shadow-sm border border-slate-100 ${colors[color]}`}>
      <div className="transition-transform group-hover:scale-110">{icon}</div>
      <span className="text-xs font-black uppercase tracking-tighter">{title}</span>
    </a>
  );
}

