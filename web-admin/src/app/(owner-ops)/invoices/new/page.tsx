"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, Zap, Droplets, Package, CalendarDays } from "lucide-react";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import { createInvoiceForContract, currentPeriod, describeServiceType, formatMoney, getServiceUnitLabel, loadContract, loadLatestMeterReadings, loadPreviousDebt } from "@/lib/rentalOps";
import { calculateProratedRent } from "@/utils/rentCalc";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/ui/PageContainer";

const period = currentPeriod();

export default function NewInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const contractId = searchParams.get("contract_id");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    electricOld: "0",
    electricNew: "0",
    waterOld: "0",
    waterNew: "0",
    dueDate: "",
    note: "",
  });
  const [fees, setFees] = useState<Array<{ label: string; amount: string }>>([]);
  const [applyPreviousDebt, setApplyPreviousDebt] = useState(true);

  useEffect(() => {
    if (!contractId) router.replace("/contracts");
  }, [contractId, router]);

  const contractQuery = useQuery({ queryKey: ["contracts", contractId], queryFn: () => loadContract(String(contractId)), enabled: Boolean(contractId), staleTime: 60_000 });
  const contract = contractQuery.data;

  // Preview only. The server recomputes the carry-over when the bill is created,
  // so this can never be the number that actually gets charged.
  const previousDebtQuery = useQuery({
    queryKey: ["previous-debt", contract?.room_id, period.month, period.year],
    queryFn: () => loadPreviousDebt(String(contract?.room_id), period.month, period.year),
    enabled: Boolean(contract?.room_id),
    staleTime: 30_000,
  });
  const previousDebt = previousDebtQuery.data || 0;

  const appliedServices = contract?.applied_services_snapshot || [];

  // The contract's service snapshot is the only source of truth for pricing.
  // Falling back to a "typical" rate here silently produced invoices with prices
  // the owner never configured, so an unconfigured utility now bills 0 and the
  // form tells the owner to go set it up.
  const electricityFromContract = appliedServices.find(
    (service) => String(service.category || "").toLowerCase() === "electricity",
  );
  const waterFromContract = appliedServices.find(
    (service) => String(service.category || "").toLowerCase() === "water",
  );

  const electricityConfigured = Boolean(electricityFromContract);
  const waterConfigured = Boolean(waterFromContract);

  const electricityService = electricityFromContract || {
    service_id: 0, name: "Tiền điện", category: "electricity", type: "metered", applied_unit_price: 0, amount: null,
  };
  const waterService = waterFromContract || {
    service_id: 0, name: "Tiền nước", category: "water", type: "metered", applied_unit_price: 0, amount: null,
  };
  const otherServices = appliedServices.filter((service) => !["electricity", "water"].includes(String(service.category || "").toLowerCase()));
  const electricityIsMetered = ["meter", "metered"].includes(String(electricityService?.type || "").toLowerCase());
  const waterIsMetered = ["meter", "metered"].includes(String(waterService?.type || "").toLowerCase());

  useEffect(() => {
    if (!contract) return;
    let mounted = true;
    loadLatestMeterReadings(contract.room_id)
      .then((data) => {
        if (!mounted || !data) return;
        setForm((prev) => ({
          ...prev,
          electricOld: electricityIsMetered ? (prev.electricOld === "0" ? String(Number(data.elec_old || contract.electric_start || 0)) : prev.electricOld) : "0",
          electricNew: electricityIsMetered && prev.electricNew === "0" ? String(Number(data.elec_old || contract.electric_start || 0)) : prev.electricNew,
          waterOld: waterIsMetered ? (prev.waterOld === "0" ? String(Number(data.water_old || contract.water_start || 0)) : prev.waterOld) : "0",
          waterNew: waterIsMetered && prev.waterNew === "0" ? String(Number(data.water_old || contract.water_start || 0)) : prev.waterNew,
        }));
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [contract, electricityIsMetered, waterIsMetered]);

  const isFirstMonth = useMemo(() => {
    if (!contract?.start_date) return false;
    const startDate = new Date(contract.start_date);
    return startDate.getMonth() + 1 === period.month && startDate.getFullYear() === period.year;
  }, [contract?.start_date]);

  const proratedInfo = useMemo(() => {
    if (!contract || !isFirstMonth || !contract.start_date) return null;
    const startDate = new Date(contract.start_date);
    const endDate = new Date(period.year, period.month, 0);
    return calculateProratedRent(Number(contract.rent_amount || 0), startDate, endDate);
  }, [contract, isFirstMonth]);

  // Partial first month: fixed services follow rent and are charged by days
  // stayed unless the owner picks the full month. Mirrors the backend rounding.
  const [prorateServices, setProrateServices] = useState(true);
  // Partial first month only: each charge can be switched off (a tenant who
  // moved in on the 29th may not be billed rent or wifi at all).
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const canSkip = Boolean(proratedInfo);
  const isSkipped = useCallback((key: string) => canSkip && Boolean(skipped[key]), [canSkip, skipped]);
  const serviceKey = (service: { service_id?: unknown; name?: unknown }) => `svc-${String(service.service_id || service.name)}`;
  const prorate = useCallback((amount: number) => (
    proratedInfo && prorateServices ? Math.round((amount * proratedInfo.stayedDays) / proratedInfo.daysInMonth) : amount
  ), [proratedInfo, prorateServices]);

  const computed = useMemo(() => {
    const electricUsed = Math.max(0, Number(form.electricNew || 0) - Number(form.electricOld || 0));
    const waterUsed = Math.max(0, Number(form.waterNew || 0) - Number(form.waterOld || 0));
    const electricType = String(electricityService?.type || "").toLowerCase();
    const waterType = String(waterService?.type || "").toLowerCase();
    const occupantCount = Number(contract?.occupant_count || 1);

    const electricAmount = electricityService && !isSkipped(serviceKey(electricityService))
      ? (electricType === "meter" || electricType === "metered")
        ? electricUsed * Number(electricityService.applied_unit_price || 0)
        : prorate(electricType === "per_person"
          ? occupantCount * Number(electricityService.applied_unit_price || 0)
          : Number(electricityService.amount || electricityService.applied_unit_price || 0))
      : 0;

    const waterAmount = waterService && !isSkipped(serviceKey(waterService))
      ? (waterType === "meter" || waterType === "metered")
        ? waterUsed * Number(waterService.applied_unit_price || 0)
        : prorate(waterType === "per_person"
          ? occupantCount * Number(waterService.applied_unit_price || 0)
          : Number(waterService.amount || waterService.applied_unit_price || 0))
      : 0;

    const serviceAmount = otherServices.reduce((sum, item) => {
      if (isSkipped(serviceKey(item))) return sum;
      const type = String(item.type || "").toLowerCase();
      const amount = type === "per_person"
        ? occupantCount * Number(item.applied_unit_price || 0)
        : Number(item.amount || item.applied_unit_price || 0);
      return sum + (type === "meter" || type === "metered" ? amount : prorate(amount));
    }, 0);

    const otherAmount = fees.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const rent = isSkipped("rent") ? 0 : proratedInfo ? proratedInfo.totalAmount : Number(contract?.rent_amount || 0);
    return { electricUsed, waterUsed, electricAmount, waterAmount, serviceAmount, otherAmount, rent, total: rent + electricAmount + waterAmount + serviceAmount + otherAmount };
  }, [contract?.rent_amount, contract?.occupant_count, electricityService, fees, form.electricNew, form.electricOld, form.waterNew, form.waterOld, otherServices, waterService, proratedInfo, prorate, isSkipped]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Không tìm thấy hợp đồng.");
      if (electricityIsMetered && Number(form.electricNew) < Number(form.electricOld)) throw new Error("Chỉ số điện cuối kỳ không được nhỏ hơn đầu kỳ.");
      if (waterIsMetered && Number(form.waterNew) < Number(form.waterOld)) throw new Error("Chỉ số nước cuối kỳ không được nhỏ hơn đầu kỳ.");
      return createInvoiceForContract(contract, {
        month: period.month,
        year: period.year,
        roomFee: computed.rent,
        electricOld: electricityIsMetered ? Number(form.electricOld || 0) : 0,
        electricNew: electricityIsMetered ? Number(form.electricNew || 0) : 0,
        waterOld: waterIsMetered ? Number(form.waterOld || 0) : 0,
        waterNew: waterIsMetered ? Number(form.waterNew || 0) : 0,
        dueDate: form.dueDate || undefined,
        applyPreviousDebt,
        prorateFirstMonthServices: prorateServices,
        excludeServiceIds: canSkip
          ? appliedServices.filter((service) => isSkipped(serviceKey(service))).map((service) => String(service.service_id || service.name))
          : [],
        items: fees.filter((item) => item.label.trim()).map((item) => ({ name: item.label.trim(), amount: Number(item.amount || 0) })),
      });
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

  const occupantCount = Number(contract.occupant_count || 1);
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

      {/* Contract info */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <span className="text-base font-bold text-slate-900">Phòng {contract.room_name}</span>
            <span className="ml-2 text-sm text-slate-500">{contract.tenant_name}</span>
          </div>
          <span className="flex shrink-0 items-center gap-3">
            {chargeToggle("rent", "tiền phòng")}
            <span className={`text-sm font-semibold ${isSkipped("rent") ? "text-slate-400 line-through" : "text-slate-900"}`}>{formatMoney(isSkipped("rent") ? (proratedInfo?.totalAmount ?? 0) : computed.rent)}</span>
          </span>
        </div>
        {proratedInfo && (
          <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
            Tháng đầu (từ {new Date(contract.start_date!).toLocaleDateString("vi-VN")}): {proratedInfo.breakdown} = <strong>{formatMoney(proratedInfo.totalAmount)}</strong>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-semibold">Dịch vụ (nước, rác, wifi…):</span>
              <div role="radiogroup" aria-label="Cách tính dịch vụ tháng đầu" className="inline-flex rounded-md border border-blue-200 bg-white p-0.5">
                {[{ value: true, label: `Theo ngày ở (${proratedInfo.stayedDays}/${proratedInfo.daysInMonth})` }, { value: false, label: "Cả tháng" }].map((option) => (
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

      {(!electricityConfigured || !waterConfigured) && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-sm font-semibold text-amber-900">
            Hợp đồng này chưa áp dụng dịch vụ {!electricityConfigured && !waterConfigured ? "điện và nước" : !electricityConfigured ? "điện" : "nước"}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Đơn giá đang để 0 đ vì chưa có cấu hình — hệ thống không tự đặt giá thay bạn. Hãy tạo dịch vụ rồi cập nhật hợp đồng để hóa đơn tính đúng.
          </p>
          <Link href="/owner/services" className="mt-2 inline-block text-xs font-bold text-blue-700 hover:underline">
            Cấu hình dịch vụ →
          </Link>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
        {/* Electricity */}
        {electricityService && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <Zap size={13} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-700">{electricityService.name}</span>
              <span className="ml-auto flex items-center gap-3">
                {chargeToggle(serviceKey(electricityService), electricityService.name)}
                <span className="text-sm font-bold text-slate-900">{formatMoney(computed.electricAmount)}</span>
              </span>
            </div>
            {electricityIsMetered ? (
              <div className="grid grid-cols-2 gap-3 px-4 py-3">
                <CompactField label="Chỉ số đầu">
                  <input className="input text-sm" type="number" value={form.electricOld} onChange={(e) => setForm((p) => ({ ...p, electricOld: e.target.value }))} />
                </CompactField>
                <CompactField label="Chỉ số cuối">
                  <input className="input text-sm" type="number" value={form.electricNew} onChange={(e) => setForm((p) => ({ ...p, electricNew: e.target.value }))} />
                </CompactField>
                <div className="col-span-2 text-xs text-slate-500">
                  Tiêu thụ: <strong>{computed.electricUsed} kWh</strong> × {formatMoney(electricityService.applied_unit_price)}/kWh
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 text-xs text-slate-500">
                {String(electricityService.type).toLowerCase() === "per_person"
                  ? `${occupantCount} người × ${formatMoney(electricityService.applied_unit_price)}`
                  : `${describeServiceType(electricityService)} · ${formatMoney(electricityService.applied_unit_price)}${getServiceUnitLabel(electricityService)}`}
              </div>
            )}
          </div>
        )}

        {/* Water */}
        {waterService && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <Droplets size={13} className="text-blue-500" />
              <span className="text-sm font-semibold text-slate-700">{waterService.name}</span>
              <span className="ml-auto flex items-center gap-3">
                {chargeToggle(serviceKey(waterService), waterService.name)}
                <span className="text-sm font-bold text-slate-900">{formatMoney(computed.waterAmount)}</span>
              </span>
            </div>
            {waterIsMetered ? (
              <div className="grid grid-cols-2 gap-3 px-4 py-3">
                <CompactField label="Chỉ số đầu">
                  <input className="input text-sm" type="number" value={form.waterOld} onChange={(e) => setForm((p) => ({ ...p, waterOld: e.target.value }))} />
                </CompactField>
                <CompactField label="Chỉ số cuối">
                  <input className="input text-sm" type="number" value={form.waterNew} onChange={(e) => setForm((p) => ({ ...p, waterNew: e.target.value }))} />
                </CompactField>
                <div className="col-span-2 text-xs text-slate-500">
                  Tiêu thụ: <strong>{computed.waterUsed} m³</strong> × {formatMoney(waterService.applied_unit_price)}/m³
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 text-xs text-slate-500">
                {String(waterService.type).toLowerCase() === "per_person"
                  ? `${occupantCount} người × ${formatMoney(waterService.applied_unit_price)}`
                  : `${describeServiceType(waterService)} · ${formatMoney(waterService.applied_unit_price)}${getServiceUnitLabel(waterService)}`}
              </div>
            )}
          </div>
        )}

        {/* Other contract services */}
        {otherServices.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <Package size={13} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Dịch vụ khác</span>
              <span className="ml-auto text-sm font-bold text-slate-900">{formatMoney(computed.serviceAmount)}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {otherServices.map((service) => {
                const isPerPerson = String(service.type).toLowerCase() === "per_person";
                const amount = prorate(isPerPerson
                  ? occupantCount * Number(service.applied_unit_price || 0)
                  : Number(service.amount || service.applied_unit_price || 0));
                return (
                  <div key={service.service_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <span className="font-medium text-slate-800">{service.name}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {isPerPerson ? `${occupantCount} người × ${formatMoney(service.applied_unit_price)}` : formatMoney(service.applied_unit_price)}
                      </span>
                    </div>
                    <span className="flex items-center gap-3">
                      {chargeToggle(serviceKey(service), service.name)}
                      <span className={`font-semibold ${isSkipped(serviceKey(service)) ? "text-slate-400 line-through" : "text-slate-900"}`}>{formatMoney(amount)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Extra fees */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
            <Plus size={13} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Phí phát sinh</span>
            {fees.length > 0 && <span className="ml-auto text-sm font-bold text-slate-900">{formatMoney(computed.otherAmount)}</span>}
          </div>
          <div className="px-4 py-3 space-y-2">
            {fees.map((fee, index) => (
              <div key={index} className="flex gap-2">
                <input className="input flex-1 text-sm" placeholder="Tên phí" value={fee.label} onChange={(e) => setFees((prev) => prev.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} />
                <input className="input w-28 text-sm" type="number" placeholder="Số tiền" value={fee.amount} onChange={(e) => setFees((prev) => prev.map((item, i) => i === index ? { ...item, amount: e.target.value } : item))} />
                <Button type="button" variant="outline" className="shrink-0" onClick={() => setFees((prev) => prev.filter((_, i) => i !== index))} aria-label="Xóa khoản phí">
                  <X size={14} />
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={() => setFees((prev) => [...prev, { label: "", amount: "" }])}>
              <Plus size={13} /> Thêm phí
            </Button>
          </div>
        </div>

        {/* Due date & note — compact row */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
            <CalendarDays size={13} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Thanh toán</span>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 py-3">
            <CompactField label="Hạn thanh toán">
              <input className="input text-sm" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
            </CompactField>
            <CompactField label="Ghi chú">
              <input className="input text-sm" placeholder="Không bắt buộc" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
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

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <div>
            <div className="text-xs text-slate-400">Tổng hóa đơn</div>
            <div className="text-xl font-bold text-blue-700">
              {formatMoney(computed.total + (applyPreviousDebt ? previousDebt : 0))}
            </div>
            {applyPreviousDebt && previousDebt > 0 && (
              <div className="text-xs text-slate-500">
                {formatMoney(computed.total)} + nợ {formatMoney(previousDebt)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/contracts/${contract.id}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Hủy
            </Link>
            <Button type="submit" variant="primary" loading={mutation.isPending}>
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
