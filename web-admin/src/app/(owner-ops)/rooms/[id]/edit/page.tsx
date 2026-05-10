"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2, Home, Layout, Ruler, Users, CircleDollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import StatusBadge from "@/components/ops/StatusBadge";
import { 
  formatMoney, 
  getFloorFromRoomName, 
  getRoomArea, 
  loadRoom, 
  normalizeRoomStatus, 
  updateRoom,
  RentalRoom
} from "@/lib/rentalOps";

const roomStatuses = [
  { value: "vacant", label: "Còn trống" },
  { value: "occupied", label: "Đang ở" },
  { value: "maintenance", label: "Bảo trì" },
  { value: "reserved", label: "Đã cọc" },
];

export default function EditRoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const facilityId = searchParams.get("facility_id");
  
  const roomQuery = useQuery({ 
    queryKey: ["room", id], 
    queryFn: () => loadRoom(String(id)), 
    staleTime: 60_000 
  });

  const [form, setForm] = useState({
    name: "",
    price: "",
    area: "",
    max_people: "",
    status: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (roomQuery.data) {
      setForm({
        name: roomQuery.data.name || "",
        price: String(roomQuery.data.price || ""),
        area: String(roomQuery.data.area || ""),
        max_people: String(roomQuery.data.max_people || "3"),
        status: roomQuery.data.status || "vacant",
      });
    }
  }, [roomQuery.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateRoom(String(id), {
        name: form.name,
        price: Number(form.price),
        area: Number(form.area),
        max_people: Number(form.max_people),
        status: form.status,
      });
      setToast("Đã cập nhật thông tin phòng thành công!");
      queryClient.invalidateQueries({ queryKey: ["room", id] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setTimeout(() => setToast(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi cập nhật phòng. Vui lòng thử lại!");
    } finally {
      setSaving(false);
    }
  };

  if (roomQuery.isLoading) return <div className="p-8"><LoadingSkeleton rows={10} /></div>;
  if (!roomQuery.data) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700 m-8">Không tìm thấy phòng.</div>;

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={facilityId ? `/owner/boarding-houses/${facilityId}` : "/rooms"} 
          className="group mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 group-hover:bg-indigo-50 transition-colors">
            <ArrowLeft size={16} />
          </div>
          Quay lại danh sách phòng
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-indigo-600">
                <Layout size={12} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Thiết lập phòng</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Chỉnh sửa phòng: {roomQuery.data.name}</h1>
          </div>
          <StatusBadge status={normalizeRoomStatus(roomQuery.data)} />
        </div>
      </div>

      {toast && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 animate-in slide-in-from-top-4">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700 animate-in slide-in-from-top-4">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100">
            <h3 className="mb-6 text-lg font-black text-slate-900 flex items-center gap-2">
              <Home size={20} className="text-indigo-500" />
              Thông tin cơ bản
            </h3>
            
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tên / Số phòng</label>
                <input 
                  className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  required
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <CircleDollarSign size={12} /> Giá thuê (₫)
                  </label>
                  <input 
                    type="number"
                    className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-black text-indigo-600 outline-none ring-2 ring-transparent transition-all focus:ring-indigo-500"
                    value={form.price}
                    onChange={(e) => setForm({...form, price: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Ruler size={12} /> Diện tích (m²)
                  </label>
                  <input 
                    type="number"
                    className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-indigo-500"
                    value={form.area}
                    onChange={(e) => setForm({...form, area: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Users size={12} /> Số người tối đa
                  </label>
                  <input 
                    type="number"
                    className="w-full rounded-2xl border-none bg-slate-50 py-4 px-5 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-indigo-500"
                    value={form.max_people}
                    onChange={(e) => setForm({...form, max_people: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100">
            <h3 className="mb-6 text-lg font-black text-slate-900">Trạng thái</h3>
            <div className="space-y-4">
              {roomStatuses.map((status) => (
                <label 
                  key={status.value} 
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border-2 p-4 transition-all ${form.status === status.value ? "border-indigo-500 bg-indigo-50" : "border-slate-50 bg-slate-50 hover:border-slate-200"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${status.value === 'vacant' ? 'bg-emerald-500' : status.value === 'occupied' ? 'bg-blue-500' : status.value === 'maintenance' ? 'bg-rose-500' : 'bg-orange-500'}`}></div>
                    <span className="text-sm font-bold text-slate-700">{status.label}</span>
                  </div>
                  <input 
                    type="radio" 
                    name="status" 
                    className="hidden" 
                    value={status.value}
                    checked={form.status === status.value}
                    onChange={() => setForm({...form, status: status.value})}
                  />
                  {form.status === status.value && <CheckCircle2 size={16} className="text-indigo-600" />}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button 
              type="button" 
              className="flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 py-4 text-sm font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
            >
              <Trash2 size={18} />
              Xóa phòng
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

