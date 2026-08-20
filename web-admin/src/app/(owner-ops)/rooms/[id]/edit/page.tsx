"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2, Home, Layout, Ruler, Users, CircleDollarSign, CheckCircle2, AlertCircle, Plus, X, PauseCircle, PlayCircle } from "lucide-react";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import StatusBadge from "@/components/ops/StatusBadge";
import {
  formatMoney,
  getFloorFromRoomName,
  getRoomArea,
  loadRoom,
  normalizeRoomStatus,
  updateRoom,
  RentalRoom,
  loadFacilityBlocks,
  loadServiceConfigs,
  loadRoomServices,
  addRoomService,
  updateRoomService,
  loadRoomAdjustments,
  addRoomAdjustment,
  deleteRoomAdjustment,
  ServiceConfig,
  RoomService,
  RoomAdjustment,
} from "@/lib/rentalOps";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import { useToast } from "@/components/ui/Toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input, { Label, Select } from "@/components/ui/Input";
import DataTable from "@/components/ui/DataTable";

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
  const { showToast } = useToast();
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
    blockId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (roomQuery.data) {
      setForm({
        name: roomQuery.data.name || "",
        price: String(roomQuery.data.price || ""),
        area: String(roomQuery.data.area || ""),
        max_people: String(roomQuery.data.max_people || "3"),
        status: roomQuery.data.status || "vacant",
        blockId: (roomQuery.data as any).block_id || "",
      });
    }
  }, [roomQuery.data]);

  const resolvedFacilityId = facilityId || String((roomQuery.data as any)?.boarding_house_id || "");
  const blocksQuery = useQuery({ queryKey: ["facility-blocks", resolvedFacilityId], queryFn: () => loadFacilityBlocks(resolvedFacilityId), enabled: Boolean(resolvedFacilityId), staleTime: 30_000 });

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
        blockId: form.blockId || null,
      });
      showToast("Đã cập nhật thông tin phòng.", "success");
      void invalidateOwnerOpsQueries(queryClient, {
        facilityId,
        roomId: String(id),
      });
    } catch (err: any) {
      const message = err?.message || "Lỗi khi cập nhật phòng. Vui lòng thử lại!";
      setError(message);
      showToast(message, "error");
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
          href="/rooms"
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
            <h1 className="text-xl font-bold leading-7 tracking-[-0.02em] text-slate-950 sm:text-[22px]">Chỉnh sửa phòng: {roomQuery.data.name}</h1>
          </div>
          <StatusBadge status={normalizeRoomStatus(roomQuery.data)} />
        </div>
      </div>

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
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dãy trọ <span className="font-normal normal-case tracking-normal">(tùy chọn)</span></label>
                <select className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900 outline-none ring-2 ring-transparent transition-all focus:ring-indigo-500" value={form.blockId} onChange={(event) => setForm({ ...form, blockId: event.target.value })}>
                  <option value="">Không phân dãy</option>
                  {(blocksQuery.data || []).map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}
                </select>
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

      <div className="mt-8">
        <RoomServicesSection roomId={String(id)} />
      </div>
    </div>
  );
}

function RoomServicesSection({ roomId }: { roomId: string }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({ queryKey: ["services", "activeOnly"], queryFn: () => loadServiceConfigs(true), staleTime: 30_000 });
  const roomServicesQuery = useQuery({ queryKey: ["room-services", roomId], queryFn: () => loadRoomServices(roomId) });
  const adjustmentsQuery = useQuery({ queryKey: ["room-adjustments", roomId], queryFn: () => loadRoomAdjustments(roomId) });

  const services = servicesQuery.data ?? [];
  const roomServices = roomServicesQuery.data ?? [];
  const pendingAdjustments = (adjustmentsQuery.data ?? []).filter((a) => !a.invoice_id);

  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ serviceId: "", quantity: "1", customUnitPrice: "", startDate: new Date().toISOString().slice(0, 10) });
  const [savingService, setSavingService] = useState(false);

  const [addFeeOpen, setAddFeeOpen] = useState(false);
  const now = new Date();
  const [feeForm, setFeeForm] = useState({ label: "", amount: "", periodMonth: String(now.getMonth() + 1), periodYear: String(now.getFullYear()), note: "" });
  const [savingFee, setSavingFee] = useState(false);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.serviceId) return showToast("Vui lòng chọn dịch vụ.", "error");
    setSavingService(true);
    try {
      await addRoomService(roomId, {
        serviceId: serviceForm.serviceId,
        quantity: Number(serviceForm.quantity) || 1,
        customUnitPrice: serviceForm.customUnitPrice ? Number(serviceForm.customUnitPrice) : undefined,
        startDate: serviceForm.startDate,
      });
      queryClient.invalidateQueries({ queryKey: ["room-services", roomId] });
      showToast("Đã thêm dịch vụ vào phòng.", "success");
      setAddServiceOpen(false);
      setServiceForm({ serviceId: "", quantity: "1", customUnitPrice: "", startDate: new Date().toISOString().slice(0, 10) });
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi thêm dịch vụ.", "error");
    } finally {
      setSavingService(false);
    }
  };

  const handleToggleService = async (rs: RoomService) => {
    try {
      await updateRoomService(rs.id, { status: rs.status === "active" ? "inactive" : "active" });
      queryClient.invalidateQueries({ queryKey: ["room-services", roomId] });
      showToast(rs.status === "active" ? "Đã ngưng dịch vụ." : "Đã bật lại dịch vụ.", "success");
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi cập nhật.", "error");
    }
  };

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(feeForm.amount);
    if (!feeForm.label.trim()) return showToast("Vui lòng nhập nội dung.", "error");
    if (!amount || amount <= 0) return showToast("Vui lòng nhập số tiền hợp lệ.", "error");
    setSavingFee(true);
    try {
      await addRoomAdjustment(roomId, {
        label: feeForm.label.trim(),
        amount,
        periodMonth: Number(feeForm.periodMonth),
        periodYear: Number(feeForm.periodYear),
        note: feeForm.note.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["room-adjustments", roomId] });
      showToast("Đã thêm phí phát sinh, sẽ tự động gộp vào hóa đơn đúng kỳ.", "success");
      setAddFeeOpen(false);
      setFeeForm({ label: "", amount: "", periodMonth: String(now.getMonth() + 1), periodYear: String(now.getFullYear()), note: "" });
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi thêm phí phát sinh.", "error");
    } finally {
      setSavingFee(false);
    }
  };

  const handleDeleteFee = async (id: string) => {
    if (!confirm("Xóa khoản phí phát sinh này?")) return;
    try {
      await deleteRoomAdjustment(id);
      queryClient.invalidateQueries({ queryKey: ["room-adjustments", roomId] });
      showToast("Đã xóa khoản phí.", "success");
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi xóa.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Dịch vụ đang sử dụng</h3>
          <Button type="button" size="sm" icon={<Plus size={14} />} onClick={() => setAddServiceOpen(true)}>Thêm dịch vụ</Button>
        </div>
        {roomServicesQuery.isLoading ? (
          <div className="py-6 text-sm text-slate-400">Đang tải...</div>
        ) : roomServices.length === 0 ? (
          <div className="py-6 text-sm text-slate-400">Chưa gán dịch vụ nào cho phòng này.</div>
        ) : (
          <DataTable headers={["Dịch vụ", "SL", "Đơn giá", "Thành tiền", "Ngày bắt đầu", "Trạng thái", ""]}>
            {roomServices.map((rs) => {
              const unitPrice = rs.custom_unit_price != null ? rs.custom_unit_price : Number(rs.services?.unit_price || 0);
              return (
                <tr key={rs.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{rs.services?.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{rs.quantity}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatMoney(unitPrice)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{formatMoney(unitPrice * rs.quantity)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{rs.start_date}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rs.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {rs.status === "active" ? "Đang dùng" : "Đã ngưng"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleService(rs)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      {rs.status === "active" ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                      {rs.status === "active" ? "Ngưng" : "Bật lại"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Phí phát sinh theo kỳ</h3>
          <Button type="button" size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setAddFeeOpen(true)}>Thêm phí phát sinh</Button>
        </div>
        {adjustmentsQuery.isLoading ? (
          <div className="py-6 text-sm text-slate-400">Đang tải...</div>
        ) : pendingAdjustments.length === 0 ? (
          <div className="py-6 text-sm text-slate-400">Chưa có khoản phí phát sinh nào chờ lên hóa đơn.</div>
        ) : (
          <DataTable headers={["Nội dung", "Số tiền", "Kỳ áp dụng", "Ghi chú", ""]}>
            {pendingAdjustments.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{a.label}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-900">{formatMoney(a.amount)}</td>
                <td className="px-4 py-3 text-sm text-slate-500">T{a.period_month}/{a.period_year}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{a.note || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDeleteFee(a.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>

      {addServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setAddServiceOpen(false); }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[12px] bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-950">Thêm dịch vụ vào phòng</h2>
              <button type="button" onClick={() => setAddServiceOpen(false)} aria-label="Đóng" className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <Label>Dịch vụ *</Label>
                <Select value={serviceForm.serviceId} onChange={(e) => setServiceForm((p) => ({ ...p, serviceId: e.target.value }))} required>
                  <option value="">-- Chọn dịch vụ --</option>
                  {services.map((s: ServiceConfig) => <option key={s.id} value={s.id}>{s.name} ({formatMoney(s.unit_price)})</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Số lượng</Label>
                  <Input type="number" min={0.01} value={serviceForm.quantity} onChange={(e) => setServiceForm((p) => ({ ...p, quantity: e.target.value }))} />
                </div>
                <div>
                  <Label>Giá riêng (₫, tuỳ chọn)</Label>
                  <Input type="number" min={0} placeholder="Dùng giá dịch vụ" value={serviceForm.customUnitPrice} onChange={(e) => setServiceForm((p) => ({ ...p, customUnitPrice: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Ngày bắt đầu áp dụng</Label>
                <Input type="date" value={serviceForm.startDate} onChange={(e) => setServiceForm((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setAddServiceOpen(false)}>Hủy</Button>
                <Button type="submit" loading={savingService} disabled={savingService}>Thêm dịch vụ</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addFeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setAddFeeOpen(false); }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[12px] bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-950">Thêm phí phát sinh</h2>
              <button type="button" onClick={() => setAddFeeOpen(false)} aria-label="Đóng" className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddFee} className="space-y-4">
              <div>
                <Label>Nội dung *</Label>
                <Input placeholder="Vd: Sửa khóa, vệ sinh máy lạnh..." value={feeForm.label} onChange={(e) => setFeeForm((p) => ({ ...p, label: e.target.value }))} required />
              </div>
              <div>
                <Label>Số tiền (₫) *</Label>
                <Input type="number" min={0} value={feeForm.amount} onChange={(e) => setFeeForm((p) => ({ ...p, amount: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tháng áp dụng</Label>
                  <Input type="number" min={1} max={12} value={feeForm.periodMonth} onChange={(e) => setFeeForm((p) => ({ ...p, periodMonth: e.target.value }))} />
                </div>
                <div>
                  <Label>Năm áp dụng</Label>
                  <Input type="number" min={2000} value={feeForm.periodYear} onChange={(e) => setFeeForm((p) => ({ ...p, periodYear: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Ghi chú (tuỳ chọn)</Label>
                <Input value={feeForm.note} onChange={(e) => setFeeForm((p) => ({ ...p, note: e.target.value }))} />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setAddFeeOpen(false)}>Hủy</Button>
                <Button type="submit" loading={savingFee} disabled={savingFee}>Thêm phí</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
