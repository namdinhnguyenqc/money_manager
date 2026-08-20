"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Zap, Pencil, Trash2, ToggleLeft, ToggleRight, X, Sparkles, Tag, History } from "lucide-react";
import {
  loadServiceConfigs,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  seedDefaultServices,
  updateServicePrice,
  loadServicePriceHistory,
  describeServiceType,
  formatMoney,
  ServiceConfig,
  ServicePriceHistoryEntry,
} from "@/lib/rentalOps";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select } from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";

const SERVICE_TYPES = [
  { value: "metered", label: "Theo số đo" },
  { value: "per_person", label: "Theo người" },
  { value: "per_room", label: "Theo phòng" },
  { value: "fixed", label: "Cố định" },
] as const;

const SERVICE_ICONS = ["⚡", "💧", "📶", "🗑️", "🅿️", "🏠", "🔧", "📦"];

const typeChipColor: Record<string, string> = {
  metered: "bg-yellow-100 text-yellow-700",
  meter: "bg-yellow-100 text-yellow-700",
  per_person: "bg-blue-100 text-blue-700",
  per_room: "bg-purple-100 text-purple-700",
  fixed: "bg-slate-100 text-slate-600",
};

type ServiceForm = {
  name: string;
  type: "metered" | "per_person" | "per_room" | "fixed";
  unit_price: string;
  unit_price_ac: string;
  unit: string;
  icon: string;
  note: string;
};

const defaultForm = (): ServiceForm => ({
  name: "",
  type: "fixed",
  unit_price: "",
  unit_price_ac: "",
  unit: "",
  icon: "🔧",
  note: "",
});

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ServicesPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceConfig | null>(null);
  const [form, setForm] = useState<ServiceForm>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [priceServiceId, setPriceServiceId] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState({ newUnitPrice: "", newUnitPriceAc: "", effectiveDate: todayStr() });
  const [savingPrice, setSavingPrice] = useState(false);
  const [historyServiceId, setHistoryServiceId] = useState<string | null>(null);

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => loadServiceConfigs(false),
    staleTime: 30_000,
  });

  const services = servicesQuery.data ?? [];

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const { created, skipped } = await seedDefaultServices();
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      if (created === 0) {
        showToast("Bạn đã có đủ các dịch vụ mẫu này rồi.", "info");
      } else {
        showToast(
          skipped > 0
            ? `Đã thêm ${created} dịch vụ mẫu (bỏ qua ${skipped} dịch vụ đã có).`
            : `Đã tạo ${created} dịch vụ mẫu. Bấm sửa để chỉnh giá theo nhà bạn.`,
          "success",
        );
      }
    } catch (err: any) {
      showToast(err?.message || "Không tạo được bộ dịch vụ mẫu.", "error");
    } finally {
      setSeeding(false);
    }
  };

  const openAdd = () => {
    setEditingService(null);
    setForm(defaultForm());
    setFormOpen(true);
  };

  const openEdit = (svc: ServiceConfig) => {
    setEditingService(svc);
    setForm({
      name: svc.name,
      type: (svc.type as ServiceForm["type"]) || "fixed",
      unit_price: String(svc.unit_price || ""),
      unit_price_ac: String(svc.unit_price_ac || ""),
      unit: svc.unit || "",
      icon: svc.icon || "🔧",
      note: svc.note || "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingService(null);
    setForm(defaultForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast("Vui lòng nhập tên dịch vụ.", "error");
    const unitPrice = Number(form.unit_price);
    if (!unitPrice || unitPrice <= 0) return showToast("Vui lòng nhập đơn giá hợp lệ.", "error");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        unit_price: unitPrice,
        unit_price_ac: form.unit_price_ac ? Number(form.unit_price_ac) : undefined,
        unit: form.unit.trim() || undefined,
        icon: form.icon || undefined,
        note: form.note.trim() || undefined,
        active: true,
      };
      if (editingService) {
        await updateService(editingService.id, payload);
        showToast("Đã cập nhật dịch vụ.", "success");
      } else {
        await createService(payload);
        showToast("Đã thêm dịch vụ mới.", "success");
      }
      queryClient.invalidateQueries({ queryKey: ["services"] });
      closeForm();
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi lưu dịch vụ.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (svc: ServiceConfig) => {
    try {
      await toggleServiceStatus(svc.id, !svc.active);
      queryClient.invalidateQueries({ queryKey: ["services"] });
      showToast(svc.active ? "Đã tắt dịch vụ." : "Đã bật dịch vụ.", "success");
    } catch {
      showToast("Lỗi khi thay đổi trạng thái.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteService(id);
      queryClient.invalidateQueries({ queryKey: ["services"] });
      showToast("Đã xóa dịch vụ.", "success");
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi xóa dịch vụ.", "error");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const priceService = services.find((s) => s.id === priceServiceId) || null;

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceService) return;
    const newUnitPrice = Number(priceForm.newUnitPrice);
    if (!newUnitPrice || newUnitPrice <= 0) return showToast("Vui lòng nhập giá mới hợp lệ.", "error");
    setSavingPrice(true);
    try {
      await updateServicePrice(priceService.id, {
        newUnitPrice,
        newUnitPriceAc: priceForm.newUnitPriceAc ? Number(priceForm.newUnitPriceAc) : undefined,
        effectiveDate: priceForm.effectiveDate,
      });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      const isFuture = priceForm.effectiveDate > todayStr();
      showToast(isFuture ? "Đã lên lịch giá mới, sẽ tự áp dụng đúng ngày hiệu lực." : "Đã cập nhật giá dịch vụ.", "success");
      setPriceServiceId(null);
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi cập nhật giá.", "error");
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-in fade-in duration-500">
      <PageHeader
        subtitle="Cấu hình"
        title="Dịch vụ & Phụ phí"
        description="Quản lý các dịch vụ tính phí trong hóa đơn hàng tháng."
        icon={<Zap size={14} />}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={openAdd}>
            Thêm dịch vụ
          </Button>
        }
      />

      {/* Inline form */}
      {formOpen && (
        <Card className="mb-6 p-5 border-blue-200 bg-blue-50/40 animate-in slide-in-from-top-2 duration-300">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              {editingService ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}
            </h3>
            <button onClick={closeForm} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition-colors">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tên dịch vụ *</Label>
                <Input
                  placeholder="Vd: Tiền điện, Tiền nước..."
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Loại tính phí *</Label>
                <Select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ServiceForm["type"] }))}
                >
                  {SERVICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Đơn giá (₫) *</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="3500"
                  value={form.unit_price}
                  onChange={(e) => setForm((p) => ({ ...p, unit_price: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Đơn giá phòng AC (₫, tuỳ chọn)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="4000"
                  value={form.unit_price_ac}
                  onChange={(e) => setForm((p) => ({ ...p, unit_price_ac: e.target.value }))}
                />
              </div>
              <div>
                <Label>Đơn vị (tuỳ chọn)</Label>
                <Input
                  placeholder="kWh, m³, người..."
                  value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                />
              </div>
              <div>
                <Label>Biểu tượng</Label>
                <Select
                  value={form.icon}
                  onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                >
                  {SERVICE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Ghi chú (tuỳ chọn)</Label>
                <Input
                  placeholder="Ghi chú nội bộ về dịch vụ này..."
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={closeForm}>Hủy</Button>
              <Button type="submit" variant="primary" loading={saving} disabled={saving}>
                {editingService ? "Lưu thay đổi" : "Thêm dịch vụ"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Service list */}
      {servicesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-100 bg-white" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Zap size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Chưa có dịch vụ nào</h3>
          <p className="mt-2 text-sm text-slate-500">
            Hóa đơn cần dịch vụ để tính tiền điện, nước, wifi... Tạo nhanh bộ mẫu rồi chỉnh giá theo nhà bạn.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button variant="primary" icon={<Sparkles size={16} />} onClick={handleSeedDefaults} disabled={seeding}>
              {seeding ? "Đang tạo..." : "Tạo bộ dịch vụ mẫu"}
            </Button>
            <Button variant="outline" icon={<Plus size={16} />} onClick={openAdd}>Tự thêm dịch vụ</Button>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Bộ mẫu: điện, nước, wifi, rác, gửi xe — giá tham khảo, sửa được sau khi tạo.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((svc) => (
            <Card key={svc.id} className={`p-5 transition-all ${svc.active === false ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                    {svc.icon || "🔧"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{svc.name}</div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${typeChipColor[svc.type] || typeChipColor.fixed}`}>
                      {describeServiceType(svc)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-base font-bold text-slate-900 whitespace-nowrap">{formatMoney(svc.unit_price)}</div>
                  {svc.unit_price_ac && (
                    <div className="text-xs text-slate-400 whitespace-nowrap">AC: {formatMoney(svc.unit_price_ac)}</div>
                  )}
                  {svc.active === false ? (
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Tắt</span>
                  ) : (
                    <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Đang dùng</span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(svc)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      svc.active === false
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    title={svc.active === false ? "Bật dịch vụ" : "Tắt dịch vụ"}
                  >
                    {svc.active === false ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                    {svc.active === false ? "Bật" : "Tắt"}
                  </button>
                  <button
                    onClick={() => openEdit(svc)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Pencil size={13} /> Sửa
                  </button>
                  <button
                    onClick={() => {
                      setPriceServiceId(svc.id);
                      setPriceForm({ newUnitPrice: String(svc.unit_price || ""), newUnitPriceAc: String(svc.unit_price_ac || ""), effectiveDate: todayStr() });
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <Tag size={13} /> Cập nhật giá
                  </button>
                  <button
                    onClick={() => setHistoryServiceId(svc.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <History size={13} /> Lịch sử giá
                  </button>
                </div>
                <div>
                  {confirmDeleteId === svc.id ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                      <button
                        onClick={() => handleDelete(svc.id)}
                        disabled={deletingId === svc.id}
                        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === svc.id ? "Đang xóa..." : "Xác nhận"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-700"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(svc.id)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Xóa dịch vụ"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {priceService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setPriceServiceId(null); }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="price-update-title" className="w-full max-w-md rounded-[12px] bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="price-update-title" className="text-xl font-bold text-slate-950">Cập nhật giá — {priceService.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Giá hiện tại: {formatMoney(priceService.unit_price)}. Bill cũ giữ nguyên giá cũ, chỉ bill từ kỳ áp dụng mới trở đi dùng giá mới.
                </p>
              </div>
              <button type="button" onClick={() => setPriceServiceId(null)} aria-label="Đóng form" className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <Label>Giá mới (₫) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={priceForm.newUnitPrice}
                  onChange={(e) => setPriceForm((p) => ({ ...p, newUnitPrice: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Giá máy lạnh mới (₫, tuỳ chọn)</Label>
                <Input
                  type="number"
                  min={0}
                  value={priceForm.newUnitPriceAc}
                  onChange={(e) => setPriceForm((p) => ({ ...p, newUnitPriceAc: e.target.value }))}
                />
              </div>
              <div>
                <Label>Ngày áp dụng *</Label>
                <Input
                  type="date"
                  value={priceForm.effectiveDate}
                  onChange={(e) => setPriceForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setPriceServiceId(null)}>Hủy</Button>
                <Button type="submit" variant="primary" loading={savingPrice} disabled={savingPrice}>Lưu giá mới</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyServiceId && (
        <PriceHistoryModal serviceId={historyServiceId} onClose={() => setHistoryServiceId(null)} />
      )}
    </div>
  );
}

function PriceHistoryModal({ serviceId, onClose }: { serviceId: string; onClose: () => void }) {
  const historyQuery = useQuery({
    queryKey: ["service-price-history", serviceId],
    queryFn: () => loadServicePriceHistory(serviceId),
  });
  const history = historyQuery.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="price-history-title" className="w-full max-w-lg rounded-[12px] bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="price-history-title" className="text-xl font-bold text-slate-950">Lịch sử giá</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {historyQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">Đang tải...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">Chưa có lần đổi giá nào.</div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {history.map((h: ServicePriceHistoryEntry) => (
              <div key={h.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 line-through">{formatMoney(h.old_unit_price)}</span>
                  <span className="font-bold text-slate-900">{formatMoney(h.new_unit_price)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Áp dụng từ {h.effective_date}</span>
                  <span className={h.applied ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                    {h.applied ? "Đã áp dụng" : "Chờ áp dụng"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
