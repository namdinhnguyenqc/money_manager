"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Edit3, Trash2, Plus, X } from "lucide-react";
import {
  RentalRoom,
  formatMoney,
  getFloorFromRoomName,
  getRoomArea,
  isContractSoonEnding,
  loadRentalRooms,
  loadBoardingHouses,
  roomStatusMeta,
  deleteRoom,
  currentPeriod,
  createOwnerRoom,
} from "@/lib/rentalOps";
import { useQuery } from "@tanstack/react-query";

const roomFilters = ["Tất cả", "Trống", "Đang thuê", "Bảo trì", "Sắp hết HĐ", "Đã cọc"];

export default function AllRoomsPage() {
  const searchParams = useSearchParams();
  const facilityIdFilter = searchParams.get("facility_id") || "";
  const [roomFilter, setRoomFilter] = useState("Tất cả");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const housesQuery = useQuery({ queryKey: ["facilities"], queryFn: loadBoardingHouses, staleTime: 60_000 });
  const roomsQuery = useQuery({ queryKey: ["rooms", "all"], queryFn: () => loadRentalRooms(), staleTime: 30_000 });

  const rooms = roomsQuery.data || [];
  const houses = housesQuery.data || [];
  const currentFacility = facilityIdFilter ? houses.find((h) => h.id === facilityIdFilter) : null;

  const getFacilityName = (room: RentalRoom) => {
    const fid = (room as any).building_id || (room as any).facility_id;
    return houses.find((h) => h.id === fid)?.name || "";
  };

  const getFacilityId = (room: RentalRoom) =>
    (room as any).building_id || (room as any).facility_id || "";

  const filteredRooms = useMemo(() => rooms.filter((room) => {
    // Filter by facility if coming from boarding-houses page
    if (facilityIdFilter) {
      const fid = (room as any).building_id || (room as any).facility_id;
      if (fid !== facilityIdFilter) return false;
    }
    const status = room.status || "vacant";
    if (roomFilter === "Trống") return status !== "occupied" && status !== "maintenance";
    if (roomFilter === "Đang thuê") return status === "occupied";
    if (roomFilter === "Bảo trì") return status === "maintenance";
    if (roomFilter === "Sắp hết HĐ") return isContractSoonEnding(room);
    if (roomFilter === "Đã cọc") return status === "reserved";
    return true;
  }), [rooms, roomFilter, facilityIdFilter]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleDelete = async (room: RentalRoom) => {
    if (!window.confirm(`Xóa phòng ${room.name}? Hành động này không thể hoàn tác.`)) return;
    try {
      await deleteRoom(room.id);
      await roomsQuery.refetch();
      showToast("Đã xóa phòng.");
    } catch (err: any) {
      setError(err?.message || "Không xóa được phòng.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/owner/boarding-houses" className="hover:text-blue-700 font-medium">Cơ sở</Link>
            {facilityIdFilter && currentFacility && (
              <><span className="px-1 text-slate-300">/</span><span className="font-semibold text-slate-900">{currentFacility.name}</span></>
            )}
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Quản lý vận hành</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            {currentFacility ? `${currentFacility.name} — Phòng` : `Tất cả phòng`} <span className="text-slate-400 font-medium text-xl ml-1">({filteredRooms.length})</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {facilityIdFilter && (
            <Link href="/rooms" className="text-sm font-bold text-slate-500 hover:text-blue-600 mr-2 transition-colors">← Tất cả phòng</Link>
          )}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} />
            Thêm phòng mới
          </button>
        </div>
      </div>

      {toast && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 animate-in slide-in-from-top-2">{toast}</div>}
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 animate-in slide-in-from-top-2">{error}</div>}

      <div className="mb-6 flex flex-wrap gap-2">
        {roomFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setRoomFilter(filter)}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${roomFilter === filter ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-100" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
          >
            {filter}
          </button>
        ))}
      </div>

      {roomsQuery.isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
           {[1,2,3,4].map(i => (
             <div key={i} className="h-40 animate-pulse rounded-2xl bg-white border border-slate-100"></div>
           ))}
        </div>
      )}

      {!roomsQuery.isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRooms.map((room) => {
            const meta = roomStatusMeta(room.status, isContractSoonEnding(room), (room as any).is_expired);
            const facilityId = getFacilityId(room);
            const facilityName = getFacilityName(room);

            return (
              <div key={room.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-slate-100 overflow-hidden">
                {!facilityIdFilter && facilityName && (
                  <div className="border-b border-slate-50 bg-slate-50/50 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600">
                    {facilityName}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">{room.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-400">
                        <span>{getFloorFromRoomName(room.name)}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                        <span>{getRoomArea(room)} m²</span>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-tighter ${meta.className}`}>{meta.label}</span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-50 p-3 transition-colors group-hover:bg-blue-50/30">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Giá thuê</div>
                      <div className="mt-0.5 font-black text-slate-900">{formatMoney(room.price)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 transition-colors group-hover:bg-indigo-50/30">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Khách thuê</div>
                      <div className="mt-0.5 font-black text-slate-900 truncate">{room.tenant_name || "Trống"}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-50 bg-slate-50/30 px-5 py-3 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {room.status !== "occupied" && (
                      <Link href={`/contracts/new?room_id=${room.id}&facility_id=${facilityId}`} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        Tạo HĐ
                      </Link>
                    )}
                    {room.status === "occupied" && room.contract_id && (
                      <>
                        <Link href={`/contracts/${room.contract_id}`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all">
                          Xem HĐ
                        </Link>
                        <Link href={`/contracts/${room.contract_id}?action=terminate`} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100 transition-all">
                          Trả phòng
                        </Link>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/rooms/${room.id}/edit?facility_id=${facilityId}`} className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Sửa phòng">
                      <Edit3 size={18} />
                    </Link>
                    <button onClick={() => handleDelete(room)} className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Xóa phòng">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAddModalOpen && (
        <AddRoomModal 
          houses={houses} 
          defaultFacilityId={facilityIdFilter}
          onClose={() => setIsAddModalOpen(false)} 
          onSaved={() => {
            setIsAddModalOpen(false);
            roomsQuery.refetch();
            showToast("Đã thêm phòng mới thành công!");
          }}
        />
      )}
    </div>
  );
}

function AddRoomModal({ houses, defaultFacilityId, onClose, onSaved }: { houses: any[], defaultFacilityId?: string, onClose: () => void, onSaved: () => void }) {
  const [form, setForm] = useState({
    facilityId: defaultFacilityId || (houses.length > 0 ? houses[0].id : ""),
    name: "",
    price: "",
    area: "20",
    maxPeople: "3",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.facilityId) return alert("Vui lòng chọn cơ sở!");
    setSaving(true);
    try {
      await createOwnerRoom(form.facilityId, {
        name: form.name,
        price: Number(form.price),
        area: Number(form.area),
        maxPeople: Number(form.maxPeople),
        status: "AVAILABLE",
      });
      onSaved();
    } catch (err) {
      alert("Lỗi khi thêm phòng. Vui lòng thử lại!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Thêm phòng mới</h2>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Chọn cơ sở (Tòa nhà)</label>
            <select 
              className="w-full rounded-2xl border-none bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500"
              value={form.facilityId}
              onChange={(e) => setForm(p => ({ ...p, facilityId: e.target.value }))}
              required
            >
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Tên / Số phòng</label>
            <input 
              className="w-full rounded-2xl border-none bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500"
              placeholder="Ví dụ: 101, P.202..."
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Giá thuê (đ)</label>
              <input 
                type="number"
                className="w-full rounded-2xl border-none bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500"
                placeholder="2500000"
                value={form.price}
                onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Diện tích (m²)</label>
              <input 
                type="number"
                className="w-full rounded-2xl border-none bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-blue-500"
                value={form.area}
                onChange={(e) => setForm(p => ({ ...p, area: e.target.value }))}
                required
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Xác nhận thêm phòng"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-900">{value}</div>
    </div>
  );
}

