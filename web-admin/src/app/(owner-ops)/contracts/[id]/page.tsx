"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, XCircle, Settings, X, Printer, CalendarPlus } from "lucide-react";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import StatusBadge from "@/components/ops/StatusBadge";
import { 
  describeServiceType,
  formatMoney,
  formatMoneyOrFree,
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
  loadCheckoutPreview,
  CheckoutPreview,
  loadTransactionsByContract,
  Wallet
} from "@/lib/rentalOps";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";

const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function ContractDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const contractQuery = useQuery({ queryKey: ["contracts", id], queryFn: () => loadContract(String(id)), staleTime: 60_000 });
  const invoicesQuery = useQuery({ queryKey: ["contracts", id, "invoices"], queryFn: () => loadInvoicesByContract(String(id)), enabled: Boolean(contractQuery.data), staleTime: 30_000 });
  const refundQuery = useQuery({ queryKey: ["contracts", id, "refund"], queryFn: () => loadDepositRefund(String(id)), enabled: contractQuery.data?.status === "ended", staleTime: 60_000 });
  const transactionsQuery = useQuery({ queryKey: ["contracts", id, "transactions"], queryFn: () => loadTransactionsByContract(String(id)), staleTime: 30_000 });
  
  const contract = contractQuery.data;
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  // "Trả phòng" in the room and tenant menus links here with ?action=terminate.
  const contractStatus = contract?.status;
  React.useEffect(() => {
    if (!contractStatus || contractStatus === "ended") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") !== "terminate") return;
    setRefundModalOpen(true);
    params.delete("action");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [contractStatus]);


  if (contractQuery.isLoading) return <LoadingSkeleton rows={4} />;
  if (!contract) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không tìm thấy hợp đồng.</div>;

  return (
    <PageContainer width="wide">
      <PageHeader
        title={`Hợp đồng #${String(contract.id).slice(-6)}`}
        description={`Phòng ${contract.room_name} · Khách thuê ${contract.tenant_name}`}
        breadcrumb={
          <Link href={contract.facility_id ? `/facilities/${contract.facility_id}?tab=contracts` : "/contracts"} className="inline-flex items-center gap-2 font-medium text-slate-500 hover:text-blue-700">
            <ArrowLeft size={15} />
            Cơ sở &gt; {contract.facility_id || "Cơ sở"} &gt; Phòng {contract.room_name} &gt; Hợp đồng
          </Link>
        }
        actions={<StatusBadge status={contract.status} />}
      />


      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Thông tin khách thuê</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={contract.status !== "active"}
              onClick={() => setEditOpen(true)}
            >
              Sửa
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Họ tên" value={contract.tenant_name} />
            <Info label="SĐT" value={contract.tenant_phone || "-"} />
            <Info label="CCCD" value={contract.tenant_id_card || "-"} />
            <Info label="Email" value={contract.tenant_email || "-"} />
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
        <section className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm">
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

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Dịch vụ áp dụng</h2>
        <div className="mt-4 space-y-3">
          {(contract.applied_services_snapshot || []).length === 0 ? (
            <div className="text-sm text-slate-500">Hợp đồng này chưa có snapshot dịch vụ. Dữ liệu cũ vẫn được giữ nguyên.</div>
          ) : (
            (contract.applied_services_snapshot || []).map((service) => (
              <div key={`${contract.id}-${service.service_id}`} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
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

      <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Hóa đơn của hợp đồng</h2>
          <Link href={`/invoices/new?contract_id=${contract.id}`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
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

      <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
        <Button
          variant="primary"
          disabled={contract.status !== "active"}
          onClick={() => setRenewOpen(true)}
          icon={<CalendarPlus size={16} />}
        >
          Gia hạn
        </Button>
        <Button
          variant="outline"
          disabled={contract.status !== "active"}
          onClick={() => setEditOpen(true)}
          icon={<Settings size={16} />}
        >
          Sửa hợp đồng
        </Button>
        <Button href={`/contracts/${id}/print`} variant="outline" icon={<Printer size={16} />}>
          Xem bản in
        </Button>
        <Button
          variant="danger-ghost"
          className="border border-red-200 bg-red-50"
          disabled={contract.status === "ended"}
          onClick={() => setRefundModalOpen(true)}
          icon={<XCircle size={16} />}
        >
          Trả phòng
        </Button>
      </div>

      {refundModalOpen && contract && (
        <RefundModal
          contract={contract}
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
    </PageContainer>
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
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

        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${reprice ? "border-amber-200 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={reprice} onChange={(e) => setReprice(e.target.checked)} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">Cập nhật giá dịch vụ theo bảng giá hiện tại</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-600">
              Không tick: giữ nguyên giá đã thỏa thuận trong hợp đồng. Tick: chốt lại theo {services.length} dịch vụ đang bật.
            </span>
          </span>
        </label>

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        <Button type="submit" variant="primary" className="w-full" loading={saving}>
          {saving ? "Đang gia hạn..." : "Xác nhận gia hạn"}
        </Button>
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
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
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

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">Dịch vụ áp dụng</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service) => {
              const checked = selectedServiceIds.some((id) => String(id) === String(service.id));
              return (
                <label key={service.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={checked}
                    onChange={(e) => setSelectedServiceIds(prev => e.target.checked ? [...prev, service.id] : prev.filter(id => String(id) !== String(service.id)))}
                  />
                  <div className="text-sm">
                    <div className="font-medium text-slate-900">{service.name}</div>
                    <div className="text-xs text-slate-500">{formatMoneyOrFree(service.unit_price)}{service.unit_price ? getServiceUnitLabel(service) : ""}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <Field label="Ghi chú"><textarea className="input min-h-24" value={form.note} onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))} /></Field>
        
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="primary" className="flex-[2]" loading={saving}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}

function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl relative" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Đóng" icon={<X size={18} />} />
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

type ExtraCharge = { id: number; name: string; amount: string; checked: boolean };

function RefundModal({ contract, onClose, onConfirm }: { contract: any; onClose: () => void; onConfirm: (data: any) => Promise<void> }) {
  const todayIso = new Date().toISOString().split("T")[0];
  const [moveOutDate, setMoveOutDate] = useState(todayIso);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState("");
  const [refundMethod, setRefundMethod] = useState("Tiền mặt");
  const [note, setNote] = useState("");
  const [unchecked, setUnchecked] = useState<Record<string, boolean>>({});
  const [elecNew, setElecNew] = useState("");
  const [waterNew, setWaterNew] = useState("");
  const [extras, setExtras] = useState<ExtraCharge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    loadWallets().then((data) => {
      setWallets(data);
      if (data.length > 0) setWalletId(data[0].id);
    }).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setPreviewError("");
    loadCheckoutPreview(String(contract.id), moveOutDate)
      .then((data) => { if (!cancelled) setPreview(data); })
      .catch((err: any) => { if (!cancelled) setPreviewError(err?.message || "Không tính được chi phí trả phòng."); });
    return () => { cancelled = true; };
  }, [contract.id, moveOutDate]);

  const isOn = (key: string) => !unchecked[key];
  const toggle = (key: string) => setUnchecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const meterLine = (key: "electricity" | "water", reading: string) => {
    const meter = preview?.meters[key];
    if (!meter) return null;
    const hasReading = reading.trim() !== "";
    const usage = hasReading ? Number(reading) - meter.lastReading : 0;
    return { meter, hasReading, usage, invalid: hasReading && usage < 0, amount: hasReading && usage > 0 ? Math.round(usage * meter.unitPrice) : 0 };
  };
  const elec = meterLine("electricity", elecNew);
  const water = meterLine("water", waterNew);

  const lines: { key: string; label: string; amount: number }[] = [];
  if (preview) {
    if (!preview.rent.alreadyInvoiced && preview.rent.amount > 0) {
      lines.push({ key: "rent", label: `Tiền phòng ${preview.rent.stayedDays}/${preview.rent.daysInMonth} ngày`, amount: preview.rent.amount });
    }
    if (elec) lines.push({ key: "electricity", label: `${elec.meter.name} (${Math.max(0, elec.usage)} ${elec.meter.unit})`, amount: elec.amount });
    if (water) lines.push({ key: "water", label: `${water.meter.name} (${Math.max(0, water.usage)} ${water.meter.unit})`, amount: water.amount });
    preview.fixedServices.forEach((service, index) => lines.push({ key: `service-${index}`, label: `${service.name} (tính theo ngày ở)`, amount: service.amount }));
    preview.unpaidInvoices.forEach((inv) => lines.push({ key: `invoice-${inv.id}`, label: `Hóa đơn T${inv.month}/${inv.year} còn nợ`, amount: inv.remaining }));
  }
  extras.forEach((extra) => lines.push({ key: `extra-${extra.id}`, label: extra.name.trim() || "Chi phí phát sinh", amount: Math.max(0, Math.round(Number(extra.amount || 0))) }));

  const extraOn = (extra: ExtraCharge) => extra.checked;
  const charged = lines.filter((line) => (line.key.startsWith("extra-") ? extraOn(extras.find((e) => `extra-${e.id}` === line.key)!) : isOn(line.key)));
  const totalCharges = charged.reduce((sum, line) => sum + line.amount, 0);
  const deposit = Number(preview?.deposit ?? contract.deposit_amount ?? 0);
  const balance = totalCharges - deposit;
  const refundToTenant = balance < 0 ? -balance : 0;
  const tenantPays = balance > 0 ? balance : 0;
  const moneyMoves = totalCharges > 0 || refundToTenant > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!preview) return setError("Chưa tính xong chi phí cho ngày trả phòng này.");
    for (const [line, reading, label] of [[elec, elecNew, "điện"], [water, waterNew, "nước"]] as const) {
      const key = label === "điện" ? "electricity" : "water";
      if (!line || !isOn(key)) continue;
      if (!line.hasReading) return setError(`Nhập chỉ số ${label} lúc trả phòng, hoặc bỏ tick khoản này.`);
      if (line.invalid) return setError(`Chỉ số ${label} mới (${reading}) nhỏ hơn chỉ số cũ (${line.meter.lastReading}).`);
    }
    if (extras.some((extra) => extra.checked && !(Number(extra.amount) > 0))) return setError("Chi phí phát sinh đã tick cần có số tiền lớn hơn 0.");
    if (moneyMoves && !walletId) return setError("Chọn ví để ghi nhận khoản thu / hoàn cọc. Nếu chưa có ví, hãy tạo ví trước.");

    const breakdown = charged.map((line) => `- ${line.label}: ${formatMoney(line.amount)}`).join("\n");
    const outcome = refundToTenant > 0
      ? `Hoàn lại khách ${formatMoney(refundToTenant)}`
      : tenantPays > 0 ? `Khách trả thêm ${formatMoney(tenantPays)}` : "Hai bên không phải trả thêm";
    const fullNote = [
      `Trả phòng ngày ${moveOutDate}. Tiền cọc ${formatMoney(deposit)}, tổng chi phí ${formatMoney(totalCharges)}. ${outcome}.`,
      breakdown,
      note.trim(),
    ].filter(Boolean).join("\n");

    setLoading(true);
    try {
      await onConfirm({
        refundAmount: refundToTenant,
        settlementAmount: totalCharges,
        settlementStatus: "paid",
        refundDate: moveOutDate,
        refundMethod,
        note: fullNote,
        walletId,
        settlementWalletId: walletId,
        settledInvoiceIds: preview.unpaidInvoices.filter((inv) => isOn(`invoice-${inv.id}`)).map((inv) => inv.id),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi xử lý trả phòng.");
    } finally {
      setLoading(false);
    }
  };

  // A plain render helper, not a component: a nested component would remount
  // its inputs (and drop focus) on every keystroke.
  const row = ({ lineKey, label, hint, amount, children }: { lineKey: string; label: string; hint?: string; amount: number; children?: React.ReactNode }) => (
    <div key={lineKey} className="flex items-start gap-3 py-2.5">
      <input type="checkbox" id={`line-${lineKey}`} checked={isOn(lineKey)} onChange={() => toggle(lineKey)} className="mt-1 h-4 w-4 accent-blue-600" />
      <div className="min-w-0 flex-1">
        <label htmlFor={`line-${lineKey}`} className="block cursor-pointer text-sm font-semibold text-slate-900">{label}</label>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
        {children}
      </div>
      <div className={`whitespace-nowrap text-sm font-bold tabular-nums ${isOn(lineKey) ? "text-slate-900" : "text-slate-400 line-through"}`}>{formatMoney(amount)}</div>
    </div>
  );

  const meterRow = (key: "electricity" | "water", line: ReturnType<typeof meterLine>, value: string, setValue: (v: string) => void) => line && row({
    lineKey: key,
    label: line.meter.name,
    hint: `Chỉ số cũ ${line.meter.lastReading} · ${formatMoney(line.meter.unitPrice)}/${line.meter.unit}`,
    amount: line.amount,
    children: (
      <>
        <input
          id={`reading-${key}`}
          className="input mt-1.5 max-w-[200px]"
          type="number"
          inputMode="decimal"
          min={line.meter.lastReading}
          placeholder="Chỉ số lúc trả phòng"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!isOn(key)}
        />
        {line.invalid && <div className="mt-1 text-xs font-medium text-red-600">Nhỏ hơn chỉ số cũ.</div>}
      </>
    ),
  });

  return (
    <SidePanel title="Trả phòng" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Ngày khách trả phòng">
          <input className="input" type="date" value={moveOutDate} min={String(contract.start_date || "").slice(0, 10) || undefined} onChange={(e) => e.target.value && setMoveOutDate(e.target.value)} required />
        </Field>

        {previewError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{previewError}</div>}
        {!preview && !previewError && <div className="rounded-lg border border-slate-200 px-3 py-6 text-center text-sm text-slate-500">Đang tính chi phí...</div>}

        {preview && (
          <>
            <div className="rounded-xl border border-slate-200 px-4 py-1">
              <div className="border-b border-slate-100 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">Các khoản tính cho khách · bỏ tick khoản không thu</div>
              <div className="divide-y divide-slate-100">
                {preview.rent.alreadyInvoiced ? (
                  <div className="py-2.5 text-sm text-slate-600">Tiền phòng tháng {Number(moveOutDate.slice(5, 7))} đã nằm trong hóa đơn của tháng, không tính lại.</div>
                ) : preview.rent.amount > 0 && row({
                  lineKey: "rent",
                  label: `Tiền phòng ${preview.rent.stayedDays}/${preview.rent.daysInMonth} ngày`,
                  hint: `Từ ${preview.rent.fromDate.split("-").reverse().join("/")} đến ${moveOutDate.split("-").reverse().join("/")} · ${formatMoney(preview.rent.monthlyRent)}/tháng`,
                  amount: preview.rent.amount,
                })}
                {meterRow("electricity", elec, elecNew, setElecNew)}
                {meterRow("water", water, waterNew, setWaterNew)}
                {preview.fixedServices.map((service, index) => row({
                  lineKey: `service-${index}`,
                  label: service.name,
                  hint: `${formatMoney(service.monthlyAmount)}/tháng, tính theo số ngày ở`,
                  amount: service.amount,
                }))}
                {preview.unpaidInvoices.map((inv) => row({
                  lineKey: `invoice-${inv.id}`,
                  label: `Hóa đơn T${inv.month}/${inv.year} còn nợ`,
                  hint: "Tick để tất toán luôn hóa đơn này",
                  amount: inv.remaining,
                }))}
                {extras.map((extra) => (
                  <div key={extra.id} className="flex items-center gap-3 py-2.5">
                    <input type="checkbox" aria-label="Tính khoản này" checked={extra.checked} onChange={() => setExtras((prev) => prev.map((x) => x.id === extra.id ? { ...x, checked: !x.checked } : x))} className="h-4 w-4 accent-blue-600" />
                    <input id={`extra-name-${extra.id}`} className="input min-w-0 flex-1" placeholder="Tên khoản (vd: Sửa cửa, vệ sinh)" value={extra.name} onChange={(e) => setExtras((prev) => prev.map((x) => x.id === extra.id ? { ...x, name: e.target.value } : x))} />
                    <input id={`extra-amount-${extra.id}`} className="input w-32 text-right" type="number" min={0} placeholder="Số tiền" value={extra.amount} onChange={(e) => setExtras((prev) => prev.map((x) => x.id === extra.id ? { ...x, amount: e.target.value } : x))} />
                    <button type="button" aria-label="Xóa khoản này" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" onClick={() => setExtras((prev) => prev.filter((x) => x.id !== extra.id))}><X size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 py-2.5">
                <Button type="button" variant="ghost" size="sm" onClick={() => setExtras((prev) => [...prev, { id: Date.now(), name: "", amount: "", checked: true }])}>+ Thêm chi phí phát sinh</Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex justify-between py-1"><span className="text-slate-600">Tổng chi phí</span><span className="font-semibold tabular-nums">{formatMoney(totalCharges)}</span></div>
              <div className="flex justify-between py-1"><span className="text-slate-600">Tiền cọc đang giữ</span><span className="font-semibold tabular-nums">− {formatMoney(deposit)}</span></div>
              <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-3 text-base font-bold ${refundToTenant > 0 ? "bg-amber-50 text-amber-900" : tenantPays > 0 ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                <span>{refundToTenant > 0 ? "Bạn hoàn lại cho khách" : tenantPays > 0 ? "Khách trả thêm cho bạn" : "Hai bên không phải trả thêm"}</span>
                {!(refundToTenant === 0 && tenantPays === 0) && <span className="tabular-nums">{formatMoney(refundToTenant || tenantPays)}</span>}
              </div>
            </div>

            {moneyMoves && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ví ghi nhận">
                  <select className="input" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
                    {wallets.length === 0 && <option value="">Chưa có ví</option>}
                    {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} ({formatMoney(w.balance || 0)})</option>)}
                  </select>
                </Field>
                <Field label="Hình thức">
                  <select className="input" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                    <option>Tiền mặt</option>
                    <option>Chuyển khoản</option>
                  </select>
                </Field>
              </div>
            )}

            <Field label="Ghi chú thêm (không bắt buộc)">
              <textarea className="input min-h-16 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </>
        )}

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="danger" size="lg" className="flex-[2]" disabled={!preview} loading={loading}>
            {loading ? "Đang xử lý..." : "Hoàn tất trả phòng"}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-950">{value}</div></div>;
}
