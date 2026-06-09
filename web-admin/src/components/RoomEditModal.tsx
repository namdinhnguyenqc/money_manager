"use client";

import React, { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { apiPost } from "@/utils/apiClient";

export type Room = {
  id: string;
  name?: string;
  status?: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  price?: number;
  area?: number;
  maxPeople?: number;
  isPublic?: boolean;
  listingTitle?: string;
  listingDescription?: string;
  imageUrls?: string[];
  amenities?: string[];
  depositAmount?: number;
  availableFrom?: string | null;
  contactPhone?: string;
  contactZalo?: string;
  allowsPets?: boolean;
};

type Props = {
  open: boolean;
  room?: Room | null;
  onClose: () => void;
  onSave: (payload: Partial<Room>) => void;
  inline?: boolean;
};

const amenityOptions = ["WC riêng", "Máy lạnh", "Gác lửng", "Bếp", "Ban công", "Giữ xe", "Wifi", "Camera", "Máy giặt"];

const initialRoom = (room?: Room | null): Room => ({
  id: room?.id ?? "",
  name: room?.name ?? "",
  status: room?.status ?? "AVAILABLE",
  price: Number(room?.price || 0),
  area: Number(room?.area || 0),
  maxPeople: Number(room?.maxPeople || 1),
  isPublic: room?.isPublic ?? false,
  listingTitle: room?.listingTitle ?? "",
  listingDescription: room?.listingDescription ?? "",
  imageUrls: room?.imageUrls ?? [],
  amenities: room?.amenities ?? [],
  depositAmount: Number(room?.depositAmount || 0),
  availableFrom: room?.availableFrom ?? "",
  contactPhone: room?.contactPhone ?? "",
  contactZalo: room?.contactZalo ?? "",
  allowsPets: room?.allowsPets ?? false,
});

export default function RoomEditModal({ open, room, onClose, onSave, inline = false }: Props) {
  const [local, setLocal] = useState<Room>(() => initialRoom(room));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLocal(initialRoom(room));
      setError("");
    }
  }, [open, room]);

  if (!open) return null;

  const save = () => {
    if (local.isPublic && !(local.imageUrls?.length)) {
      setError("Cần ít nhất 1 hình ảnh trước khi đăng tin.");
      return;
    }
    if (local.isPublic && !local.listingTitle?.trim()) {
      setError("Vui lòng nhập tiêu đề tin đăng.");
      return;
    }
    onSave(local);
  };

  const toggleAmenity = (amenity: string) => {
    setLocal((current) => ({
      ...current,
      amenities: current.amenities?.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...(current.amenities || []), amenity],
    }));
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length || !local.id) return;
    const remaining = 6 - (local.imageUrls?.length || 0);
    if (remaining <= 0) return setError("Mỗi phòng tối đa 6 ảnh.");

    setUploading(true);
    setError("");
    try {
      let imageUrls = local.imageUrls || [];
      for (const file of Array.from(files).slice(0, remaining)) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Mỗi ảnh phải nhỏ hơn 5 MB.");
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const response = await apiPost<any>(`/owner/rooms/${local.id}/images`, { dataUrl });
        imageUrls = response?.data?.imageUrls || imageUrls;
        setLocal((current) => ({ ...current, imageUrls }));
      }
    } catch (uploadError: any) {
      setError(uploadError?.message || "Không tải được ảnh.");
    } finally {
      setUploading(false);
    }
  };

  const content = (
      <div className={`w-full rounded-2xl bg-white ${inline ? "border border-slate-200 shadow-xl shadow-slate-100" : "mx-auto my-6 max-w-3xl shadow-2xl"}`}>
        <div className={`${inline ? "" : "sticky top-0 z-10"} flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4`}>
          <div>
            <h3 className="text-lg font-bold text-slate-950">Cập nhật phòng & tin đăng</h3>
            <p className="text-sm text-slate-500">Thông tin nội bộ và nội dung hiển thị trên Tìm phòng.</p>
          </div>
          {!inline && (
            <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="space-y-7 p-6">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section>
            <h4 className="mb-3 font-bold text-slate-900">Thông tin vận hành</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên / số phòng">
                <input className="field" value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
              </Field>
              <Field label="Trạng thái">
                <select className="field" value={local.status} onChange={(e) => setLocal({ ...local, status: e.target.value as Room["status"] })}>
                  <option value="AVAILABLE">Trống</option>
                  <option value="OCCUPIED">Đang thuê</option>
                  <option value="MAINTENANCE">Bảo trì</option>
                </select>
              </Field>
              <Field label="Giá thuê/tháng">
                <input className="field" type="number" min={0} value={local.price} onChange={(e) => setLocal({ ...local, price: Number(e.target.value) })} />
              </Field>
              <Field label="Tiền cọc">
                <input className="field" type="number" min={0} value={local.depositAmount} onChange={(e) => setLocal({ ...local, depositAmount: Number(e.target.value) })} />
              </Field>
              <Field label="Diện tích (m²)">
                <input className="field" type="number" min={0} value={local.area} onChange={(e) => setLocal({ ...local, area: Number(e.target.value) })} />
              </Field>
              <Field label="Số người tối đa">
                <input className="field" type="number" min={1} value={local.maxPeople} onChange={(e) => setLocal({ ...local, maxPeople: Number(e.target.value) })} />
              </Field>
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-bold text-slate-900">Nội dung đăng tìm khách</h4>
            <div className="space-y-4">
              <Field label="Tiêu đề tin">
                <input className="field" maxLength={120} value={local.listingTitle} onChange={(e) => setLocal({ ...local, listingTitle: e.target.value })} placeholder="Phòng có gác, WC riêng gần Đại học..." />
              </Field>
              <Field label="Mô tả">
                <textarea className="field min-h-28 resize-y" maxLength={2000} value={local.listingDescription} onChange={(e) => setLocal({ ...local, listingDescription: e.target.value })} placeholder="Mô tả lối đi, giờ giấc, điện nước và điểm nổi bật..." />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Ngày có thể vào">
                  <input className="field" type="date" value={local.availableFrom || ""} onChange={(e) => setLocal({ ...local, availableFrom: e.target.value })} />
                </Field>
                <Field label="Số điện thoại">
                  <input className="field" value={local.contactPhone} onChange={(e) => setLocal({ ...local, contactPhone: e.target.value })} />
                </Field>
                <Field label="Số Zalo">
                  <input className="field" value={local.contactZalo} onChange={(e) => setLocal({ ...local, contactZalo: e.target.value })} />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-bold text-slate-900">Ảnh phòng</h4>
              <span className="text-xs text-slate-500">{local.imageUrls?.length || 0}/6 ảnh</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {local.imageUrls?.map((url) => (
                <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setLocal({ ...local, imageUrls: local.imageUrls?.filter((item) => item !== url) })} className="absolute right-2 top-2 rounded-full bg-slate-950/70 p-1.5 text-white" aria-label="Xóa ảnh">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(local.imageUrls?.length || 0) < 6 && (
                <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-600">
                  <ImagePlus size={24} />
                  <span className="mt-2">{uploading ? "Đang tải..." : "Thêm ảnh"}</span>
                  <input hidden type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={(e) => uploadImages(e.target.files)} />
                </label>
              )}
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-bold text-slate-900">Tiện ích</h4>
            <div className="flex flex-wrap gap-2">
              {amenityOptions.map((amenity) => (
                <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)} className={`rounded-full border px-3 py-2 text-sm font-semibold ${local.amenities?.includes(amenity) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                  {amenity}
                </button>
              ))}
            </div>
            <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={local.allowsPets} onChange={(e) => setLocal({ ...local, allowsPets: e.target.checked })} />
              Cho phép nuôi thú cưng
            </label>
          </section>

          <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <input className="mt-1" type="checkbox" checked={local.isPublic} onChange={(e) => setLocal({ ...local, isPublic: e.target.checked })} />
            <span>
              <strong className="block text-sm text-blue-950">Đăng phòng lên mục Tìm phòng</strong>
              <span className="text-sm text-blue-700">Chỉ phòng trống và cơ sở đang công khai mới xuất hiện với người tìm thuê.</span>
            </span>
          </label>
        </div>

        <div className={`${inline ? "" : "sticky bottom-0"} flex justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-white px-6 py-4`}>
          {!inline && <button className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={onClose}>Hủy</button>}
          <button className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white" onClick={save}>
            {local.isPublic ? "Đăng tin" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
  );

  return inline ? content : (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Cập nhật phòng">
      {content}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      <style jsx>{`
        .field {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }
        .field:focus {
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 3px rgb(219 234 254);
        }
      `}</style>
    </label>
  );
}
