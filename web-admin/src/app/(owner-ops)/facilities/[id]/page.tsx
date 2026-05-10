"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import EmptyState from "@/components/ops/EmptyState";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import StatusBadge from "@/components/ops/StatusBadge";
import {
  RentalRoom,
  createOwnerRoom,
  formatMoney,
  getFloorFromRoomName,
  getRoomArea,
  isContractSoonEnding,
  loadBoardingHouse,
  loadContracts,
  loadInvoices,
  loadRentalRooms,
  normalizeInvoiceStatus,
  normalizeRoomStatus,
  roomStatusLabel,
  deleteRoom,
} from "@/lib/rentalOps";

const roomFilters = ["Tất cả", "Trống", "Đang thuê", "Bảo trì", "Sắp hết HĐ"];
const tabIds = ["rooms", "contracts", "invoices", "settings"] as const;

export default function FacilityDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const facilityId = String(params.id);
  const activeTab = tabIds.includes(searchParams.get("tab") as any) ? searchParams.get("tab")! : "rooms";
  const [roomFilter, setRoomFilter] = useState("Tất cả");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({ 
    name: "", 
    price: "", 
    area: "", 
    maxPeople: "2", 
    status: "AVAILABLE" as "AVAILABLE" | "OCCUPIED" | "MAINTENANCE", 
    isPublic: false 
  });
  const [roomFormError, setRoomFormError] = useState("");

  const facilityQuery = useQuery({ queryKey: ["facility", facilityId], queryFn: () => loadBoardingHouse(facilityId), staleTime: 60_000 });
  const roomsQuery = useQuery({ queryKey: ["rooms", { facilityId }], queryFn: () => loadRentalRooms(facilityId), staleTime: 30_000 });
  const contractsQuery = useQuery({ queryKey: ["contracts", { facilityId }], queryFn: () => loadContracts(), staleTime: 30_000 });
  const invoicesQuery = useQuery({ queryKey: ["invoices", { facilityId }], queryFn: () => loadInvoices(facilityId), staleTime: 30_000 });

  const rooms = roomsQuery.data || [];
  const contracts = contractsQuery.data || [];
  const invoices = invoicesQuery.data || [];

  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const status = normalizeRoomStatus(room);
    if (roomFilter === "Trống") return status === "vacant";
    if (roomFilter === "Đang thuê") return status === "occupied";
    if (roomFilter === "Bảo trì") return status === "maintenance";
    if (roomFilter === "Sắp hết HĐ") return status === "expiring_soon";
    return true;
  }), [rooms, roomFilter]);

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    router.replace(`/facilities/${facilityId}?${next.toString()}`);
  };

  const loading = facilityQuery.isLoading || roomsQuery.isLoading;
  const facility = facilityQuery.data;

  const createRoomMutation = useMutation({
    mutationFn: () => {
      if (!roomForm.name.trim()) throw new Error("Vui lòng nhập số phòng.");
      if (Number(roomForm.price || 0) < 0) throw new Error("Giá thuê không hợp lệ.");
      return createOwnerRoom(facilityId, {
        name: roomForm.name.trim(),
        price: Number(roomForm.price || 0),
        area: Number(roomForm.area || 0),
        maxPeople: Number(roomForm.maxPeople || 1),
        status: roomForm.status,
        isPublic: roomForm.isPublic,
      });
    },
    onSuccess: async () => {
      setRoomForm({ name: "", price: "", area: "", maxPeople: "2", status: "AVAILABLE", isPublic: false });
      setRoomFormOpen(false);
      setRoomFormError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["facilities"] }),
        queryClient.invalidateQueries({ queryKey: ["facility", facilityId] }),
      ]);
    },
    onError: (err: any) => setRoomFormError(err?.message || "Không tạo được phòng."),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["facility", facilityId] }),
      ]);
    },
    onError: (err: any) => alert(err?.message || "Không thể xóa phòng."),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-3 text-sm text-slate-500">
        <Link href="/facilities" className="hover:text-blue-700">Cơ sở</Link>
        <span className="px-2">›</span>
        <span className="font-medium text-slate-800">{facility?.name || "Đang tải"}</span>
      </div>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{facility?.name || "Cơ sở"}</h1>
          <p className="mt-1 text-sm text-slate-500">{facility?.address || "Chưa có địa chỉ"}</p>
        </div>
      </div>

      <div className="sticky top-0 z-10 mb-5 rounded-[8px] border border-slate-200 bg-white p-1 shadow-sm">
        <div className="flex gap-1 overflow-x-auto">
          <Tab active={activeTab === "rooms"} onClick={() => setTab("rooms")} label={`Phòng (${rooms.length})`} />
          <Tab active={activeTab === "contracts"} onClick={() => setTab("contracts")} label={`Hợp đồng (${contracts.length})`} />
          <Tab active={activeTab === "invoices"} onClick={() => setTab("invoices")} label={`Hóa đơn (${invoices.length})`} />
          <Tab active={activeTab === "settings"} onClick={() => setTab("settings")} label="Cài đặt" />
        </div>
      </div>

      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && activeTab === "rooms" && (
        <section>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {roomFilters.map((filter) => (
                <button key={filter} onClick={() => setRoomFilter(filter)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${roomFilter === filter ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                  {filter}
                </button>
              ))}
            </div>
            <button onClick={() => setRoomFormOpen((value) => !value)} className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              <Plus size={16} />
              Thêm phòng
            </button>
          </div>

          {roomFormOpen ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setRoomFormError("");
                createRoomMutation.mutate();
              }}
              className="mb-5 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-col gap-1">
                <h2 className="text-base font-semibold text-slate-950">Thêm phòng vào {facility?.name || "cơ sở này"}</h2>
                <p className="text-sm text-slate-500">Phòng mới được tạo trong đúng context cơ sở hiện tại, không cần nhập ID thủ công.</p>
              </div>
              {roomFormError ? <div className="mb-3 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{roomFormError}</div> : null}
              <div className="grid gap-3 md:grid-cols-[1fr_120px_120px_120px_140px]">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Số phòng *</span>
                  <input className="input" value={roomForm.name} onChange={(event) => setRoomForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Phòng 101" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Giá thuê/tháng</span>
                  <input className="input" type="number" min={0} value={roomForm.price} onChange={(event) => setRoomForm((prev) => ({ ...prev, price: event.target.value }))} placeholder="3tr5" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">D.Tích (m²)</span>
                  <input className="input" type="number" min={0} value={roomForm.area} onChange={(event) => setRoomForm((prev) => ({ ...prev, area: event.target.value }))} placeholder="25" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Tối đa</span>
                  <input className="input" type="number" min={1} value={roomForm.maxPeople} onChange={(event) => setRoomForm((prev) => ({ ...prev, maxPeople: event.target.value }))} placeholder="2" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</span>
                  <select className="input" value={roomForm.status} onChange={(event) => setRoomForm((prev) => ({ ...prev, status: event.target.value as any }))}>
                    <option value="AVAILABLE">Trống</option>
                    <option value="OCCUPIED">Đang thuê</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                  <input type="checkbox" checked={roomForm.isPublic} onChange={(event) => setRoomForm((prev) => ({ ...prev, isPublic: event.target.checked }))} />
                  Hiển thị công khai
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRoomFormOpen(false)} className="rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Hủy</button>
                  <button disabled={createRoomMutation.isPending} className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {createRoomMutation.isPending ? "Đang tạo..." : "Tạo phòng"}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {filteredRooms.length === 0 ? <EmptyState message="Không có phòng phù hợp bộ lọc." /> : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filteredRooms.map((room) => {
                const status = normalizeRoomStatus(room);
                return (
                  <div key={room.id} className="rounded-[8px] border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 flex flex-col">
                    <button onClick={() => setSelectedRoomId(room.id)} className="p-4 text-left flex-1 cursor-pointer">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="text-2xl font-bold text-slate-950">{room.name}</div>
                        <StatusBadge status={status} />
                      </div>
                      <div className="space-y-1 text-sm text-slate-600">
                        <div>{getFloorFromRoomName(room.name)} · {getRoomArea(room)} m² · {formatMoney(room.price)}/tháng</div>
                        {status === "occupied" && <div className="text-gray-600">{room.tenant_name || "Khách thuê"}</div>}
                      </div>
                    </button>
                    <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex flex-wrap gap-2 items-center justify-between rounded-b-[8px]">
                      <div className="flex gap-2 flex-1">
                        {["vacant", "reserved"].includes(status) && (
                          <Link href={`/contracts/new?room_id=${room.id}&facility_id=${facilityId}`} className="flex-1 rounded-[6px] bg-blue-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-blue-700">
                            Tạo HĐ
                          </Link>
                        )}
                        <Link href={`/rooms/${room.id}/edit?facility_id=${facilityId}`} className="flex-1 rounded-[6px] border border-slate-300 bg-white px-3 py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Sửa
                        </Link>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (confirm("Bạn có chắc muốn xóa phòng này? Các dữ liệu liên quan có thể bị ảnh hưởng.")) deleteRoomMutation.mutate(room.id); }} 
                        className="rounded-[6px] border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        disabled={deleteRoomMutation.isPending}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!loading && activeTab === "contracts" && (
        <Table
          headers={["Phòng", "Khách thuê", "Bắt đầu", "Kết thúc", "Tiền thuê", "Trạng thái", "Thao tác"]}
          rows={contracts.map((contract) => [
            contract.room_name,
            contract.tenant_name,
            contract.start_date || "-",
            contract.end_date || "Chưa cấu hình",
            formatMoney(contract.rent_amount),
            <StatusBadge key="status" status={contract.status} />,
            <Link key="action" href={`/contracts/${contract.id}`} className="font-semibold text-blue-700">Xem</Link>,
          ])}
          empty="Chưa có hợp đồng."
        />
      )}

      {!loading && activeTab === "invoices" && (
        <Table
          headers={["Phòng", "Khách thuê", "Kỳ", "Tổng tiền", "Trạng thái", "Thao tác"]}
          rows={invoices.map((invoice) => [
            invoice.room_name || `#${invoice.room_id}`,
            invoice.tenant_name || "-",
            `T${invoice.month}/${invoice.year}`,
            formatMoney(invoice.total_amount),
            <StatusBadge key="status" status={normalizeInvoiceStatus(invoice)} />,
            <Link key="action" href={`/invoices/${invoice.id}`} className="font-semibold text-blue-700">Chi tiết</Link>,
          ])}
          empty="Chưa có hóa đơn."
        />
      )}

      {!loading && activeTab === "settings" && (
        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Cài đặt cơ sở</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Tên cơ sở" value={facility?.name || "-"} />
            <Info label="Địa chỉ" value={facility?.address || "-"} />
            <Info label="Trạng thái" value={facility?.status || "-"} />
            <Info label="Công khai" value={facility?.isPublic ? "Có" : "Không"} />
          </div>
        </section>
      )}

      {selectedRoomId && <RoomDetailDrawer roomId={selectedRoomId} facilityId={facilityId} onClose={() => setSelectedRoomId(null)} />}
    </div>
  );
}

function RoomDetailDrawer({ roomId, facilityId, onClose }: { roomId: string; facilityId: string; onClose: () => void }) {
  const roomQuery = useQuery({ queryKey: ["room", roomId], queryFn: async () => (await loadRentalRooms()).find((room) => room.id === roomId) || null, staleTime: 60_000 });
  const contractsQuery = useQuery({ queryKey: ["contracts", "room", roomId], queryFn: loadContracts, staleTime: 30_000 });
  const room = roomQuery.data;
  const history = (contractsQuery.data || []).filter((contract) => contract.room_id === roomId);
  const status = room ? normalizeRoomStatus(room) : "vacant";
  const activeContract = history.find((contract) => contract.status === "active" || contract.status === "expiring_soon");

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/25" onClick={onClose}>
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">{room?.name || "Phòng"}</h2>
              <StatusBadge status={status} />
            </div>
          </div>
          <button onClick={onClose} className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={18} /></button>
        </div>
        {!room ? <LoadingSkeleton rows={3} /> : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-4">
              <Info label="Tầng" value={getFloorFromRoomName(room.name)} />
              <Info label="Diện tích" value={`${getRoomArea(room)} m²`} />
              <Info label="Giá" value={formatMoney(room.price)} />
              <Info label="Mô tả" value={room.has_ac ? "Có máy lạnh" : "Phòng tiêu chuẩn"} />
            </div>
            {activeContract && (
              <section className="mb-5 rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 font-semibold text-slate-950">Hợp đồng hiện tại</div>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <Info label="Khách" value={activeContract.tenant_name} />
                  <Info label="Ngày BĐ" value={activeContract.start_date || "-"} />
                  <Info label="Ngày KT" value={activeContract.end_date || "Chưa cấu hình"} />
                  <Info label="Tiền thuê" value={formatMoney(activeContract.rent_amount)} />
                </div>
                <Link href={`/contracts/${activeContract.id}`} className="mt-4 inline-flex rounded-[8px] bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Xem hợp đồng</Link>
              </section>
            )}
            <details className="mb-5 rounded-[8px] border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-semibold text-slate-950">Lịch sử HĐ</summary>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {history.length === 0 ? "Chưa có lịch sử hợp đồng." : history.map((contract) => <div key={contract.id}>#{contract.id} · {contract.tenant_name} · {contract.start_date || "-"} → {contract.end_date || "..."}</div>)}
              </div>
            </details>
            <div className="flex gap-2">
              {status === "vacant" && <Link href={`/contracts/new?room_id=${room.id}&facility_id=${facilityId}`} className="flex-1 rounded-[8px] bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">Tạo hợp đồng</Link>}
              <Link href={`/rooms/${room.id}/edit?facility_id=${facilityId}`} className="flex-1 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700">Chỉnh sửa phòng</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} className={`min-w-fit rounded-[8px] px-4 py-2.5 text-sm font-semibold ${active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 font-medium text-slate-900">{value}</div></div>;
}

function Table({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">{empty}</td></tr> : rows.map((row, index) => <tr key={index} className="hover:bg-slate-50">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700">{cell}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
