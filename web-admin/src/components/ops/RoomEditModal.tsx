"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Trash2, Plus, PauseCircle, PlayCircle } from "lucide-react";
import {
  formatMoney,
  formatMoneyOrFree,
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
} from "@/lib/rentalOps";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input, { Label, Select } from "@/components/ui/Input";
import DataTable from "@/components/ui/DataTable";

const roomStatuses = [
  { value: "vacant", label: "Còn trống" },
  { value: "occupied", label: "Đang ở" },
  { value: "maintenance", label: "Bảo trì" },
  { value: "reserved", label: "Đã cọc" },
];

/**
 * Editing a room used to be a whole separate page, which read as "opening a new
 * tab" when all the owner wanted was to rename a room or fix its price. It is a
 * dialog now; the room-level services that lived on that page keep their own tab
 * rather than being dropped.
 */
export default function RoomEditModal({
  room,
  facilityId,
  onClose,
}: {
  room: RentalRoom;
  facilityId?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<"info" | "services">("info");

  const [form, setForm] = useState({
    name: room.name || "",
    price: String(room.price || ""),
    area: String(room.area || ""),
    max_people: String(room.max_people || "3"),
    status: String(room.status || "vacant"),
    blockId: String((room as any).block_id || ""),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resolvedFacilityId = facilityId || String((room as any).boarding_house_id || "");
  const blocksQuery = useQuery({
    queryKey: ["facility-blocks", resolvedFacilityId],
    queryFn: () => loadFacilityBlocks(resolvedFacilityId),
    enabled: Boolean(resolvedFacilityId),
    staleTime: 30_000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateRoom(String(room.id), {
        name: form.name,
        price: Number(form.price),
        area: Number(form.area),
        max_people: Number(form.max_people),
        status: form.status,
        blockId: form.blockId || null,
      });
      showToast("Đã cập nhật thông tin phòng.", "success");
      await invalidateOwnerOpsQueries(queryClient, { facilityId: resolvedFacilityId, roomId: String(room.id) });
      onClose();
    } catch (err: any) {
      const message = err?.message || "Lỗi khi cập nhật phòng. Vui lòng thử lại!";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-300"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-edit-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-300"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="room-edit-title" className="text-xl font-bold text-slate-900">Phòng {room.name}</h2>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-6 pt-3">
          {([
            { key: "info", label: "Thông tin" },
            { key: "services", label: "Dịch vụ" },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === item.key
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === "info" ? (
            <form id="room-edit-form" onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
              )}
              <div>
                <Label>Tên / Số phòng *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Giá thuê (₫) *</Label>
                  <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div>
                  <Label>Diện tích (m²)</Label>
                  <Input type="number" min={0} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                </div>
                <div>
                  <Label>Số người tối đa</Label>
                  <Input type="number" min={1} value={form.max_people} onChange={(e) => setForm({ ...form, max_people: e.target.value })} />
                </div>
                <div>
                  <Label>Trạng thái</Label>
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {roomStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </div>
              </div>
              {(blocksQuery.data || []).length > 0 && (
                <div>
                  <Label>Dãy trọ <span className="font-normal normal-case text-slate-400">(tùy chọn)</span></Label>
                  <Select value={form.blockId} onChange={(e) => setForm({ ...form, blockId: e.target.value })}>
                    <option value="">Không phân dãy</option>
                    {(blocksQuery.data || []).map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}
                  </Select>
                </div>
              )}
            </form>
          ) : (
            <RoomServicesSection roomId={String(room.id)} />
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Đóng</Button>
          {tab === "info" && (
            <Button type="submit" form="room-edit-form" variant="primary" loading={saving} disabled={saving}>
              Lưu thay đổi
            </Button>
          )}
        </div>
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
      <section>
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
                  <td className="px-4 py-3 text-sm text-slate-600">{formatMoneyOrFree(unitPrice)}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${unitPrice ? "text-slate-900" : "text-emerald-600"}`}>{formatMoneyOrFree(unitPrice * rs.quantity)}</td>
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
      </section>

      <section>
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
      </section>

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
                  {services.map((s: ServiceConfig) => <option key={s.id} value={s.id}>{s.name} ({formatMoneyOrFree(s.unit_price)})</option>)}
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
