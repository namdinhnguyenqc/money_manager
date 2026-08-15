"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, XCircle, Settings, X, Printer, Check, CalendarPlus } from "lucide-react";
import ConfirmDialog from "@/components/ops/ConfirmDialog";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import StatusBadge from "@/components/ops/StatusBadge";
import { 
  describeServiceType, 
  formatMoney, 
  getServiceUnitLabel, 
  loadContract, 
  loadInvoicesByContract, 
  normalizeInvoiceStatus, 
  terminateContract, 
  updateContract, 
  renewContract, 
  loadServiceConfigs, 
  ServiceConfig,
  loadDepositRefund,
  loadWallets,
  loadTransactionsByContract,
  Wallet
} from "@/lib/rentalOps";
import { calculateProratedRent } from "@/utils/rentCalc";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";

const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function ContractDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const contractQuery = useQuery({ queryKey: ["contracts", id], queryFn: () => loadContract(String(id)), staleTime: 60_000 });
  const invoicesQuery = useQuery({ queryKey: ["contracts", id, "invoices"], queryFn: () => loadInvoicesByContract(String(id)), enabled: Boolean(contractQuery.data), staleTime: 30_000 });
  const refundQuery = useQuery({ queryKey: ["contracts", id, "refund"], queryFn: () => loadDepositRefund(String(id)), enabled: contractQuery.data?.status === "ended", staleTime: 60_000 });
  const transactionsQuery = useQuery({ queryKey: ["contracts", id, "transactions"], queryFn: () => loadTransactionsByContract(String(id)), staleTime: 30_000 });
  
  const contract = contractQuery.data;
  const [refundModalOpen, setRefundModalOpen] = useState(false);


  if (contractQuery.isLoading) return <LoadingSkeleton rows={4} />;
  if (!contract) return <div className="rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không tìm thấy hợp đồng.</div>;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href={contract.facility_id ? `/facilities/${contract.facility_id}?tab=contracts` : "/contracts"} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft size={15} />
        Cơ sở &gt; {contract.facility_id || "Cơ sở"} &gt; Phòng {contract.room_name} &gt; Hợp đồng
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Hợp đồng #{String(contract.id).slice(-6)}</h1>
          <p className="mt-1 text-sm text-slate-500">Phòng {contract.room_name} · Khách thuê {contract.tenant_name}</p>
        </div>
        <StatusBadge status={contract.status} />
      </div>


      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Thông tin khách thuê</h2>
            <button
              type="button"
              disabled={contract.status !== "active"}
              onClick={() => setEditOpen(true)}
              className="rounded-[8px] border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sửa
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Họ tên" value={contract.tenant_name} />
            <Info label="SĐT" value={contract.tenant_phone || "-"} />
            <Info label="CCCD" value={contract.tenant_id_card || "-"} />
            <Info label="Email" value={contract.tenant_email || "-"} />
          </div>
        </section>
        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Điều khoản</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Phòng" value={contract.room_name} />
            <Info label="Thời hạn" value={`${contract.start_date || "-"} → ${contract.end_date || "-"}`} />
            <Info label="Tiền thuê/tháng" value={formatMoney(contract.rent_amount)} />
            <Info label="Tiền cọc" value={formatMoney(contract.deposit_amount)} />
            <Info label="Ngày thu" value={`Ngày ${contract.billing_day || 5} hàng tháng`} />
            <Info label="Số người ở" value={contract.occupant_count ?? "-"} />
          </div>
        </section>
      </div>

      {refundQuery.data && (
        <section className="mt-5 rounded-[8px] border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-blue-900">Thông tin trả cọc</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Info label="Tiền cọc ban đầu" value={formatMoney(refundQuery.data.original_deposit_amount)} />
            <Info label="Số tiền đã trả" value={formatMoney(refundQuery.data.refund_amount)} />
            <Info label="Số tiền khấu trừ" value={formatMoney(refundQuery.data.deduction_amount)} />
            <Info label="Ngày trả" value={refundQuery.data.refund_date} />
            <Info label="Phương thức" value={refundQuery.data.refund_method} />
            <div className="md:col-span-3">
              <Info label="Ghi chú" value={refundQuery.data.note || "Không có ghi chú."} />
            </div>
          </div>
        </section>
      )}

      <section className="mt-5 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Dịch vụ áp dụng</h2>
        <div className="mt-4 space-y-3">
          {(contract.applied_services_snapshot || []).length === 0 ? (
            <div className="text-sm text-slate-500">Hợp đồng này chưa có snapshot dịch vụ. Dữ liệu cũ vẫn được giữ nguyên.</div>
          ) : (
            (contract.applied_services_snapshot || []).map((service) => (
              <div key={`${contract.id}-${service.service_id}`} className="flex items-start justify-between gap-3 rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="font-medium text-slate-900">{service.name}</div>
                  <div className="text-xs text-slate-500">
                    {describeServiceType(service)} · {formatMoney(service.applied_unit_price)}{getServiceUnitLabel(service)}
                  </div>
                </div>
                <div className="text-right text-sm font-semibold text-slate-900">
                  {(() => {
                    const type = String(service.type || "").toLowerCase();
                    if (type === "meter" || type === "metered" || type === "metered_electricity" || type === "metered_water") {
                      return "Tính theo số dùng";
                    }
                    if (service.amount != null && service.amount > 0) {
                      return formatMoney(service.amount);
                    }
                    // Fallback for older contracts where amount wasn't calculated in snapshot
                    const occupantCount = Number(service.occupant_count || contract.occupant_count || 1);
                    const unitPrice = Number(service.applied_unit_price || 0);
                    const calculated = type === "per_person" ? unitPrice * occupantCount : unitPrice;
                    return formatMoney(calculated);
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Hóa đơn của hợp đồng</h2>
          <Link href={`/invoices/new?contract_id=${contract.id}`} className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
            <FileText size={16} />
            Tạo hóa đơn tháng này
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Kỳ", "Tổng", "Trạng thái", "Thao tác"].map((header) => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoicesQuery.isLoading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Đang tải hóa đơn...</td></tr> : null}
              {!invoicesQuery.isLoading && (invoicesQuery.data || []).length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Chưa có hóa đơn cho hợp đồng này.</td></tr> : null}
              {(invoicesQuery.data || []).map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">T{invoice.month}/{invoice.year}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(invoice.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={normalizeInvoiceStatus(invoice)} /></td>
                  <td className="px-4 py-3"><Link href={`/invoices/${invoice.id}`} className="font-semibold text-blue-700">Xem</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Lịch sử thu chi (Phiếu Thu/Chi)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Ngày", "Nội dung", "Số tiền", "Ví"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactionsQuery.isLoading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Đang tải giao dịch...</td></tr> : null}
              {!transactionsQuery.isLoading && (transactionsQuery.data || []).length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Chưa có giao dịch nào cho hợp đồng này.</td></tr> : null}
              {(transactionsQuery.data || []).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{tx.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{tx.description}</td>
                  <td className={`px-4 py-3 font-bold ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatMoney(tx.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{tx.wallet_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          disabled={contract.status !== "active"}
          onClick={() => setRenewOpen(true)}
          className="inline-flex items-center gap-2 rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarPlus size={16} />
          Gia hạn
        </button>
        <button 
          disabled={contract.status !== "active"} 
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Settings size={16} />
          Sửa hợp đồng
        </button>
        <Link 
          href={`/contracts/${id}/print`}
          className="inline-flex items-center gap-2 rounded-[8px] border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          <Printer size={16} />
          Xem bản in
        </Link>
        <button disabled={contract.status === "ended"} onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50">
          <XCircle size={16} />
          Kết thúc hợp đồng
        </button>
      </div>

      {confirmOpen ? (
        <ConfirmDialog
          title="Kết thúc hợp đồng?"
          description="Hệ thống sẽ chuyển sang bước xử lý tiền đặt cọc sau khi bạn xác nhận."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            setRefundModalOpen(true);
          }}
        />
      ) : null}

      {refundModalOpen && contract && (
        <RefundModal
          contract={contract}
          invoices={invoicesQuery.data || []}
          onClose={() => setRefundModalOpen(false)}
          onConfirm={async (data) => {
            await terminateContract(contract, data);
            await invalidateOwnerOpsQueries(queryClient, {
              facilityId: contract.facility_id,
              roomId: contract.room_id,
              contractId: String(id),
            });
            setRefundModalOpen(false);
          }}
        />
      )}

      {editOpen && contract && (
        <EditContractPanel 
          contract={contract} 
          onClose={() => setEditOpen(false)} 
          onSaved={() => {
            setEditOpen(false);
            invalidateOwnerOpsQueries(queryClient, {
              facilityId: contract.facility_id,
              roomId: contract.room_id,
              contractId: String(id),
            });
          }} 
        />
      )}

      {renewOpen && contract && (
        <RenewContractPanel
          contract={contract}
          onClose={() => setRenewOpen(false)}
          onRenewed={() => {
            setRenewOpen(false);
            void invalidateOwnerOpsQueries(queryClient, {
              facilityId: contract.facility_id,
              roomId: contract.room_id,
              contractId: String(id),
            });
          }}
        />
      )}
    </div>
  );
}

/**
 * Extends a running tenancy.
 *
 * Only the three things a renewal can legitimately change are offered: the end
 * date, the rent, and whether to re-agree service prices. Start date, deposit
 * and meter baselines stay put — the tenancy is continuous, and rewriting them
 * would corrupt first-month proration and the meter history invoices are built
 * from. Ending the tenancy is a different action ("Trả phòng") with its own
 * settlement flow.
 */
function RenewContractPanel({ contract, onClose, onRenewed }: { contract: any; onClose: () => void; onRenewed: () => void }) {
  const currentEnd = contract.end_date ? String(contract.end_date).slice(0, 10) : "";

  // Default to one more year from the current end date — the common case — so
  // the owner usually only has to confirm.
  const suggestedEnd = React.useMemo(() => {
    const base = currentEnd ? new Date(currentEnd) : new Date();
    const next = new Date(base.getFullYear() + 1, base.getMonth(), base.getDate());
    return next.toISOString().slice(0, 10);
  }, [currentEnd]);

  const [endDate, setEndDate] = useState(suggestedEnd);
  const [rentAmount, setRentAmount] = useState(String(Number(contract.rent_amount || 0)));
  const [reprice, setReprice] = useState(false);
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    loadServiceConfigs(true).then((data) => setServices(data.filter((s) => s.active !== false))).catch(() => setServices([]));
  }, []);

  const rentChanged = Math.round(Number(rentAmount || 0)) !== Math.round(Number(contract.rent_amount || 0));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!endDate) return setError("Vui lòng chọn ngày kết thúc mới.");
    if (currentEnd && endDate <= currentEnd) {
      return setError(`Ngày kết thúc mới phải sau ${currentEnd}.`);
    }

    setSaving(true);
    try {
      await renewContract(contract.id, {
        endDate,
        rentAmount: rentChanged ? Number(rentAmount || 0) : undefined,
        // Only sent when the owner ticks the box, so an untouched renewal never
        // silently changes prices the tenant already agreed to.
        serviceIds: reprice ? services.map((s) => String(s.id)) : undefined,
      });
      onRenewed();
    } catch (err: any) {
      setError(err?.message || "Không gia hạn được hợp đồng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel title="Gia hạn hợp đồng" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="font-semibold text-slate-900">Phòng {contract.room_name} · {contract.tenant_name}</div>
          <div className="mt-1 text-slate-600">
            Hạn hiện tại: <strong>{currentEnd || "chưa đặt"}</strong>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Gia hạn giữ nguyên ngày bắt đầu, tiền cọc và chỉ số công tơ — đây là thuê liên tục, không phải hợp đồng mới.
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Ngày kết thúc mới *</span>
          <input type="date" className="input" value={endDate} min={currentEnd || undefined} onChange={(e) => setEndDate(e.target.value)} required />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Tiền thuê/tháng</span>
          <input type="number" min={0} className="input" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} />
          {rentChanged ? (
            <span className="mt-1 block text-xs font-medium text-amber-700">
              Thay đổi từ {formatMoney(contract.rent_amount)} → {formatMoney(Number(rentAmount || 0))}
            </span>
          ) : (
            <span className="mt-1 block text-xs text-slate-500">Để nguyên nếu không tăng giá.</span>
          )}
        </label>

        <label className={`flex cursor-pointer items-start gap-3 rounded-[8px] border px-3 py-3 transition-colors ${reprice ? "border-amber-200 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={reprice} onChange={(e) => setReprice(e.target.checked)} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">Cập nhật giá dịch vụ theo bảng giá hiện tại</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-600">
              Không tick: giữ nguyên giá đã thỏa thuận trong hợp đồng. Tick: chốt lại theo {services.length} dịch vụ đang bật.
            </span>
          </span>
        </label>

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        <button disabled={saving} className="w-full rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Đang gia hạn..." : "Xác nhận gia hạn"}
        </button>
      </form>
    </SidePanel>
  );
}

function EditContractPanel({ contract, onClose, onSaved }: { contract: any; onClose: () => void; onSaved: () => void }) {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Array<string>>(
    (contract.applied_services_snapshot || []).map((s: any) => s.service_id)
  );
  
  const [form, setForm] = useState({
    tenantName: contract.tenant_name || "",
    tenantPhone: contract.tenant_phone || "",
    tenantEmail: contract.tenant_email || "",
    tenantIdCard: contract.tenant_id_card || "",
    startDate: contract.start_date || "",
    endDate: contract.end_date || "",
    deposit: String(contract.deposit_amount || 0),
    occupantCount: String(contract.occupant_count || 1),
    note: contract.note || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    loadServiceConfigs(true).then(setServices).catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const tenantPhone = onlyDigits(form.tenantPhone);
    if (!form.tenantName.trim()) {
      setError("Vui lòng nhập họ tên khách thuê.");
      setSaving(false);
      return;
    }
    if (tenantPhone && !/^0\d{9}$/.test(tenantPhone)) {
      setError("Số điện thoại khách thuê phải là số Việt Nam 10 chữ số.");
      setSaving(false);
      return;
    }
    try {
      await updateContract(contract.id, {
        tenantName: form.tenantName.trim(),
        tenantPhone,
        tenantEmail: form.tenantEmail.trim(),
        tenantIdCard: form.tenantIdCard.trim(),
        startDate: form.startDate,
        endDate: form.endDate || null,
        deposit: Number(form.deposit),
        occupantCount: Number(form.occupantCount),
        note: form.note,
        serviceIds: selectedServiceIds
      });
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi cập nhật hợp đồng");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel title="Sửa hợp đồng" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3">
            <div className="text-sm font-semibold text-slate-950">Thông tin khách thuê</div>
            <p className="mt-1 text-xs text-slate-500">Số điện thoại ở đây sẽ được dùng để gửi hóa đơn qua Zalo.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Họ tên khách thuê">
              <input
                className="input"
                value={form.tenantName}
                onChange={(e) => setForm((p) => ({ ...p, tenantName: e.target.value }))}
                required
              />
            </Field>
            <Field label="SĐT">
              <input
                className="input"
                inputMode="numeric"
                placeholder="Ví dụ: 0912345678"
                value={form.tenantPhone}
                onChange={(e) => setForm((p) => ({ ...p, tenantPhone: onlyDigits(e.target.value) }))}
              />
            </Field>
            <Field label="CCCD/CMND">
              <input
                className="input"
                value={form.tenantIdCard}
                onChange={(e) => setForm((p) => ({ ...p, tenantIdCard: e.target.value }))}
              />
            </Field>
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={form.tenantEmail}
                onChange={(e) => setForm((p) => ({ ...p, tenantEmail: e.target.value }))}
              />
            </Field>
          </div>
        </div>
        
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Ngày bắt đầu"><input className="input" type="date" value={form.startDate} onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))} required /></Field>
          <Field label="Ngày kết thúc"><input className="input" type="date" value={form.endDate} onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))} /></Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tiền cọc"><input className="input" type="number" value={form.deposit} onChange={(e) => setForm(p => ({ ...p, deposit: e.target.value }))} required /></Field>
          <Field label="Số người ở"><input className="input" type="number" min={1} value={form.occupantCount} onChange={(e) => setForm(p => ({ ...p, occupantCount: e.target.value }))} required /></Field>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">Dịch vụ áp dụng</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service) => {
              const checked = selectedServiceIds.some((id) => String(id) === String(service.id));
              return (
                <label key={service.id} className="flex items-center gap-3 rounded-[8px] border border-slate-200 bg-white px-3 py-2 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={checked}
                    onChange={(e) => setSelectedServiceIds(prev => e.target.checked ? [...prev, service.id] : prev.filter(id => String(id) !== String(service.id)))}
                  />
                  <div className="text-sm">
                    <div className="font-medium text-slate-900">{service.name}</div>
                    <div className="text-xs text-slate-500">{formatMoney(service.unit_price)}{getServiceUnitLabel(service)}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <Field label="Ghi chú"><textarea className="input min-h-24" value={form.note} onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))} /></Field>
        
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-[8px] border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
          <button disabled={saving} className="flex-[2] rounded-[8px] bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}

function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl relative" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <button onClick={onClose} className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

function RefundModal({ contract, invoices, onClose, onConfirm }: { contract: any; invoices: any[]; onClose: () => void; onConfirm: (data: any) => Promise<void> }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isSettled, setIsSettled] = useState(false);
  const formatDateDDMM = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${d}/${m}`;
  };
  
  // Kiểm tra xem hóa đơn tháng này đã thanh toán chưa
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  
  // Tìm bất kỳ hóa đơn nào của tháng hiện tại hoặc tháng trước (nếu ngày thu tiền lệch) đã thanh toán
  const paidInvoice = invoices?.find(inv => {
    const isPaid = normalizeInvoiceStatus(inv) === "paid";
    const isCurrentMonth = Number(inv.month) === currentMonth && Number(inv.year) === currentYear;
    
    // Nếu ngày trả phòng là đầu tháng (ví dụ ngày 1-5), cũng kiểm tra hóa đơn tháng trước 
    // vì có thể khách đã đóng tiền cho chu kỳ này rồi.
    const isEarlyMonth = today.getDate() <= 5;
    const isLastMonth = isEarlyMonth && 
      (currentMonth === 1 ? (Number(inv.month) === 12 && Number(inv.year) === currentYear - 1) : (Number(inv.month) === currentMonth - 1 && Number(inv.year) === currentYear));

    return isPaid && (isCurrentMonth || isLastMonth);
  });

  const isAlreadyPaid = Boolean(paidInvoice);
  
  // Tính toán thanh lý dự kiến
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const contractStartDate = contract.start_date ? new Date(contract.start_date) : null;
  const prorationStartDate = (contractStartDate && contractStartDate > startOfLastMonth) ? contractStartDate : startOfLastMonth;
  const settlementResult = calculateProratedRent(contract.rent_amount, prorationStartDate, today);
  
  // Nếu đã thanh toán hóa đơn tháng này, tiền trọ khấu trừ = 0
  const actualSettlementAmount = isAlreadyPaid ? 0 : settlementResult.totalAmount;

  const [form, setForm] = useState({
    refundAmount: String(Math.max(0, contract.deposit_amount - actualSettlementAmount)),
    refundDate: today.toISOString().split("T")[0],
    refundMethod: "Tiền mặt",
    note: isAlreadyPaid 
      ? `Thanh lý trả phòng. (Tiền nhà tháng này đã thanh toán xong qua hóa đơn T${currentMonth}/${currentYear}).`
      : `Thanh lý trả phòng. Tiền nhà tháng cuối: ${settlementResult.totalAmount.toLocaleString()} ₫ (${settlementResult.stayedDays} ngày).`,
    walletId: "",
    settlementWalletId: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    loadWallets().then(data => {
      setWallets(data);
      if (data.length > 0) {
        setForm(p => ({ 
          ...p, 
          walletId: data[0].id,
          settlementWalletId: data[0].id
        }));
      }
    }).catch(() => undefined);
  }, []);

  const originalDeposit = Number(contract.deposit_amount || 0);
  const refundAmount = Number(form.refundAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSettled) return setError("Vui lòng xác nhận đã thanh toán xong khoản thanh lý trước khi hoàn tất.");
    
    if (refundAmount > 0 && !form.walletId) {
      return setError("Vui lòng chọn ví để thực hiện hoàn trả tiền cọc.");
    }

    if (actualSettlementAmount > 0 && !form.settlementWalletId) {
      return setError("Vui lòng chọn ví để thu tiền thanh lý.");
    }

    setLoading(true);
    try {
      await onConfirm({
        ...form,
        refundAmount,
        settlementAmount: actualSettlementAmount,
        settlementStatus: 'paid'
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi xử lý trả phòng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidePanel title="Thanh lý & Trả phòng" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bảng tính thanh lý */}
        {isAlreadyPaid ? (
          <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold">
              <Check size={18} />
              THÁNG NÀY ĐÃ THANH TOÁN XONG
            </div>
            <p className="text-sm text-emerald-700">
              Khách đã thanh toán hóa đơn tháng T{currentMonth}/{currentYear}. Hệ thống sẽ không khấu trừ thêm tiền phòng từ tiền cọc.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-blue-100 bg-blue-50/50 p-4">
            <h3 className="mb-3 text-sm font-bold text-blue-800 uppercase tracking-wider">Bảng tính tiền trọ tháng cuối</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Tháng hiện tại ({today.getMonth() + 1}/{today.getFullYear()}):</span>
                <span className="font-semibold text-slate-900">{settlementResult.daysInMonth} ngày thực tế</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1 font-mono bg-white/60 p-2.5 rounded border border-blue-100">
                <span className="text-blue-700 whitespace-nowrap">{formatMoney(contract.rent_amount)} / {settlementResult.daysInMonth} =</span>
                <span className="font-bold text-blue-900 whitespace-nowrap">{formatMoney(settlementResult.dailyRent)}/ngày</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-600">Số ngày ở ({formatDateDDMM(prorationStartDate)} → {formatDateDDMM(today)}):</span>
                <span className="font-bold text-slate-900 whitespace-nowrap">{settlementResult.stayedDays} ngày</span>
              </div>
              <div className="flex justify-between items-center border-t border-blue-200 pt-2 text-base">
                <span className="font-bold text-slate-800">Tiền trọ cuối kỳ:</span>
                <span className="font-bold text-red-600 whitespace-nowrap">{formatMoney(settlementResult.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 rounded-[8px] border border-slate-200 p-3 text-sm">
          <Info label="Tiền cọc ban đầu" value={formatMoney(originalDeposit)} />
          <Info label="Tiền trọ khấu trừ" value={formatMoney(actualSettlementAmount)} />
          <div className="col-span-2 border-t pt-2">
            <Info label="Gợi ý hoàn cọc" value={<span className="text-green-700">{formatMoney(Math.max(0, originalDeposit - actualSettlementAmount))}</span>} />
          </div>
        </div>

        {error && <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
          <input 
            type="checkbox" 
            id="is-settled" 
            checked={isSettled} 
            onChange={(e) => setIsSettled(e.target.checked)}
            className="w-5 h-5 accent-amber-600"
          />
          <label htmlFor="is-settled" className="text-sm font-bold text-amber-900 cursor-pointer">
            Tôi xác nhận khách đã thanh toán xong tiền nhà/điện/nước và các khoản thanh lý.
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ví thu tiền thanh lý (Dịch vụ)">
            <select className="input font-semibold text-blue-700" value={form.settlementWalletId} onChange={(e) => setForm(p => ({ ...p, settlementWalletId: e.target.value }))} required>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatMoney(w.balance || 0)})</option>)}
            </select>
          </Field>
          <Field label="Ví thực hiện hoàn cọc">
            <select className="input font-semibold text-green-700" value={form.walletId} onChange={(e) => setForm(p => ({ ...p, walletId: e.target.value }))} required>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatMoney(w.balance || 0)})</option>)}
            </select>
          </Field>
          <Field label="Thực tế hoàn trả cọc">
            <input className="input font-bold text-green-700" type="number" value={form.refundAmount} onChange={(e) => setForm(p => ({ ...p, refundAmount: e.target.value }))} required />
          </Field>
          <Field label="Ngày thanh lý">
            <input className="input" type="date" value={form.refundDate} onChange={(e) => setForm(p => ({ ...p, refundDate: e.target.value }))} required />
          </Field>
        </div>

        <Field label="Ghi chú thanh lý">
          <textarea className="input min-h-20 text-xs" value={form.note} onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))} />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-[8px] border border-slate-200 py-3 text-sm font-semibold text-slate-700">Hủy</button>
          <button 
            disabled={loading || !isSettled} 
            className={`flex-[2] rounded-[8px] py-3 text-sm font-bold text-white shadow-lg transition-all ${isSettled ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            {loading ? "Đang xử lý..." : "Hoàn tất Trả phòng"}
          </button>
        </div>
      </form>
    </SidePanel>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-950">{value}</div></div>;
}
