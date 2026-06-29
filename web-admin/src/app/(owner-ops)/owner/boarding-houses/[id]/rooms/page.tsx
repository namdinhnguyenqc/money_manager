"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Lock, PencilLine, Receipt, Wallet } from "lucide-react";
import RoomEditModal, { Room } from "@/components/RoomEditModal";
import RBACGuard from "@/components/RBACGuard";
import { apiGet, apiPatch, apiPost } from "@/utils/apiClient";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";

type ExtendedRoom = Room & {
  tenantName?: string | null;
  contractId?: number | null;
  hasActiveContract?: boolean;
  rentalRoomId?: number | null;
  owner_room_id?: string | null;
  latestInvoiceId?: number | null;
  latestInvoiceLabel?: string | null;
  latestInvoiceStatus?: string | null;
  billingStatus?: string | null;
  latestInvoiceTotal?: number;
  latestInvoicePaidAmount?: number;
  outstandingAmount?: number;
};

const fmt = (n?: number | null) => `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(n || 0)))} ₫`;

const getRoomBillingStatus = (room: ExtendedRoom) => room.latestInvoiceStatus || room.billingStatus || null;

const billingMeta = (room: ExtendedRoom) => {
  switch (getRoomBillingStatus(room)) {
    case "PAID":
      return {
        label: room.latestInvoiceLabel ? `Đã thu ${room.latestInvoiceLabel}` : "Đã thu",
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "PARTIAL":
      return {
        label: `Thu một phần ${fmt(room.outstandingAmount)}`,
        tone: "bg-orange-50 text-orange-700 border-orange-200",
      };
    case "UNPAID":
      return {
        label: `Chờ thu ${fmt(room.outstandingAmount)}`,
        tone: "bg-red-50 text-red-700 border-red-200",
      };
    case "READY_TO_BILL":
      return {
        label: "Cần lập hóa đơn",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
      };
    default:
      return {
        label: "Chưa vận hành",
        tone: "bg-slate-100 text-slate-600 border-slate-200",
      };
  }
};

export default function BoardingHouseRoomsPage() {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const bhId = id as string;
  const focusRoomId = searchParams.get("focus");
  const [rooms, setRooms] = useState<ExtendedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planLimit, setPlanLimit] = useState<{ limit: number; current: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ExtendedRoom | null>(null);
  const [creating, setCreating] = useState(false);
  const [newRoom, setNewRoom] = useState<Partial<ExtendedRoom>>({
    name: "",
    price: 0,
    status: "AVAILABLE",
  });

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!bhId || !token) {
      window.location.href = "/login";
      return;
    }
    loadRooms();
  }, [bhId]);

  const summary = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        acc.total += 1;
        if (room.status === "AVAILABLE") acc.available += 1;
        if (room.status === "OCCUPIED") acc.occupied += 1;
        const billingStatus = getRoomBillingStatus(room);
        if (billingStatus === "READY_TO_BILL") acc.readyToBill += 1;
        if (["UNPAID", "PARTIAL"].includes(billingStatus || "")) acc.waitingPayment += 1;
        return acc;
      },
      { total: 0, available: 0, occupied: 0, readyToBill: 0, waitingPayment: 0 }
    );
  }, [rooms]);

  const loadRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<any>(`/owner/boarding-houses/${bhId}/rooms`);
      const list = (data?.data ?? data ?? []) as ExtendedRoom[];
      setRooms(list);
      if (focusRoomId) {
        const focused = list.find((room) => String(room.id) === String(focusRoomId));
        if (focused) setSelected(focused);
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  const updateRoom = async (payload: Partial<Room>) => {
    if (!selected) return;
    try {
      await apiPatch(`/owner/rooms/${selected.id}`, payload);
      await invalidateOwnerOpsQueries(queryClient, { facilityId: bhId, roomId: String(selected.id) });
      await loadRooms();
      setEditOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Update error");
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name?.trim()) {
      setError("Tên phòng là bắt buộc");
      return;
    }
    try {
      setCreating(true);
      setError(null);
      setPlanLimit(null);
      await apiPost(`/owner/boarding-houses/${bhId}/rooms`, {
        name: newRoom.name.trim(),
        price: Number(newRoom.price || 0),
        status: newRoom.status || "AVAILABLE",
      });
      setNewRoom({ name: "", price: 0, status: "AVAILABLE" });
      await invalidateOwnerOpsQueries(queryClient, { facilityId: bhId });
      await loadRooms();
    } catch (e: any) {
      if (e?.code === "PLAN_LIMIT_REACHED" || e?.details?.upgrade_required) {
        setPlanLimit({
          limit: e.details?.limit ?? 15,
          current: e.details?.current ?? rooms.length,
        });
      } else {
        setError(e?.message ?? "Create room error");
      }
    } finally {
      setCreating(false);
    }
  };

  const openEditFor = (room: ExtendedRoom) => {
    setSelected(room);
    setEditOpen(true);
  };

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">Cơ sở & phòng</p>
            <h2 className="text-2xl font-semibold text-slate-950">Phòng trong dãy trọ</h2>
            <p className="text-sm text-slate-500">
              Đây là lớp inventory. Muốn ký hợp đồng, lập hóa đơn và xác nhận thu tiền thì đi tiếp sang luồng Rental Ops.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/owner/boarding-houses/${bhId}`} className="rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
              Về chi tiết cơ sở
            </Link>
            <Link href="/owner/rental" className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              Mở Rental Ops
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">Tổng phòng</div><div className="mt-2 text-2xl font-semibold text-slate-950">{summary.total}</div></div>
          <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">Phòng trống</div><div className="mt-2 text-2xl font-semibold text-emerald-700">{summary.available}</div></div>
          <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">Đang thuê</div><div className="mt-2 text-2xl font-semibold text-blue-700">{summary.occupied}</div></div>
          <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">Cần lập hóa đơn</div><div className="mt-2 text-2xl font-semibold text-amber-700">{summary.readyToBill}</div></div>
          <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">Chờ thu tiền</div><div className="mt-2 text-2xl font-semibold text-rose-700">{summary.waitingPayment}</div></div>
        </div>

        {/* Plan limit banner */}
        {planLimit && (
          <div className="mb-5 flex items-start gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-amber-100 text-amber-600">
              <Lock size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">
                Đã đạt giới hạn gói Basic — {planLimit.current}/{planLimit.limit} phòng
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Gói Basic chỉ cho phép tối đa <strong>{planLimit.limit} phòng</strong> trên mỗi nhà trọ. Liên hệ admin để nâng cấp lên Premium và tạo không giới hạn.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-900">Basic</span>
          </div>
        )}

        <form onSubmit={createRoom} className={`mb-6 grid grid-cols-1 gap-3 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_160px_170px_140px] ${planLimit ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            className="rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm"
            value={newRoom.name ?? ""}
            onChange={(e) => setNewRoom((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Tên phòng"
            required
          />
          <input
            className="rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm"
            type="number"
            min={0}
            value={newRoom.price ?? 0}
            onChange={(e) => setNewRoom((prev) => ({ ...prev, price: Number(e.target.value) }))}
            placeholder="Giá"
          />
          <select
            className="rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm"
            value={newRoom.status ?? "AVAILABLE"}
            onChange={(e) => setNewRoom((prev) => ({ ...prev, status: e.target.value as Room["status"] }))}
          >
            <option value="AVAILABLE">Trống</option>
            <option value="OCCUPIED">Đang thuê</option>
            <option value="MAINTENANCE">Bảo trì</option>
          </select>
          <button className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={creating}>
            {creating ? "Đang tạo..." : "Thêm phòng"}
          </button>
        </form>

        {loading && <div>Đang tải danh sách phòng...</div>}
        {error && <div className="mb-4 text-red-600">{error}</div>}
        {!loading && rooms.length === 0 && <div className="text-sm text-slate-500">Chưa có phòng nào.</div>}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rooms.map((room) => {
            const billing = billingMeta(room);
            const isFocused = focusRoomId && String(room.id) === String(focusRoomId);
            return (
              <div key={room.id} className={`rounded-[8px] border bg-white p-5 shadow-sm ${isFocused ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Room</div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">{room.name ?? "N/A"}</div>
                    <div className="mt-1 text-sm text-slate-500">ID: {room.id}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-700">{fmt(room.price)}</div>
                    <div className="mt-1 text-xs text-slate-500">{room.status ?? "UNKNOWN"}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                      <Building2 size={14} />
                      Vận hành phòng
                    </div>
                    <div className="text-slate-600">{room.tenantName || "Chưa có khách thuê"}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {room.hasActiveContract ? `Hợp đồng #${room.contractId}` : "Chưa có hợp đồng"}
                    </div>
                  </div>

                  <div className={`rounded-xl border px-4 py-3 text-sm ${billing.tone}`}>
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <Receipt size={14} />
                      Thu tiền
                    </div>
                    <div>{billing.label}</div>
                    <div className="mt-1 text-xs opacity-80">
                      {room.latestInvoiceId ? `Hóa đơn #${room.latestInvoiceId}` : "Chưa có hóa đơn gần đây"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700" onClick={() => openEditFor(room)}>
                    <PencilLine size={14} />
                    Edit
                  </button>
                  <Link href={room.rentalRoomId ? `/owner/rental?roomId=${room.rentalRoomId}` : "/owner/rental"} className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                    <Receipt size={14} />
                    Rental Ops
                  </Link>
                  <Link href="/owner/transactions" className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                    <Wallet size={14} />
                    Transactions
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <RoomEditModal open={editOpen} room={selected} onClose={() => setEditOpen(false)} onSave={updateRoom} />
      </div>
    </RBACGuard>
  );
}
