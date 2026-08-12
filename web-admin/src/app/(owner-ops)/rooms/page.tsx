"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import { filterPillActive, filterPillInactive } from "@/components/ui/design-tokens";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import { useToast } from "@/components/ui/Toast";

const roomFilters = ["Tất cả", "Trống", "Đang thuê", "Bảo trì", "Sắp hết HĐ", "Đã cọc"];
const pageSize = 10;

export default function AllRoomsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const facilityIdFilter = searchParams.get("facility_id") || searchParams.get("facilityId") || searchParams.get("buildingId") || searchParams.get("house_id") || "";
  const [roomFilter, setRoomFilter] = useState("Tất cả");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const housesQuery = useQuery({ queryKey: ["facilities"], queryFn: loadBoardingHouses, staleTime: 60_000 });
  const roomsQuery = useQuery({
    queryKey: ["rooms", facilityIdFilter || "all"],
    queryFn: () => loadRentalRooms(facilityIdFilter || undefined),
    staleTime: 30_000,
  });

  const rooms = roomsQuery.data || [];
  const houses = housesQuery.data || [];
  const currentFacility = facilityIdFilter ? houses.find((h) => String(h.id) === String(facilityIdFilter)) : null;

  const getFacilityId = (room: RentalRoom) =>
    String(
      (room as any).building_id ||
        (room as any).facility_id ||
        (room as any).boarding_house_id ||
        (room as any).boardingHouseId ||
        (room as any).house_id ||
        (room as any).houseId ||
        ""
    );

  const getFacilityName = (room: RentalRoom) => {
    const fid = getFacilityId(room);
    return houses.find((h) => String(h.id) === String(fid))?.name || "";
  };

  const filteredRooms = useMemo(() => rooms.filter((room) => {
    // Filter by facility if coming from boarding-houses page
    if (facilityIdFilter) {
      const fid = getFacilityId(room);
      if (fid && String(fid) !== String(facilityIdFilter)) return false;
    }
    const status = String(room.status || "").toLowerCase() || "vacant";
    if (roomFilter === "Trống") return status !== "occupied" && status !== "maintenance";
    if (roomFilter === "Đang thuê") return status === "occupied" || status === "occupied_soon";
    if (roomFilter === "Bảo trì") return status === "maintenance";
    if (roomFilter === "Sắp hết HĐ") return isContractSoonEnding(room);
    if (roomFilter === "Đã cọc") return status === "reserved";
    return true;
  }), [rooms, roomFilter, facilityIdFilter]);
  const visibleRooms = useMemo(() => filteredRooms.slice((page - 1) * pageSize, page * pageSize), [filteredRooms, page]);

  useEffect(() => setPage(1), [roomFilter, facilityIdFilter]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleDelete = async (room: RentalRoom) => {
    if (!window.confirm(`Xóa phòng ${room.name}? Hành động này không thể hoàn tác.`)) return;
    try {
      await deleteRoom(room.id);
      await invalidateOwnerOpsQueries(queryClient, {
        facilityId: getFacilityId(room),
        roomId: room.id,
      });
      showToast("Đã xóa phòng.");
    } catch (err: any) {
      setError(err?.message || "Không xóa được phòng.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Quản lý vận hành"
        title={currentFacility ? `${currentFacility.name} — Phòng` : `Tất cả phòng`}
        description={`${filteredRooms.length} phòng`}
        actions={
          <>
            {facilityIdFilter && (
              <Link href="/rooms" className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">← Tất cả phòng</Link>
            )}
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Thêm phòng mới
            </Button>
          </>
        }
      />

      {toast && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 animate-in slide-in-from-top-2">{toast}</div>}
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 animate-in slide-in-from-top-2">{error}</div>}

      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {roomFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setRoomFilter(filter)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${roomFilter === filter ? filterPillActive : filterPillInactive}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Facility Filter Dropdown */}
        <div className="flex items-center gap-2 min-w-[240px] md:max-w-[320px] w-full md:w-auto">
          <span className="text-xs font-black uppercase text-slate-400 whitespace-nowrap">Cơ sở:</span>
          <select
            value={facilityIdFilter}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                router.push(`/rooms?facility_id=${val}`);
              } else {
                router.push(`/rooms`);
              }
            }}
            className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm cursor-pointer"
          >
            <option value="">— Tất cả cơ sở —</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {roomsQuery.isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
           {[1,2,3,4].map(i => (
             <div key={i} className="h-40 animate-pulse rounded-xl bg-white border border-slate-100"></div>
           ))}
        </div>
      )}

      {!roomsQuery.isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleRooms.map((room) => {
            const meta = roomStatusMeta(room.status, isContractSoonEnding(room), (room as any).is_expired);
            const facilityId = getFacilityId(room);
            const facilityName = getFacilityName(room);

            return (
              <Card key={room.id} hover className="group overflow-hidden">
                {!facilityIdFilter && facilityName && (
                  <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {facilityName}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">{room.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                        <span>{getFloorFromRoomName(room.name)}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                        <span>{getRoomArea(room)} m²</span>
                      </div>
                    </div>
                    <Badge variant={meta.className.includes("green") ? "success" : meta.className.includes("blue") ? "primary" : meta.className.includes("orange") || meta.className.includes("amber") ? "warning" : meta.className.includes("red") ? "danger" : "neutral"}>
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-slate-50 p-3 transition-colors group-hover:bg-blue-50/30">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Giá thuê</div>
                      <div className="mt-0.5 font-bold text-slate-900 whitespace-nowrap">{formatMoney(room.price)}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 transition-colors group-hover:bg-indigo-50/30">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Khách thuê</div>
                      <div className="mt-0.5 font-bold text-slate-900 truncate">{room.tenant_name || "Trống"}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/30 px-5 py-3 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {String(room.status || "").toLowerCase() !== "occupied" && (
                      <>
                        <Link href={`/contracts/new?room_id=${room.id}&facility_id=${facilityId}`}>
                          <Button variant="primary" size="sm">Tạo HĐ</Button>
                        </Link>
                        {String(room.status || "").toLowerCase() !== "reserved" && (
                          <Link href={`/deposits?room_id=${room.id}`}>
                            <Button variant="outline" size="sm">Đặt cọc</Button>
                          </Link>
                        )}
                      </>
                    )}
                    {String(room.status || "").toLowerCase() === "occupied" && room.contract_id && (
                      <>
                        <Link href={`/contracts/${room.contract_id}`}>
                          <Button variant="outline" size="sm">Xem HĐ</Button>
                        </Link>
                        <Link href={`/contracts/${room.contract_id}?action=terminate`}>
                          <Button variant="warning" size="sm">Trả phòng</Button>
                        </Link>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/rooms/${room.id}/edit?facility_id=${facilityId}`} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all" title="Sửa phòng">
                      <Edit3 size={16} />
                    </Link>
                    <button onClick={() => handleDelete(room)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Xóa phòng">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={filteredRooms.length} onPageChange={setPage} />

      {isAddModalOpen && (
        <AddRoomModal 
          houses={houses} 
          defaultFacilityId={facilityIdFilter}
          onClose={() => setIsAddModalOpen(false)} 
          onSaved={() => {
            setIsAddModalOpen(false);
            invalidateOwnerOpsQueries(queryClient, {
              facilityId: facilityIdFilter || undefined,
            });
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
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.facilityId) { showToast("Vui lòng chọn cơ sở!", "error"); return; }
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
      showToast("Lỗi khi thêm phòng. Vui lòng thử lại!", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Thêm phòng mới</h2>
          <button onClick={onClose} className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Chọn cơ sở (Tòa nhà)</Label>
            <Select 
              value={form.facilityId}
              onChange={(e) => setForm(p => ({ ...p, facilityId: e.target.value }))}
              required
            >
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Tên / Số phòng</Label>
            <Input 
              placeholder="Ví dụ: 101, P.202..."
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Giá thuê (đ)</Label>
              <Input 
                type="number"
                placeholder="2500000"
                value={form.price}
                onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Diện tích (m²)</Label>
              <Input 
                type="number"
                value={form.area}
                onChange={(e) => setForm(p => ({ ...p, area: e.target.value }))}
                required
              />
            </div>
          </div>
          <Button 
            type="submit" 
            variant="primary"
            size="lg"
            disabled={saving}
            loading={saving}
            className="w-full"
          >
            {saving ? "Đang lưu..." : "Xác nhận thêm phòng"}
          </Button>
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
