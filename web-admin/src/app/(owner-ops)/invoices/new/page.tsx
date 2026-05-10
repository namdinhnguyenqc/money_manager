"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X } from "lucide-react";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import { createInvoiceForContract, currentPeriod, describeServiceType, formatMoney, getServiceUnitLabel, loadContract, loadLatestMeterReadings } from "@/lib/rentalOps";
import { calculateProratedRent } from "@/utils/rentCalc";

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

  useEffect(() => {
    if (!contractId) router.replace("/contracts");
  }, [contractId, router]);

  const contractQuery = useQuery({ queryKey: ["contracts", contractId], queryFn: () => loadContract(String(contractId)), enabled: Boolean(contractId), staleTime: 60_000 });
  const contract = contractQuery.data;

  useEffect(() => {
    if (!contract) return;
    const day = String(Math.min(28, Math.max(1, Number(contract.billing_day || 5)))).padStart(2, "0");
    setForm((prev) => ({ ...prev, dueDate: prev.dueDate || `${period.year}-${String(period.month).padStart(2, "0")}-${day}` }));
  }, [contract]);

  const appliedServices = contract?.applied_services_snapshot || [];
  
  // Dynamic electricity price detection if snapshot is missing
  const defaultElecPrice = (contract?.has_ac) ? 4000 : 3500;
  const defaultWaterPrice = 15000;

  const electricityService = appliedServices.find((service) => String(service.category || "").toLowerCase() === "electricity") || {
    service_id: 0,
    name: "Tiền điện",
    category: "electricity",
    type: "metered",
    applied_unit_price: defaultElecPrice,
    amount: null,
  };
  const waterService = appliedServices.find((service) => String(service.category || "").toLowerCase() === "water") || {
    service_id: 0,
    name: "Tiền nước",
    category: "water",
    type: "metered",
    applied_unit_price: defaultWaterPrice,
    amount: null,
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
    return () => {
      mounted = false;
    };
  }, [contract, electricityIsMetered, waterIsMetered]);

  const isFirstMonth = useMemo(() => {
    if (!contract?.start_date) return false;
    const startDate = new Date(contract.start_date);
    return startDate.getMonth() + 1 === period.month && startDate.getFullYear() === period.year;
  }, [contract?.start_date]);

  const proratedInfo = useMemo(() => {
    if (!contract || !isFirstMonth || !contract.start_date) return null;
    const startDate = new Date(contract.start_date);
    const endDate = new Date(period.year, period.month, 0); // last day of month
    return calculateProratedRent(Number(contract.rent_amount || 0), startDate, endDate);
  }, [contract, isFirstMonth]);

  const computed = useMemo(() => {
    const electricUsed = Math.max(0, Number(form.electricNew || 0) - Number(form.electricOld || 0));
    const waterUsed = Math.max(0, Number(form.waterNew || 0) - Number(form.waterOld || 0));
    const electricType = String(electricityService?.type || "").toLowerCase();
    const waterType = String(waterService?.type || "").toLowerCase();
    
    const occupantCount = Number(contract?.occupant_count || 1);

    const electricAmount = electricityService
      ? (electricType === "meter" || electricType === "metered")
        ? electricUsed * Number(electricityService.applied_unit_price || 0)
        : electricType === "per_person"
          ? occupantCount * Number(electricityService.applied_unit_price || 0)
          : Number(electricityService.amount || electricityService.applied_unit_price || 0)
      : 0;

    const waterAmount = waterService
      ? (waterType === "meter" || waterType === "metered")
        ? waterUsed * Number(waterService.applied_unit_price || 0)
        : waterType === "per_person"
          ? occupantCount * Number(waterService.applied_unit_price || 0)
          : Number(waterService.amount || waterService.applied_unit_price || 0)
      : 0;

    const serviceAmount = otherServices.reduce((sum, item) => {
      const type = String(item.type || "").toLowerCase();
      const amount = type === "per_person" 
        ? occupantCount * Number(item.applied_unit_price || 0)
        : Number(item.amount || item.applied_unit_price || 0);
      return sum + amount;
    }, 0);

    const otherAmount = fees.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const rent = proratedInfo ? proratedInfo.totalAmount : Number(contract?.rent_amount || 0);
    
    return { 
      electricUsed, 
      waterUsed, 
      electricAmount, 
      waterAmount, 
      serviceAmount, 
      otherAmount, 
      rent, 
      total: rent + electricAmount + waterAmount + serviceAmount + otherAmount 
    };
  }, [contract?.rent_amount, contract?.occupant_count, electricityService, fees, form.electricNew, form.electricOld, form.waterNew, form.waterOld, otherServices, waterService, proratedInfo]);

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
        items: fees.filter((item) => item.label.trim()).map((item) => ({ name: item.label.trim(), amount: Number(item.amount || 0) })),
      });
    },
    onSuccess: async (invoice) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["contracts", contractId, "invoices"] }),
      ]);
      router.push(`/invoices/${invoice.id}`);
    },
    onError: (err: any) => setError(err?.message || "Không tạo được hóa đơn."),
  });

  if (contractQuery.isLoading) return <LoadingSkeleton rows={5} />;
  if (!contract) return <div className="rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không tìm thấy hợp đồng.</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/contracts/${contract.id}`} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft size={15} />
        Quay lại hợp đồng
      </Link>
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-700">Hóa đơn</p>
        <h1 className="text-2xl font-semibold text-slate-950">Tạo hóa đơn</h1>
      </div>

      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-5 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-semibold text-slate-950">Phòng {contract.room_name} · Khách: {contract.tenant_name} · Kỳ: T{period.month}/{period.year}</div>
        <div className="mt-2 flex flex-col gap-2 text-sm text-slate-500">
          <div>Tiền phòng cố định từ hợp đồng: <span className="font-semibold text-slate-900">{formatMoney(contract.rent_amount)}</span></div>
          {proratedInfo && (
            <div className="rounded-[8px] bg-blue-50 px-3 py-2 text-blue-800 border border-blue-100">
              <span className="font-semibold block mb-1">Tháng đầu tiên tính theo ngày thực tế:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-blue-700/80 text-xs">
                <li>Vào ngày: {new Date(contract.start_date!).toLocaleDateString("vi-VN")}</li>
                <li>Công thức: {proratedInfo.breakdown}</li>
              </ul>
              <div className="mt-2 font-bold text-blue-700">Tiền phòng tháng này: {formatMoney(proratedInfo.totalAmount)}</div>
            </div>
          )}
        </div>
      </div>

      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        {electricityService ? (
          <Section title="Điện">
            {electricityIsMetered ? (
              <MeterRows oldValue={form.electricOld} newValue={form.electricNew} price={String(electricityService.applied_unit_price || 0)} unit="kWh" used={computed.electricUsed} amount={computed.electricAmount} onOld={(value) => setForm((prev) => ({ ...prev, electricOld: value }))} onNew={(value) => setForm((prev) => ({ ...prev, electricNew: value }))} readOnlyPrice />
            ) : (
              <StaticServiceRow 
                label={electricityService.name} 
                description={
                  String(electricityService.type).toLowerCase() === "per_person"
                    ? `${contract.occupant_count || 1} người × ${formatMoney(electricityService.applied_unit_price)}`
                    : `${describeServiceType(electricityService)} · ${formatMoney(electricityService.applied_unit_price)}${getServiceUnitLabel(electricityService)}`
                } 
                amount={computed.electricAmount} 
              />
            )}
          </Section>
        ) : null}
        {waterService ? (
          <Section title="Nước">
            {waterIsMetered ? (
              <MeterRows oldValue={form.waterOld} newValue={form.waterNew} price={String(waterService.applied_unit_price || 0)} unit="m³" used={computed.waterUsed} amount={computed.waterAmount} onOld={(value) => setForm((prev) => ({ ...prev, waterOld: value }))} onNew={(value) => setForm((prev) => ({ ...prev, waterNew: value }))} readOnlyPrice />
            ) : (
              <StaticServiceRow
                label={waterService.name}
                description={
                  String(waterService.type).toLowerCase() === "per_person"
                    ? `${contract.occupant_count || 1} người × ${formatMoney(waterService.applied_unit_price)}`
                    : `${describeServiceType(waterService)} · ${formatMoney(waterService.applied_unit_price)}${getServiceUnitLabel(waterService)}`
                }
                amount={computed.waterAmount}
              />
            )}
          </Section>
        ) : null}
        {otherServices.length > 0 ? (
          <Section title="Dịch vụ theo hợp đồng">
            <div className="space-y-2">
              {otherServices.map((service) => {
                const isPerPerson = String(service.type).toLowerCase() === "per_person";
                const amount = isPerPerson 
                  ? Number(contract.occupant_count || 1) * Number(service.applied_unit_price || 0)
                  : Number(service.amount || service.applied_unit_price || 0);
                
                return (
                  <div key={service.service_id} className="flex items-center justify-between rounded-[8px] bg-slate-50 px-3 py-2.5 text-sm">
                    <div>
                      <div className="font-medium text-slate-900">{service.name}</div>
                      <div className="text-xs text-slate-500">
                        {isPerPerson 
                          ? `${contract.occupant_count || 1} người × ${formatMoney(service.applied_unit_price)}` 
                          : `${formatMoney(service.applied_unit_price)} / mặc định`
                        }
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900">{formatMoney(amount)}</div>
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}
        <Section title="Phí khác">
          <div className="space-y-2">
            {fees.map((fee, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-[1fr_160px_36px]">
                <input className="input" placeholder="Tên phí" value={fee.label} onChange={(e) => setFees((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, label: e.target.value } : item))} />
                <input className="input" type="number" placeholder="Số tiền" value={fee.amount} onChange={(e) => setFees((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, amount: e.target.value } : item))} />
                <button type="button" onClick={() => setFees((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="flex h-10 items-center justify-center rounded-[8px] border border-slate-200 text-slate-500"><X size={16} /></button>
              </div>
            ))}
            <button type="button" onClick={() => setFees((prev) => [...prev, { label: "", amount: "" }])} className="inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Plus size={15} /> Thêm phí</button>
          </div>
        </Section>
        <Section title="Thông tin thanh toán">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Hạn thanh toán</span>
            <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          </label>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Ghi chú</span>
            <textarea className="input min-h-[90px]" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} />
          </label>
        </Section>

        <div className="sticky bottom-0 flex flex-col gap-3 rounded-[8px] border border-slate-200 bg-white p-4 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-500">Tổng cộng</div>
            <div className="text-2xl font-bold text-blue-700">{formatMoney(computed.total)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/contracts/${contract.id}`} className="rounded-[8px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Hủy</Link>
            <button type="submit" disabled={mutation.isPending} className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{mutation.isPending ? "Đang tạo..." : "Tạo và gửi luôn"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold text-slate-950">{title}</h2>{children}</section>;
}

function MeterRows({ oldValue, newValue, price, unit, used, amount, onOld, onNew, readOnlyPrice = false }: { oldValue: string; newValue: string; price: string; unit: string; used: number; amount: number; onOld: (value: string) => void; onNew: (value: string) => void; readOnlyPrice?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Chỉ số đầu"><input className="input" type="number" value={oldValue} onChange={(e) => onOld(e.target.value)} /></Field>
      <Field label="Chỉ số cuối"><input className="input" type="number" value={newValue} onChange={(e) => onNew(e.target.value)} /></Field>
      <Field label={`Số dùng (${unit})`}><div className="rounded-[8px] bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900">{used}</div></Field>
      <Field label={`Đơn giá (đ/${unit})`}>{readOnlyPrice ? <div className="rounded-[8px] bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900">{price}</div> : <input className="input" type="number" value={price} readOnly />}</Field>
      <div className="md:col-span-2 rounded-[8px] bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700">Thành tiền: {formatMoney(amount)}</div>
    </div>
  );
}

function StaticServiceRow({ label, description, amount }: { label: string; description: string; amount: number }) {
  return (
    <div className="rounded-[8px] bg-blue-50 px-3 py-3">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-xs text-slate-600">{description}</div>
      <div className="mt-2 text-sm font-semibold text-blue-700">Thành tiền: {formatMoney(amount)}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}
