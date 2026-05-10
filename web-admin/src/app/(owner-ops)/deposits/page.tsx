"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Search, Wallet as WalletIcon, X, Calendar, User, Phone, Home, ArrowRight, ShieldCheck, Filter, MoreVertical, History } from "lucide-react";
import StatusBadge from "@/components/ops/StatusBadge";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import {
  loadDeposits,
  createDeposit,
  cancelDeposit,
  loadRentalRooms,
  formatMoney,
  Deposit,
  DepositInput,
  RentalRoom,
  loadWallets,
  Wallet,
} from "@/lib/rentalOps";

export default function DepositsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  const depositsQuery = useQuery({
    queryKey: ["deposits"],
    queryFn: loadDeposits,
    staleTime: 30_000,
  });

  const deposits = depositsQuery.data ?? [];
  const filtered = search.trim()
    ? deposits.filter(
        (d) =>
          d.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
          d.room_name?.toLowerCase().includes(search.toLowerCase()) ||
          d.tenant_phone?.includes(search)
      )
    : deposits;

  const totalHolding = deposits
    .filter((d) => d.status === "holding")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const totalAll = deposits
    .filter((d) => d.status !== "cancelled")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-100 text-orange-600">
              <History size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Quản lý tài chính</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Tiền Cọc</h1>
          <p className="mt-2 text-lg text-slate-500">
            Theo dõi và quản lý mọi khoản đặt cọc giữ chỗ và cọc hợp đồng.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={20} />
          Ghi nhận cọc mới
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-3">
        <SummaryCard
          label="Cọc đang giữ"
          value={formatMoney(totalHolding)}
          icon={<WalletIcon size={20} />}
          color="indigo"
          description="Các khoản cọc giữ chỗ chưa chuyển đổi"
        />
        <SummaryCard
          label="Tổng tiền cọc"
          value={formatMoney(totalAll)}
          icon={<ShieldCheck size={20} />}
          color="emerald"
          description="Bao gồm cả cọc hợp đồng hiện tại"
        />
        <SummaryCard
          label="Phòng đang giữ cọc"
          value={String(deposits.filter((d) => d.status === "holding").length)}
          icon={<Home size={20} />}
          color="orange"
          description="Các phòng ở trạng thái 'Đã cọc'"
        />
      </div>

      {/* Control Bar */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            className="w-full rounded-2xl border-none bg-white py-3.5 pl-12 pr-4 text-sm font-medium shadow-sm ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Tìm theo tên khách, phòng, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50">
             <Filter size={16} /> Bộ lọc
           </button>
        </div>
      </div>

      {/* Deposits List */}
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-6 py-5">Thông tin phòng</th>
                <th className="px-6 py-5">Khách hàng</th>
                <th className="px-6 py-5">Số tiền</th>
                <th className="px-6 py-5">Thời gian</th>
                <th className="px-6 py-5">Trạng thái</th>
                <th className="px-6 py-5">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {depositsQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <LoadingSkeleton rows={5} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                      <WalletIcon size={40} />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900">Không có dữ liệu tiền cọc</h3>
                    <p className="mt-1 text-slate-500">Mọi khoản cọc được ghi nhận sẽ xuất hiện tại đây.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((deposit) => (
                  <DepositRow
                    key={deposit.id}
                    deposit={deposit}
                    onCancelled={() => queryClient.invalidateQueries({ queryKey: ["deposits"] })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {formOpen && (
        <NewDepositModal
          onClose={() => setFormOpen(false)}
          onCreated={() => {
            setFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ["deposits"] });
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color, description }: any) {
  const colors: any = {
    indigo: 'from-indigo-500 to-blue-600 bg-indigo-50 text-indigo-600 shadow-indigo-100',
    emerald: 'from-emerald-500 to-teal-600 bg-emerald-50 text-emerald-600 shadow-emerald-100',
    orange: 'from-orange-500 to-amber-600 bg-orange-50 text-orange-600 shadow-orange-100',
  };

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color].split(' ')[2]} ${colors[color].split(' ')[3]} transition-transform group-hover:scale-110 shadow-lg`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
        <div className="mt-1 text-2xl font-black text-slate-900 tracking-tight">{value}</div>
        <div className="mt-2 text-xs font-medium text-slate-500">{description}</div>
      </div>
    </div>
  );
}

function DepositRow({ deposit, onCancelled }: { deposit: Deposit; onCancelled: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: () => cancelDeposit(deposit.id, "Hủy bởi chủ nhà"),
    onSuccess: onCancelled,
  });

  return (
    <tr className="group hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
            <Home size={18} />
          </div>
          <div>
            <div className="font-black text-slate-900">{deposit.room_name || "—"}</div>
            {deposit.facility_name && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{deposit.facility_name}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <User size={14} className="text-slate-300" />
          {deposit.tenant_name}
          {deposit.tenant_phone && (
             <span className="ml-1 text-xs font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">({deposit.tenant_phone})</span>
          )}
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="text-lg font-black text-slate-900">{formatMoney(deposit.amount)}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tiền cọc</div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Calendar size={14} className="text-slate-300" />
          {deposit.deposit_date}
        </div>
      </td>
      <td className="px-6 py-5">
        <StatusBadge status={deposit.status} />
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          {deposit.status === "holding" && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs font-black uppercase tracking-widest text-rose-600 hover:text-rose-800"
            >
              Hủy cọc
            </button>
          )}
          {confirming && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-md"
              >
                {cancelMutation.isPending ? "..." : "Xác nhận"}
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs font-bold text-slate-400">
                Hủy
              </button>
            </div>
          )}
          <button className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewDepositModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [rooms, setRooms] = useState<RentalRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<DepositInput>({
    roomId: "",
    tenantName: "",
    tenantPhone: "",
    amount: 0,
    depositDate: new Date().toISOString().split("T")[0],
    note: "",
    walletId: "",
  });

  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: loadWallets, staleTime: 60_000 });

  React.useEffect(() => {
    loadRentalRooms()
      .then((data) => setRooms(data.filter((r) => r.status === "vacant")))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (walletsQuery.data?.length && !form.walletId) {
      setForm(prev => ({ ...prev, walletId: walletsQuery.data[0].id }));
    }
  }, [walletsQuery.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomId) return setError("Vui lòng chọn phòng.");
    if (!form.tenantName.trim()) return setError("Vui lòng nhập tên khách đặt cọc.");
    if (!form.amount || form.amount <= 0) return setError("Vui lòng nhập số tiền cọc hợp lệ.");

    setLoading(true);
    setError("");
    try {
      await createDeposit(form);
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi ghi nhận cọc.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-[32px] bg-white p-10 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Ghi nhận cọc</h2>
            <p className="mt-1 text-sm text-slate-500 font-medium">Lập phiếu giữ chỗ và thay đổi trạng thái phòng.</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 flex items-center gap-3 text-red-700">
               <ShieldCheck size={18} />
               <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chọn phòng trống</label>
            <select
              className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500"
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              required
            >
              <option value="">— Click để chọn phòng —</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} — {formatMoney(room.price)}/tháng
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Họ tên khách hàng</label>
              <input
                className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500 placeholder:text-slate-300"
                placeholder="VD: Nguyễn Văn A"
                value={form.tenantName}
                onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Số điện thoại</label>
              <input
                className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500 placeholder:text-slate-300"
                placeholder="VD: 0901234567"
                value={form.tenantPhone}
                onChange={(e) => setForm({ ...form, tenantPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Số tiền cọc (₫)</label>
              <input
                className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-black text-orange-600 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500"
                type="number"
                min={0}
                placeholder="500000"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày ghi nhận</label>
              <input
                className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500"
                type="date"
                value={form.depositDate}
                onChange={(e) => setForm({ ...form, depositDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ví thu tiền cọc</label>
            <select
              className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500"
              value={form.walletId}
              onChange={(e) => setForm({ ...form, walletId: e.target.value })}
              required
            >
              {walletsQuery.data?.map((w: Wallet) => (
                <option key={w.id} value={w.id}>{w.name} ({formatMoney(w.balance || 0)})</option>
              ))}
            </select>
          </div>

          {form.amount > 0 && form.roomId && (
            <div className="rounded-[24px] bg-indigo-50 p-6 text-sm border border-indigo-100">
              <div className="flex items-center gap-2 font-black text-indigo-900 mb-2">
                <ShieldCheck size={18} />
                Tóm tắt giao dịch
              </div>
              <div className="space-y-1.5 font-bold text-indigo-700">
                <div className="flex justify-between items-center">
                  <span>Phòng:</span>
                  <span className="text-slate-900">{rooms.find((r) => r.id === form.roomId)?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Số tiền:</span>
                  <span className="text-xl font-black text-orange-600">{formatMoney(form.amount)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] rounded-2xl bg-slate-900 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Xác nhận cọc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

