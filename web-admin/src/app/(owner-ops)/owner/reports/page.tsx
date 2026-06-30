"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Home, DoorOpen, Wallet, Zap, Droplet, Wifi, AlertCircle } from "lucide-react";
import {
  loadBoardingHouses, loadRentalRooms, loadInvoicesWithItems, loadTransactions, loadContracts,
  formatMoney, normalizeRoomStatus,
} from "@/lib/rentalOps";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const txMonthKey = (tx: any): string | null => {
  const period = String(tx?.metadata?.period || tx?.period || "");
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  const d = new Date(tx.date);
  return Number.isNaN(d.getTime()) ? null : monthKey(d);
};

const utilityType = (tx: any): "electricity" | "water" | "wifi" | null => {
  const text = [tx.category_name, tx?.metadata?.utility_type, tx.description]
    .map((v) => String(v || "").toLowerCase()).join(" ");
  if (text.includes("wifi") || text.includes("fpt") || text.includes("internet") || text.includes("mạng")) return "wifi";
  if (text.includes("điện") || text.includes("dien") || text.includes("electric")) return "electricity";
  if (text.includes("nước") || text.includes("nuoc") || text.includes("water")) return "water";
  return null;
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"finance" | "occupancy">("finance");
  const [selectedBh, setSelectedBh] = useState("all");

  const facilitiesQuery = useQuery({ queryKey: ["boarding-houses"], queryFn: loadBoardingHouses, staleTime: 60_000 });
  const roomsQuery = useQuery({ queryKey: ["rental-rooms-all"], queryFn: () => loadRentalRooms(), staleTime: 60_000 });
  const invoicesQuery = useQuery({ queryKey: ["invoices-with-items"], queryFn: () => loadInvoicesWithItems(), staleTime: 60_000 });
  const txQuery = useQuery({ queryKey: ["transactions-all"], queryFn: loadTransactions, staleTime: 60_000 });
  const contractsQuery = useQuery({ queryKey: ["contracts"], queryFn: loadContracts, staleTime: 60_000 });

  const facilities = facilitiesQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const transactions = txQuery.data ?? [];
  const contracts = contractsQuery.data ?? [];

  const loading = roomsQuery.isLoading || invoicesQuery.isLoading || txQuery.isLoading;

  const filteredRooms = useMemo(() => {
    if (selectedBh === "all") return rooms;
    return rooms.filter((r: any) => {
      const bhId = r.boarding_house_id ?? r.boardingHouseId ?? r.building_id ?? r.facility_id;
      return String(bhId) === String(selectedBh);
    });
  }, [rooms, selectedBh]);

  const roomIds = useMemo(() => new Set(filteredRooms.map((r: any) => String(r.id))), [filteredRooms]);

  const filteredInvoices = useMemo(
    () => (selectedBh === "all" ? invoices : invoices.filter((i: any) => roomIds.has(String(i.room_id)))),
    [invoices, roomIds, selectedBh],
  );

  const filteredTxs = useMemo(() => {
    if (selectedBh === "all") return transactions;
    return transactions.filter((tx: any) => {
      const txBh = tx?.metadata?.boarding_house_id ?? tx.boarding_house_id ?? tx.facility_id;
      if (txBh && String(txBh) === String(selectedBh)) return true;
      if (tx.invoice_id) {
        const inv = invoices.find((i: any) => String(i.id) === String(tx.invoice_id));
        if (inv && roomIds.has(String(inv.room_id))) return true;
      }
      if (tx.contract_id) {
        const con = contracts.find((c: any) => String(c.id) === String(tx.contract_id));
        if (con && roomIds.has(String((con as any).room_id))) return true;
      }
      return filteredRooms.some((r: any) => String(tx.description || "").toLowerCase().includes(String(r.name).toLowerCase()));
    });
  }, [transactions, selectedBh, invoices, contracts, roomIds, filteredRooms]);

  // 6-month cash flow
  const cashFlow = useMemo(() => {
    const months: { key: string; label: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: `T${d.getMonth() + 1}`, income: 0, expense: 0 });
    }
    const map = new Map(months.map((m) => [m.key, m]));
    for (const tx of filteredTxs) {
      const k = txMonthKey(tx);
      if (!k || !map.has(k)) continue;
      const m = map.get(k)!;
      const amt = Math.abs(Number(tx.amount || 0));
      if (String(tx.type) === "income") m.income += amt;
      else if (String(tx.type) === "expense") m.expense += amt;
    }
    return months;
  }, [filteredTxs]);

  const totals = useMemo(() => {
    const income = cashFlow.reduce((s, m) => s + m.income, 0);
    const expense = cashFlow.reduce((s, m) => s + m.expense, 0);
    return { income, expense, profit: income - expense };
  }, [cashFlow]);

  // Utility breakdown (this period income from invoices items)
  const utilities = useMemo(() => {
    let electricity = 0, water = 0, wifi = 0;
    for (const tx of filteredTxs) {
      if (String(tx.type) !== "income") continue;
      const t = utilityType(tx);
      const amt = Math.abs(Number(tx.amount || 0));
      if (t === "electricity") electricity += amt;
      else if (t === "water") water += amt;
      else if (t === "wifi") wifi += amt;
    }
    return { electricity, water, wifi };
  }, [filteredTxs]);

  // Occupancy
  const occupancy = useMemo(() => {
    const total = filteredRooms.length;
    const occupied = filteredRooms.filter((r: any) => normalizeRoomStatus(r) === "occupied").length;
    const vacant = filteredRooms.filter((r: any) => normalizeRoomStatus(r) === "vacant").length;
    const maintenance = filteredRooms.filter((r: any) => normalizeRoomStatus(r) === "maintenance").length;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, vacant, maintenance, rate };
  }, [filteredRooms]);

  // Outstanding debts
  const debts = useMemo(() => {
    return filteredInvoices
      .map((inv: any) => {
        const total = Math.round(Number(inv.total_amount || 0));
        const paid = Math.round(Number(inv.paid_amount || 0));
        return { ...inv, remaining: Math.max(0, total - paid) };
      })
      .filter((inv: any) => inv.remaining > 0)
      .sort((a: any, b: any) => b.remaining - a.remaining);
  }, [filteredInvoices]);

  const totalDebt = useMemo(() => debts.reduce((s: number, d: any) => s + d.remaining, 0), [debts]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader subtitle="Phân tích" title="Báo cáo & Thống kê" description="Dòng tiền, tỉ lệ lấp đầy và công nợ theo thời gian." />

      {/* Facility filter */}
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <button onClick={() => setSelectedBh("all")} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${selectedBh === "all" ? filterPillActive : filterPillInactive}`}>Tất cả cơ sở</button>
        {facilities.map((f: any) => (
          <button key={f.id} onClick={() => setSelectedBh(f.id)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${selectedBh === f.id ? filterPillActive : filterPillInactive}`}>{f.name}</button>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveTab("finance")} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${activeTab === "finance" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>Tài chính & Dịch vụ</button>
        <button onClick={() => setActiveTab("occupancy")} className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${activeTab === "occupancy" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>Lấp đầy & Công nợ</button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">Đang tải dữ liệu báo cáo...</div>
      ) : activeTab === "finance" ? (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<TrendingUp size={16} className="text-emerald-600" />} label="Tổng thu (6T)" value={formatMoney(totals.income)} tone="emerald" />
            <StatCard icon={<TrendingDown size={16} className="text-red-600" />} label="Tổng chi (6T)" value={formatMoney(totals.expense)} tone="red" />
            <StatCard icon={<Wallet size={16} className="text-blue-600" />} label="Lợi nhuận" value={formatMoney(totals.profit)} tone="blue" />
          </div>

          {/* Cash flow chart */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Dòng tiền 6 tháng gần nhất</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : v >= 1000 ? `${v / 1000}k` : String(v))} />
                  <Tooltip formatter={(v: any) => formatMoney(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Chi" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Utility breakdown */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Doanh thu dịch vụ (6 tháng)</h3>
            <div className="grid grid-cols-3 gap-3">
              <UtilCard icon={<Zap size={18} className="text-amber-500" />} label="Tiền điện" value={formatMoney(utilities.electricity)} />
              <UtilCard icon={<Droplet size={18} className="text-blue-500" />} label="Tiền nước" value={formatMoney(utilities.water)} />
              <UtilCard icon={<Wifi size={18} className="text-indigo-500" />} label="Wifi / Mạng" value={formatMoney(utilities.wifi)} />
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Occupancy */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Tỉ lệ lấp đầy</h3>
              <span className="text-2xl font-black text-blue-600">{occupancy.rate}%</span>
            </div>
            <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all" style={{ width: `${occupancy.rate}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={<Home size={16} className="text-emerald-600" />} label="Đang thuê" value={String(occupancy.occupied)} tone="emerald" />
              <StatCard icon={<DoorOpen size={16} className="text-slate-500" />} label="Còn trống" value={String(occupancy.vacant)} tone="slate" />
              <StatCard icon={<AlertCircle size={16} className="text-amber-600" />} label="Bảo trì" value={String(occupancy.maintenance)} tone="amber" />
            </div>
          </Card>

          {/* Debts ledger */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-red-50 px-4 py-3">
              <h3 className="text-sm font-bold text-red-700">Công nợ tồn đọng</h3>
              <span className="text-sm font-black text-red-700">{formatMoney(totalDebt)}</span>
            </div>
            {debts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Không có công nợ. Tuyệt vời! 🎉</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {debts.slice(0, 20).map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{inv.room_name || `Phòng #${inv.room_id}`}</div>
                      <div className="truncate text-xs text-slate-400">{inv.tenant_name || "-"} · T{inv.month}/{inv.year}</div>
                    </div>
                    <div className="shrink-0 text-sm font-bold text-red-600">{formatMoney(inv.remaining)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  const toneMap: Record<string, string> = {
    emerald: "bg-emerald-50", red: "bg-red-50", blue: "bg-blue-50", amber: "bg-amber-50", slate: "bg-slate-50",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${toneMap[tone] || "bg-slate-50"}`}>{icon}</div>
      <div className="text-[11px] font-medium text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-black text-slate-900">{value}</div>
    </div>
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
