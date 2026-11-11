"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, Zap, Droplets, Package, CalendarDays, Home, Loader2 } from "lucide-react";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import {
  createInvoiceFromInputs,
  currentPeriod,
  formatMoney,
  loadContract,
  loadPreviousDebt,
  previewInvoice,
  type InvoiceDraftLine,
  type InvoiceInputs,
} from "@/lib/rentalOps";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/ui/PageContainer";
import FeeSignToggle, { cleanAmountInput, signedFeeAmount, type FeeSign } from "@/components/ops/FeeSignToggle";

const period = currentPeriod();

/** Waits until `value` stops changing for `ms` before passing it on. */
function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

type ExtraFee = { label: string; amount: string; note: string; sign: FeeSign };

export default function NewInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const contractId = searchParams.get("contract_id");
  const [error, setError] = useState("");
  // Meter fields start empty: the first preview fills in last period's readings.
  const [readings, setReadings] = useState<{ electricOld: string; electricNew: string; waterOld: string; waterNew: string } | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [fees, setFees] = useState<ExtraFee[]>([]);
  const updateFee = (index: number, patch: Partial<ExtraFee>) =>
    setFees((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const [applyPreviousDebt, setApplyPreviousDebt] = useState(true);
  // Partial first month: services by days stayed (default) or full month, and
  // each charge can be switched off (a tenant moving in on the 29th).
  const [prorateServices, setProrateServices] = useState(true);
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!contractId) router.replace("/contracts");
  }, [contractId, router]);

  const contractQuery = useQuery({ queryKey: ["contracts", contractId], queryFn: () => loadContract(String(contractId)), enabled: Boolean(contractId), staleTime: 60_000 });
  const contract = contractQuery.data;

  // Only for the "carry last period's debt" choice: when it is switched off the
  // draft no longer includes the amount, so it is read here to keep showing it.
  const previousDebtQuery = useQuery({
    queryKey: ["previous-debt", contract?.room_id, period.month, period.year],
    queryFn: () => loadPreviousDebt(String(contract?.room_id), period.month, period.year),
    enabled: Boolean(contract?.room_id),
    staleTime: 30_000,
  });
  const previousDebt = previousDebtQuery.data || 0;

  const inputs: InvoiceInputs | null = useMemo(() => {
    if (!contract) return null;
    const toNumber = (value: string) => (value.trim() === "" ? null : Number(value));
    return {
      contractId: String(contract.id),
      roomId: String(contract.room_id),
      month: period.month,
      year: period.year,
      ...(readings
        ? {
            elecOld: toNumber(readings.electricOld),
            elecNew: toNumber(readings.electricNew),
            waterOld: toNumber(readings.waterOld),
            waterNew: toNumber(readings.waterNew),
          }
        : {}),
      applyPreviousDebt,
      prorateFirstMonthServices: prorateServices,
      excludeServiceIds: Object.keys(skipped).filter((key) => skipped[key] && key !== "rent"),
      skipRent: Boolean(skipped.rent),
      extraItems: fees
        .filter((fee) => fee.label.trim() && Number(fee.amount || 0) > 0)
        .map((fee) => ({ name: fee.label.trim(), detail: fee.note.trim() || undefined, amount: signedFeeAmount(fee.sign, fee.amount) })),
    };
  }, [contract, readings, applyPreviousDebt, prorateServices, skipped, fees]);

  const debouncedInputs = useDebounced(inputs, 300);
  const previewQuery = useQuery({
    queryKey: ["invoice-preview", debouncedInputs],
    queryFn: () => previewInvoice(debouncedInputs as InvoiceInputs),
    enabled: Boolean(debouncedInputs),
    placeholderData: (previous) => previous,
    retry: false,
  });
  const draft = previewQuery.data;
  const isStale = previewQuery.isFetching || inputs !== debouncedInputs;
  const previewError = previewQuery.error ? (previewQuery.error as Error).message : "";

  // First draft: fill the meter fields with last period's readings.
  useEffect(() => {
    if (!draft || readings) return;
    setReadings({
      electricOld: String(draft.readings.elecOld),
      electricNew: String(draft.readings.elecNew ?? draft.readings.elecOld),
      waterOld: String(draft.readings.waterOld),
      waterNew: String(draft.readings.waterNew ?? draft.readings.waterOld),
    });
  }, [draft, readings]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract || !inputs) throw new Error("Không tìm thấy hợp đồng.");
      if (fees.some((fee) => !fee.label.trim() && Number(fee.amount || 0) > 0)) throw new Error("Vui lòng nhập tên cho khoản phí phát sinh.");
      // The server prices the invoice from these inputs exactly as the preview did.
      return createInvoiceFromInputs({ ...inputs, dueDate: dueDate || undefined, invoiceNote: note.trim() || undefined });
    },
    onSuccess: async (invoice) => {
      await invalidateOwnerOpsQueries(queryClient, {
        facilityId: contract?.facility_id,
        roomId: contract?.room_id,
        contractId,
        invoiceId: invoice?.id,
      });
      router.push(`/invoices/${invoice.id}`);
    },
    onError: (err: any) => setError(err?.message || "Không tạo được hóa đơn."),
  });

  if (contractQuery.isLoading) return <LoadingSkeleton rows={5} />;
  if (!contract) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không tìm thấy hợp đồng.</div>;

  const proration = draft?.rent.proration ?? null;
  const canSkip = Boolean(proration);
  const lines = draft?.lines ?? [];
  const electricity = lines.find((line) => line.kind === "electricity");
  const water = lines.find((line) => line.kind === "water");
  const services = lines.filter((line) => line.kind === "service");
  const roomLines = lines.filter((line) => line.kind === "room_service" || line.kind === "adjustment");
  const extraTotal = lines.filter((line) => line.kind === "extra").reduce((sum, line) => sum + line.amount, 0);
  // Switch keys use the service id (or name), matching excludeServiceIds.
  const skipKey = (line: InvoiceDraftLine) => line.key.replace(/^svc-/, "");

  const chargeToggle = (key: string, label: string) => canSkip ? (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-600">
      <input
        type="checkbox"
        className="h-4 w-4 accent-blue-600"
        checked={!skipped[key]}
        onChange={() => setSkipped((prev) => ({ ...prev, [key]: !prev[key] }))}
        aria-label={`Tính ${label}`}
      />
      Tính
    </label>
  ) : null;

  const amountText = (line: InvoiceDraftLine) => (
    <span className={`text-sm font-bold ${line.skipped ? "text-slate-400 line-through" : line.amount < 0 ? "text-emerald-700" : "text-slate-900"}`}>
      {formatMoney(line.skipped ? line.fullAmount : line.amount)}
    </span>
  );

  const meterCard = (line: InvoiceDraftLine | undefined, kind: "electricity" | "water") => {
    if (!line || !readings) return null;
    const oldKey = kind === "electricity" ? "electricOld" : "waterOld";
    const newKey = kind === "electricity" ? "electricNew" : "waterNew";
    const unit = line.unit || (kind === "electricity" ? "kWh" : "m³");
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
          {kind === "electricity" ? <Zap size={13} className="text-amber-500" /> : <Droplets size={13} className="text-blue-500" />}
          <span className="text-sm font-semibold text-slate-700">{line.name}</span>
          <span className="ml-auto flex items-center gap-3">
            {chargeToggle(skipKey(line), line.name)}
            {amountText(line)}
          </span>
        </div>
        {line.metered ? (
          <div className="grid grid-cols-2 gap-3 px-4 py-3">
            <CompactField label="Chỉ số đầu">
              <input className="input text-sm" type="number" inputMode="decimal" value={readings[oldKey]} onChange={(e) => setReadings((p) => p && ({ ...p, [oldKey]: e.target.value }))} />
            </CompactField>
            <CompactField label="Chỉ số cuối">
              <input className="input text-sm" type="number" inputMode="decimal" value={readings[newKey]} onChange={(e) => setReadings((p) => p && ({ ...p, [newKey]: e.target.value }))} />
            </CompactField>
            <div className="col-span-2 text-xs text-slate-500">
              Tiêu thụ: <strong>{line.usageValue ?? 0} {unit}</strong> × {formatMoney(line.unitPrice)}/{unit}
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 text-xs text-slate-500">{line.detail || formatMoney(line.unitPrice)}</div>
        )}
      </div>
    );
  };

  return (
    <PageContainer width="narrow">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/contracts/${contract.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={14} />
          Quay lại
        </Link>
        <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
          T{period.month}/{period.year}
        </span>
      </div>

      {/* Contract info + rent */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <span className="text-base font-bold text-slate-900">Phòng {contract.room_name}</span>
            <span className="ml-2 text-sm text-slate-500">{contract.tenant_name}</span>
          </div>
          {draft && (
            <span className="flex shrink-0 items-center gap-3">
              {chargeToggle("rent", "tiền phòng")}
              <span className={`text-sm font-semibold ${draft.rent.skipped ? "text-slate-400 line-through" : "text-slate-900"}`}>
                {formatMoney(draft.rent.skipped ? draft.rent.fullAmount : draft.rent.amount)}
              </span>
            </span>
          )}
        </div>
        {draft && proration && (
          <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
            Tháng đầu (từ {new Date(contract.start_date!).toLocaleDateString("vi-VN")}): {formatMoney(draft.rent.monthly)} × {proration.stayedDays}/{proration.daysInMonth} ngày = <strong>{formatMoney(draft.rent.fullAmount)}</strong>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-semibold">Dịch vụ (nước, rác, wifi…):</span>
              <div role="radiogroup" aria-label="Cách tính dịch vụ tháng đầu" className="inline-flex rounded-md border border-blue-200 bg-white p-0.5">
                {[{ value: true, label: `Theo ngày ở (${proration.stayedDays}/${proration.daysInMonth})` }, { value: false, label: "Cả tháng" }].map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="radio"
                    aria-checked={prorateServices === option.value}
                    onClick={() => setProrateServices(option.value)}
                    className={`rounded px-2 py-0.5 font-semibold ${prorateServices === option.value ? "bg-blue-600 text-white" : "text-blue-700 hover:bg-blue-50"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
      {previewError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{previewError}</div>}

      {draft && (!draft.electricity.configured || !draft.water.configured) && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-sm font-semibold text-amber-900">
            Hợp đồng này chưa áp dụng dịch vụ {!draft.electricity.configured && !draft.water.configured ? "điện và nước" : !draft.electricity.configured ? "điện" : "nước"}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Hóa đơn sẽ không có khoản này — hệ thống không tự đặt giá thay bạn. Hãy tạo dịch vụ rồi cập nhật hợp đồng để hóa đơn tính đúng.
          </p>
          <Link href="/owner/services" className="mt-2 inline-block text-xs font-bold text-blue-700 hover:underline">
            Cấu hình dịch vụ →
          </Link>
        </div>
      )}

      {!draft && !previewError && <LoadingSkeleton rows={4} />}

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
        {meterCard(electricity, "electricity")}
        {meterCard(water, "water")}

        {/* Other contract services */}
        {services.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <Package size={13} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Dịch vụ khác</span>
              <span className="ml-auto text-sm font-bold text-slate-900">{formatMoney(services.reduce((sum, line) => sum + line.amount, 0))}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {services.map((line) => (
                <div key={line.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800">{line.name}</span>
                    <span className="ml-2 text-xs text-slate-400">{line.detail || formatMoney(line.unitPrice)}</span>
                  </div>
                  <span className="flex shrink-0 items-center gap-3">
                    {chargeToggle(skipKey(line), line.name)}
                    {amountText(line)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Room-level services and pending per-period fees (added on save before, never shown) */}
        {roomLines.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <Home size={13} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Dịch vụ theo phòng & phí đã ghi</span>
              <span className="ml-auto text-sm font-bold text-slate-900">{formatMoney(roomLines.reduce((sum, line) => sum + line.amount, 0))}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {roomLines.map((line) => (
                <div key={line.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800">{line.name}</span>
                    {line.detail && <span className="ml-2 text-xs text-slate-400">{line.detail}</span>}
                  </div>
                  {amountText(line)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra fees */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
            <Plus size={13} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Phí phát sinh</span>
            {fees.length > 0 && <span className={`ml-auto text-sm font-bold ${extraTotal < 0 ? "text-emerald-700" : "text-slate-900"}`}>{formatMoney(extraTotal)}</span>}
          </div>
          <div className="px-4 py-3 space-y-3">
            {fees.map((fee, index) => {
              const signed = signedFeeAmount(fee.sign, fee.amount);
              return (
                <div key={index} className={`space-y-2 rounded-lg border p-3 ${fee.sign === "discount" ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <FeeSignToggle size="sm" value={fee.sign} onChange={(sign) => updateFee(index, { sign })} />
                    <span className="flex items-center gap-2">
                      {signed !== 0 && (
                        <span className={`text-sm font-bold ${signed < 0 ? "text-emerald-700" : "text-slate-900"}`}>
                          {signed < 0 ? "−" : "+"}{formatMoney(Math.abs(signed))}
                        </span>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => setFees((prev) => prev.filter((_, i) => i !== index))} aria-label="Xóa khoản phí">
                        <X size={14} />
                      </Button>
                    </span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
                    <input
                      className="input text-sm"
                      placeholder={fee.sign === "discount" ? "Vd: Giảm do mất nước" : "Vd: Sửa khóa"}
                      value={fee.label}
                      onChange={(e) => updateFee(index, { label: e.target.value })}
                    />
                    <input
                      className="input text-right text-sm"
                      inputMode="numeric"
                      placeholder="Số tiền"
                      aria-label="Số tiền"
                      value={fee.amount ? new Intl.NumberFormat("vi-VN").format(Number(fee.amount)) : ""}
                      onChange={(e) => updateFee(index, { amount: cleanAmountInput(e.target.value) })}
                    />
                  </div>
                  <input
                    className="input text-sm"
                    placeholder="Ghi chú (tuỳ chọn) — hiện trên hóa đơn"
                    value={fee.note}
                    onChange={(e) => updateFee(index, { note: e.target.value })}
                  />
                </div>
              );
            })}
            <Button type="button" variant="ghost" size="sm" onClick={() => setFees((prev) => [...prev, { label: "", amount: "", note: "", sign: "charge" }])}>
              <Plus size={13} /> Thêm phí / giảm trừ
            </Button>
          </div>
        </div>

        {/* Due date & note */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
            <CalendarDays size={13} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Thanh toán</span>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 py-3">
            <CompactField label="Hạn thanh toán">
              <input className="input text-sm" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </CompactField>
            <CompactField label="Ghi chú">
              <input className="input text-sm" placeholder="Không bắt buộc" value={note} onChange={(e) => setNote(e.target.value)} />
            </CompactField>
          </div>
        </div>

        {previousDebt > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-amber-300"
                checked={applyPreviousDebt}
                onChange={(e) => setApplyPreviousDebt(e.target.checked)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-amber-900">
                  Cấn công nợ kỳ trước: {formatMoney(previousDebt)}
                </span>
                <span className="mt-0.5 block text-xs text-amber-700">
                  {applyPreviousDebt
                    ? "Khoản này được cộng vào hóa đơn tháng này để thu một lần."
                    : "Bỏ tích: hóa đơn tháng này không cộng nợ, khoản cũ vẫn nằm ở hóa đơn kỳ trước để thu riêng."}
                </span>
              </span>
            </label>
          </div>
        )}

        {/* Sticky footer: the server's total, exactly what will be billed */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              Tổng hóa đơn {isStale && <Loader2 size={11} className="animate-spin" aria-label="Đang tính lại" />}
            </div>
            <div className={`text-xl font-bold text-blue-700 ${isStale ? "opacity-60" : ""}`}>
              {draft ? formatMoney(draft.total) : "—"}
            </div>
            {draft && (draft.previousDebt > 0 || draft.previousCredit > 0) && (
              <div className="text-xs text-slate-500">
                {formatMoney(draft.chargesTotal)}
                {draft.previousDebt > 0 && ` + nợ ${formatMoney(draft.previousDebt)}`}
                {draft.previousCredit > 0 && ` − dư ${formatMoney(draft.previousCredit)}`}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/contracts/${contract.id}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Hủy
            </Link>
            <Button type="submit" variant="primary" loading={mutation.isPending} disabled={!draft || Boolean(previewError) || isStale}>
              {mutation.isPending ? "Đang tạo..." : "Tạo hóa đơn"}
            </Button>
          </div>
        </div>
      </form>
    </PageContainer>
  );
}

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
