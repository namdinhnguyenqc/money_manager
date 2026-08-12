"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Search, Wallet as WalletIcon, X, Calendar, User, Phone, Home, ArrowRight, ShieldCheck, Filter, MoreVertical, History, Plus } from "lucide-react";
import Link from "next/link";
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
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import { useSearchParams } from "next/navigation";

import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";

const pageSize = 10;
const statusFilters = [
  { label: "Đang giữ cọc", value: "holding" },
  { label: "Tất cả", value: "all" },
  { label: "Đã nhận phòng", value: "completed" },
  { label: "Đã hủy cọc", value: "cancelled" },
];

export default function DepositsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const urlRoomId = searchParams.get("room_id") || "";
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"holding" | "all" | "completed" | "cancelled">("holding");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (urlRoomId) {
      setFormOpen(true);
    }
  }, [urlRoomId]);

  const depositsQuery = useQuery({
    queryKey: ["deposits"],
    queryFn: loadDeposits,
    staleTime: 30_000,
  });

  const deposits = depositsQuery.data ?? [];
  const filtered = useMemo(() => {
    let result = deposits;
    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.tenant_name?.toLowerCase().includes(q) ||
          d.room_name?.toLowerCase().includes(q) ||
          d.tenant_phone?.includes(q)
      );
    }
    return result;
  }, [deposits, statusFilter, search]);
  const visibleDeposits = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  useEffect(() => setPage(1), [search, statusFilter]);

  const totalHolding = deposits
    .filter((d) => d.status === "holding")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const totalAll = deposits
    .filter((d) => d.status !== "cancelled")
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Quản lý tài chính"
        icon={<History size={14} />}
        title="Tiền Cọc"
        description="Theo dõi và quản lý mọi khoản đặt cọc giữ chỗ và cọc hợp đồng."
        actions={
          <Link href="/deposits/new">
            <Button variant="primary" icon={<Plus size={16} />}>Tạo đặt cọc</Button>
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Cọc đang giữ"
          value={formatMoney(totalHolding)}
          icon={<WalletIcon size={18} />}
          tone="primary"
          description="Các khoản cọc giữ chỗ chưa chuyển đổi"
        />
        <MetricCard
          label="Tổng tiền cọc"
          value={formatMoney(totalAll)}
          icon={<ShieldCheck size={18} />}
          tone="success"
          description="Bao gồm cả cọc hợp đồng hiện tại"
        />
        <MetricCard
          label="Phòng đang giữ cọc"
          value={String(deposits.filter((d) => d.status === "holding").length)}
          icon={<Home size={18} />}
          tone="warning"
          description="Các phòng ở trạng thái 'Đã cọc'"
        />
      </div>

      {/* Filter pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {statusFilters.map((item) => (
          <button
            key={item.value}
            onClick={() => setStatusFilter(item.value as any)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-all ${
              statusFilter === item.value ? filterPillActive : filterPillInactive
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Control Bar */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 max-w-md">
          <Input
            icon={<Search size={16} />}
            placeholder="Tìm theo tên khách, phòng, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Deposits Table */}
      <DataTable className="hidden lg:block" headers={["Thông tin phòng", "Khách hàng", "Số tiền", "Thời gian", "Trạng thái", "Thao tác"]}>
        {depositsQuery.isLoading ? (
          <tr>
            <td colSpan={6} className="px-6 py-20 text-center">
              <LoadingSkeleton rows={5} />
            </td>
          </tr>
        ) : filtered.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-6 py-24 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <WalletIcon size={32} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">Không có dữ liệu tiền cọc</h3>
              <p className="mt-1 text-sm text-slate-500">Mọi khoản cọc được ghi nhận sẽ xuất hiện tại đây.</p>
            </td>
          </tr>
        ) : (
          visibleDeposits.map((deposit) => (
            <DepositRow
              key={deposit.id}
              deposit={deposit}
              onCancelled={() => invalidateOwnerOpsQueries(queryClient, { roomId: deposit.room_id })}
            />
          ))
        )}
      </DataTable>
      {/* Mobile card list */}
      <div className="space-y-3 lg:hidden">
        {depositsQuery.isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Không có dữ liệu tiền cọc.</div>
        ) : visibleDeposits.map((deposit) => (
          <div key={deposit.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{deposit.room_name || "—"}</div>
                {deposit.facility_name && <div className="text-xs text-slate-400">{deposit.facility_name}</div>}
                <div className="mt-1 text-sm text-slate-600">{deposit.tenant_name}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-slate-900 whitespace-nowrap">{formatMoney(deposit.amount)}</div>
                <div className="mt-1"><StatusBadge status={deposit.status} /></div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12} />{deposit.deposit_date}</div>
              {deposit.status === "holding" && (
                <Button variant="danger-ghost" size="sm" onClick={() => {
                  if (window.confirm("Hủy khoản cọc này?")) cancelDeposit(deposit.id, "Hủy bởi chủ nhà").then(() => invalidateOwnerOpsQueries(queryClient, { roomId: deposit.room_id }));
                }}>
                  Hủy cọc
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />

      {/* Form Modal */}
      {formOpen && (
        <NewDepositModal
          defaultRoomId={urlRoomId}
          onClose={() => {
            setFormOpen(false);
            window.history.replaceState(null, "", "/deposits");
          }}
          onCreated={() => {
            setFormOpen(false);
            window.history.replaceState(null, "", "/deposits");
            invalidateOwnerOpsQueries(queryClient);
          }}
        />
      )}
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
    <tr className="group hover:bg-slate-50 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
            <Home size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">{deposit.room_name || "—"}</div>
            {deposit.facility_name && (
              <div className="text-xs text-slate-400 truncate">{deposit.facility_name}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User size={14} className="shrink-0 text-slate-300" />
          <span className="truncate max-w-[140px]">{deposit.tenant_name}</span>
          {deposit.tenant_phone && (
             <span className="text-xs text-slate-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">({deposit.tenant_phone})</span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-base font-bold text-slate-900 whitespace-nowrap">{formatMoney(deposit.amount)}</div>
        <div className="text-xs text-slate-400">Tiền cọc</div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
          <Calendar size={14} className="shrink-0 text-slate-300" />
          {deposit.deposit_date}
        </div>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={deposit.status} />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {deposit.status === "holding" && !confirming && (
            <Button
              variant="danger-ghost"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              Hủy cọc
            </Button>
          )}
          {confirming && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                loading={cancelMutation.isPending}
              >
                Xác nhận
              </Button>
              <button onClick={() => setConfirming(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                Hủy
              </button>
            </div>
          )}
          <button className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewDepositModal({ defaultRoomId = "", onClose, onCreated }: { defaultRoomId?: string; onClose: () => void; onCreated: () => void }) {
  const [rooms, setRooms] = useState<RentalRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<DepositInput>({
    roomId: defaultRoomId,
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
      .then((data) => setRooms(data.filter((r) => r.status === "vacant" || r.id === defaultRoomId)))
      .catch(() => undefined);
  }, [defaultRoomId]);

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
        className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Ghi nhận cọc</h2>
            <p className="mt-1 text-sm text-slate-500">Lập phiếu giữ chỗ và thay đổi trạng thái phòng.</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
               <ShieldCheck size={16} className="shrink-0" />
               <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          <div>
            <Label>Chọn phòng trống</Label>
            <Select
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
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Họ tên khách hàng</Label>
              <Input
                placeholder="VD: Nguyễn Văn A"
                value={form.tenantName}
                onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input
                placeholder="VD: 0901234567"
                value={form.tenantPhone}
                onChange={(e) => setForm({ ...form, tenantPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Số tiền cọc (₫)</Label>
              <Input
                type="number"
                min={0}
                placeholder="500000"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>Ngày ghi nhận</Label>
              <Input
                type="date"
                value={form.depositDate}
                onChange={(e) => setForm({ ...form, depositDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Ví thu tiền cọc</Label>
            <Select
              value={form.walletId}
              onChange={(e) => setForm({ ...form, walletId: e.target.value })}
              required
            >
              {walletsQuery.data?.map((w: Wallet) => (
                <option key={w.id} value={w.id}>{w.name} ({formatMoney(w.balance || 0)})</option>
              ))}
            </Select>
          </div>

          {form.amount > 0 && form.roomId && (
            <Card className="p-4 bg-blue-50 border-blue-100">
              <div className="flex items-center gap-2 font-bold text-blue-900 mb-2">
                <ShieldCheck size={16} />
                Tóm tắt giao dịch
              </div>
              <div className="space-y-1.5 text-sm text-blue-700">
                <div className="flex justify-between items-center">
                  <span>Phòng:</span>
                  <span className="font-semibold text-slate-900">{rooms.find((r) => r.id === form.roomId)?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Số tiền:</span>
                  <span className="text-lg font-bold text-orange-600 whitespace-nowrap">{formatMoney(form.amount)}</span>
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              loading={loading}
              className="flex-[2]"
            >
              {loading ? "Đang xử lý..." : "Xác nhận cọc"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
