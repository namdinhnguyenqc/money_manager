"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ops/ConfirmDialog";
import Button from "@/components/ui/Button";
import {
  RentalRoom,
  ServiceConfig,
  createContract,
  createTenant,
  describeServiceType,
  formatMoney,
  getServiceCategory,
  getServiceUnitLabel,
  getTenantValidationMessage,
  isContractSoonEnding,
  loadRentalRooms,
  loadServiceConfigs,
  onlyDigits,
  roomStatusMeta,
  deleteContract,
  validateTenantInput,
} from "@/lib/rentalOps";

const filters = ["Tất cả", "Hiệu lực", "Sắp hết", "Đã kết thúc"];

export default function OwnerContractsPage() {
  const [rooms, setRooms] = useState<RentalRoom[]>([]);
  const [filter, setFilter] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDeleteContractId, setConfirmDeleteContractId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRooms(await loadRentalRooms());
    } catch (err: any) {
      setError(err?.message || "Không tải được hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const contracts = useMemo(() => rooms.filter((room) => room.contract_id), [rooms]);
  const rows = useMemo(() => contracts.filter((room) => {
    if (filter === "Hiệu lực") return room.status === "occupied";
    if (filter === "Sắp hết") return isContractSoonEnding(room);
    if (filter === "Đã kết thúc") return room.status !== "occupied";
    return true;
  }), [contracts, filter]);

  const onSaved = async () => {
    setFormOpen(false);
    await load();
    setToast("Đã tạo hợp đồng và cập nhật phòng sang Đang thuê.");
    window.setTimeout(() => setToast(""), 2500);
  };

  const removeContract = (id: string) => setConfirmDeleteContractId(id);

  const confirmRemoveContract = async () => {
    const id = confirmDeleteContractId;
    if (!id) return;
    setConfirmDeleteContractId(null);
    try {
      await deleteContract(id);
      setToast("Đã xóa hợp đồng.");
      window.setTimeout(() => setToast(""), 2500);
      await load();
    } catch (err: any) {
      setError(err?.message || "Không xóa được hợp đồng.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Hợp đồng</p>
          <h1 className="text-2xl font-semibold text-slate-950">Quản lý hợp đồng thuê</h1>
          <p className="mt-1 text-sm text-slate-500">Tạo hợp đồng cho phòng trống và theo dõi trạng thái hợp đồng đang hiệu lực.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
            <RefreshCw size={16} />
            Làm mới
          </button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>Tạo hợp đồng</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${filter === item ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{item}</button>)}
      </div>

      {toast && <div className="mb-4 rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{toast}</div>}
      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Phòng", "Khách thuê", "Ngày bắt đầu", "Ngày kết thúc", "Số tiền thuê/tháng", "Trạng thái", "Thao tác"].map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Đang tải hợp đồng...</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Không có hợp đồng phù hợp.</td></tr> : rows.map((room) => {
                const meta = roomStatusMeta(room.status, isContractSoonEnding(room));
                return (
                  <tr key={room.contract_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{room.name}</td>
                    <td className="px-4 py-3 text-slate-600">{room.tenant_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{room.start_date || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{room.end_date || "Chưa cấu hình"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(room.price)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label === "Đang thuê" ? "Hiệu lực" : meta.label}</span></td>
                    <td className="px-4 py-3 flex items-center gap-4">
                      <Button href={`/contracts/${room.contract_id}`} variant="ghost" size="sm">Xem</Button>
                      <button onClick={() => removeContract(room.contract_id!)} className="text-slate-400 hover:text-red-600 transition-colors" title="Xóa hợp đồng">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && <ContractDrawer rooms={rooms} onClose={() => setFormOpen(false)} onSaved={onSaved} />}
      {confirmDeleteContractId && (
        <ConfirmDialog
          title="Xoá hợp đồng?"
          description="Bạn có chắc chắn muốn xóa hợp đồng này? Thao tác này sẽ giải phóng phòng."
          onConfirm={confirmRemoveContract}
          onCancel={() => setConfirmDeleteContractId(null)}
        />
      )}
    </div>
  );
}

function ContractDrawer({ rooms, onClose, onSaved }: { rooms: RentalRoom[]; onClose: () => void; onSaved: () => void }) {
  const vacantRooms = rooms.filter((room) => room.status !== "occupied");
  const [form, setForm] = useState({
    roomId: String(vacantRooms[0]?.id || ""),
    tenantName: "",
    idCard: "",
    phone: "",
    email: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    deposit: "",
    collectDay: "5",
    elecStart: "0",
    waterStart: "0",
    occupantCount: "1",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const selectedRoom = rooms.find((room) => String(room.id) === form.roomId);

  // Without this the contract is created with an empty service snapshot, and the
  // first invoice then has no prices to derive electricity/water from.
  useEffect(() => {
    let mounted = true;
    loadServiceConfigs(true)
      .then((data) => {
        if (!mounted) return;
        const active = data.filter((service) => service.active !== false);
        setServices(active);
        setSelectedServiceIds(active.map((service) => String(service.id)));
      })
      .catch(() => {
        if (mounted) setServices([]);
      })
      .finally(() => {
        if (mounted) setServicesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const months = form.endDate ? Math.max(1, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000))) : 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!selectedRoom) {
      setError("Vui lòng chọn phòng trống.");
      return;
    }
    const tenantValidation = validateTenantInput({ name: form.tenantName, phone: form.phone, email: form.email, idCard: form.idCard });
    if (!tenantValidation.ok) {
      setError(getTenantValidationMessage(tenantValidation.fieldErrors));
      return;
    }
    setSaving(true);
    try {
      const tenant = await createTenant(tenantValidation.data);
      await createContract({ 
        roomId: selectedRoom.id, 
        tenantId: tenant.id, 
        startDate: form.startDate, 
        endDate: form.endDate || undefined,
        deposit: Number(form.deposit || 0), 
        rentAmount: Number(selectedRoom.price || 0),
        billingDay: Number(form.collectDay || 5),
        electricStart: Number(form.elecStart || 0),
        waterStart: Number(form.waterStart || 0),
        occupantCount: Number(form.occupantCount || selectedRoom.num_people || 1),
        note: form.note || "",
        serviceIds: selectedServiceIds,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Không tạo được hợp đồng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/25" onClick={onClose}>
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">Tạo hợp đồng</h2>
          <button onClick={onClose} className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100">Đóng</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <Field label="Phòng trống">
            <select className="input" value={form.roomId} onChange={(e) => setForm((prev) => ({ ...prev, roomId: e.target.value }))}>
              {vacantRooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {formatMoney(room.price)}</option>)}
            </select>
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Họ tên *"><input className="input" value={form.tenantName} onChange={(e) => setForm((prev) => ({ ...prev, tenantName: e.target.value }))} required /></Field>
            <Field label="CCCD"><input className="input" inputMode="numeric" value={form.idCard} onChange={(e) => setForm((prev) => ({ ...prev, idCard: onlyDigits(e.target.value) }))} /></Field>
            <Field label="SĐT *"><input className="input" inputMode="numeric" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: onlyDigits(e.target.value) }))} required /></Field>
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Ngày bắt đầu"><input className="input" type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} /></Field>
            <Field label="Ngày kết thúc"><input className="input" type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} /></Field>
            <div><div className="mb-1 text-sm font-medium text-slate-700">Số tháng</div><div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold">{months ? `${months} tháng` : "Chưa tính"}</div></div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><div className="mb-1 text-sm font-medium text-slate-700">Tiền thuê/tháng</div><div className="rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold">{formatMoney(selectedRoom?.price)}</div></div>
            <Field label="Tiền cọc"><input className="input" type="number" value={form.deposit} onChange={(e) => setForm((prev) => ({ ...prev, deposit: e.target.value }))} /></Field>
            <Field label="Ngày thu tiền"><input className="input" type="number" min={1} max={28} value={form.collectDay} onChange={(e) => setForm((prev) => ({ ...prev, collectDay: e.target.value }))} /></Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Số người ở trong phòng"><input className="input" type="number" min={1} value={form.occupantCount} onChange={(e) => setForm((prev) => ({ ...prev, occupantCount: e.target.value }))} /></Field>
            <Field label="Điện đầu kỳ"><input className="input" type="number" value={form.elecStart} onChange={(e) => setForm((prev) => ({ ...prev, elecStart: e.target.value }))} /></Field>
            <Field label="Nước đầu kỳ"><input className="input" type="number" value={form.waterStart} onChange={(e) => setForm((prev) => ({ ...prev, waterStart: e.target.value }))} /></Field>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Dịch vụ áp dụng</div>
            {servicesLoading ? (
              <p className="text-sm text-slate-500">Đang tải dịch vụ...</p>
            ) : services.length === 0 ? (
              <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-3">
                <p className="text-sm font-semibold text-amber-900">Chưa cấu hình dịch vụ nào</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Hợp đồng này sẽ chỉ thu tiền phòng. Hóa đơn sẽ không tự tính được tiền điện, nước.
                </p>
                <Link href="/owner/services" className="mt-2 inline-block text-xs font-bold text-blue-700 hover:underline">
                  Tạo bộ dịch vụ mẫu →
                </Link>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map((service) => {
                  const checked = selectedServiceIds.some((id) => String(id) === String(service.id));
                  const category = getServiceCategory(service);
                  const price =
                    category === "electricity" && selectedRoom?.has_ac && Number(service.unit_price_ac || 0) > 0
                      ? Number(service.unit_price_ac || 0)
                      : Number(service.unit_price || 0);
                  return (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${checked ? "border-blue-200 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                        checked={checked}
                        onChange={(event) =>
                          setSelectedServiceIds((prev) =>
                            event.target.checked
                              ? [...prev, String(service.id)]
                              : prev.filter((item) => String(item) !== String(service.id)),
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">{service.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-600">
                          {describeServiceType(service)} · {formatMoney(price)}
                          {getServiceUnitLabel(service)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <Field label="Ghi chú"><textarea className="input min-h-24" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} /></Field>
          <Button type="submit" variant="primary" size="lg" loading={saving} disabled={!form.roomId} className="w-full">Lưu hợp đồng</Button>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}
