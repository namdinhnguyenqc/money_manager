"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Edit3, ImagePlus, Trash2, Plus, X } from "lucide-react";
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
  uploadOwnerRoomImage,
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

const roomFilters = ["Tất cả", "Trống", "Đang thuê", "Bảo trì", "Sắp hết HĐ", "Đã cọc"];
const pageSize = 10;

export default function AllRoomsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const facilityIdFilter = searchParams.get("facility_id") || "";
  const [roomFilter, setRoomFilter] = useState("Tất cả");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [page, setPage] = useState(1);

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
        breadcrumb={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/owner/boarding-houses" className="hover:text-blue-700 font-medium">Cơ sở</Link>
            {facilityIdFilter && currentFacility && (
              <><span className="px-1 text-slate-300">/</span><span className="font-semibold text-slate-900">{currentFacility.name}</span></>
            )}
          </div>
        }
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

      <div className="mb-6 flex flex-wrap gap-2">
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
    status: "vacant",
    depositAmount: "",
    listingTitle: "",
    listingDescription: "",
    contactPhone: "",
    contactZalo: "",
    amenities: [] as string[],
    allowsPets: false,
    isPublic: false,
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageError, setImageError] = useState("");
  const [saving, setSaving] = useState(false);
  const amenityOptions = ["WC riêng", "Máy lạnh", "Gác lửng", "Bếp", "Ban công", "Giữ xe", "Wifi", "Camera", "Máy giặt"];

  const uploadImageFile = async (roomId: string, file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await uploadOwnerRoomImage(roomId, dataUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.facilityId || !form.name.trim() || !form.price || !form.area || !form.maxPeople || !form.status) {
      return alert("Vui lòng nhập đầy đủ thông tin phòng.");
    }
    if (form.isPublic && imageFiles.length === 0) return alert("Đăng tin cần ít nhất 1 hình phòng.");
    if (form.isPublic && !form.listingTitle.trim()) return alert("Đăng tin cần tiêu đề tin.");
    setSaving(true);
    try {
      const room = await createOwnerRoom(form.facilityId, {
        name: form.name,
        price: Number(form.price),
        area: Number(form.area),
        maxPeople: Number(form.maxPeople),
        status: form.status === "occupied" ? "OCCUPIED" : form.status === "maintenance" ? "MAINTENANCE" : "AVAILABLE",
        isPublic: form.isPublic,
        listingTitle: form.listingTitle.trim(),
        listingDescription: form.listingDescription.trim(),
        depositAmount: Number(form.depositAmount || 0),
        contactPhone: form.contactPhone.trim(),
        contactZalo: form.contactZalo.trim(),
        amenities: form.amenities,
        allowsPets: form.allowsPets,
      });
      for (const file of imageFiles) {
        await uploadImageFile(room.id, file);
      }
      onSaved();
    } catch (err: any) {
      alert(err?.message || "Lỗi khi thêm phòng. Vui lòng thử lại!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300">
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" checked={form.isPublic} onChange={(e) => setForm(p => ({ ...p, isPublic: e.target.checked }))} />
              <span>
                <span className="block text-sm font-bold text-slate-900">Đăng tin tìm khách ngay</span>
                <span className="text-xs text-slate-500">Bật mục này để nhập đủ ảnh, tiện ích và thông tin liên hệ ngay khi tạo phòng.</span>
              </span>
            </label>
          </div>
          {form.isPublic && (
            <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div>
                <Label>Tiêu đề tin đăng *</Label>
                <Input value={form.listingTitle} onChange={(e) => setForm(p => ({ ...p, listingTitle: e.target.value }))} placeholder="Phòng có gác, WC riêng gần trường..." required />
              </div>
              <div>
                <Label>Mô tả</Label>
                <textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={form.listingDescription} onChange={(e) => setForm(p => ({ ...p, listingDescription: e.target.value }))} placeholder="Mô tả lối đi, giờ giấc, điện nước..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tiền cọc</Label>
                  <Input type="number" min={0} value={form.depositAmount} onChange={(e) => setForm(p => ({ ...p, depositAmount: e.target.value }))} />
                </div>
                <div>
                  <Label>Điện thoại</Label>
                  <Input value={form.contactPhone} onChange={(e) => setForm(p => ({ ...p, contactPhone: e.target.value }))} />
                </div>
                <div>
                  <Label>Zalo</Label>
                  <Input value={form.contactZalo} onChange={(e) => setForm(p => ({ ...p, contactZalo: e.target.value }))} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Ảnh phòng *</Label>
                  <span className="text-xs text-slate-500">{imageFiles.length}/6 ảnh</span>
                </div>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-6 text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600">
                  <ImagePlus size={22} />
                  <span className="mt-2">Chọn ảnh phòng</span>
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const valid = files.filter((file) => file.size <= 5 * 1024 * 1024).slice(0, 6);
                      setImageFiles(valid);
                      setImageError(files.length !== valid.length ? "Mỗi ảnh nhỏ hơn 5 MB, tối đa 6 ảnh." : "");
                    }}
                  />
                </label>
                {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
                {imageFiles.length > 0 && <p className="mt-2 text-xs text-slate-600">{imageFiles.map((file) => file.name).join(", ")}</p>}
              </div>
              <div>
                <Label>Tiện ích</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {amenityOptions.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => setForm(p => ({
                        ...p,
                        amenities: p.amenities.includes(amenity) ? p.amenities.filter((item) => item !== amenity) : [...p.amenities, amenity],
                      }))}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold ${form.amenities.includes(amenity) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={form.allowsPets} onChange={(e) => setForm(p => ({ ...p, allowsPets: e.target.checked }))} />
                  Cho phép nuôi thú cưng
                </label>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Số người tối đa</Label>
              <Input
                type="number"
                min={1}
                value={form.maxPeople}
                onChange={(e) => setForm(p => ({ ...p, maxPeople: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select
                value={form.status}
                onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
                required
              >
                <option value="vacant">Còn trống</option>
                <option value="occupied">Đang ở</option>
                <option value="maintenance">Bảo trì</option>
              </Select>
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
