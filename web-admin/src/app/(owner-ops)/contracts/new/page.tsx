"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronLeft } from "lucide-react";
import { z } from "zod";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import { createContract, createTenant, describeServiceType, formatMoney, getFloorFromRoomName, getRoomArea, getServiceCategory, getServiceUnitLabel, loadRentalRooms, loadRoom, loadServiceConfigs, normalizeRoomStatus, onlyDigits, loadDeposits, loadWallets, Wallet } from "@/lib/rentalOps";
import StatusBadge from "@/components/ops/StatusBadge";

const tenantSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().regex(/^\d+$/, "Số điện thoại chỉ được chứa chữ số."),
  id_number: z.string().regex(/^\d+$/, "CCCD chỉ được chứa chữ số."),
  email: z.string().email("Email không hợp lệ.").optional().or(z.literal("")),
});

const contractSchema = z.object({
  start_date: z.string().min(1, "Vui lòng chọn ngày bắt đầu."),
  end_date: z.string().min(1, "Vui lòng chọn ngày kết thúc."),
  rent_amount: z.coerce.number().positive("Tiền thuê phải lớn hơn 0."),
  deposit_amount: z.coerce.number().nonnegative("Tiền cọc không hợp lệ."),
  supplementary_deposit: z.coerce.number().nonnegative("Tiền cọc bổ sung không hợp lệ.").optional(),
  billing_day: z.coerce.number().int().min(1, "Ngày thu phải từ 1 đến 28.").max(28, "Ngày thu phải từ 1 đến 28."),
  electric_start: z.coerce.number().nonnegative("Chỉ số điện không hợp lệ."),
  water_start: z.coerce.number().nonnegative("Chỉ số nước không hợp lệ."),
  occupant_count: z.coerce.number().int().min(1, "Số người ở trong phòng phải từ 1 trở lên."),
  note: z.string().optional(),
}).refine((data) => new Date(data.end_date).getTime() > new Date(data.start_date).getTime(), {
  message: "Ngày kết thúc phải sau ngày bắt đầu.",
  path: ["end_date"],
});

const today = new Date().toISOString().slice(0, 10);

export default function NewContractPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room_id");
  const facilityId = searchParams.get("facility_id");
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tenant, setTenant] = useState({ full_name: "", phone: "", id_number: "", email: "" });
  const [contract, setContract] = useState({
    start_date: today,
    end_date: "",
    rent_amount: "",
    deposit_amount: "",
    supplementary_deposit: "0",
    billing_day: "5",
    electric_start: "0",
    water_start: "0",
    occupant_count: "1",
    note: "",
    walletId: "",
  });

  useEffect(() => {
    if (!roomId) router.replace("/rooms");
  }, [roomId, router]);

  const roomQuery = useQuery({ queryKey: ["room", roomId], queryFn: () => loadRoom(String(roomId)), enabled: Boolean(roomId), staleTime: 60_000 });
  const vacantRoomsQuery = useQuery({ queryKey: ["rooms", "vacant", facilityId], queryFn: async () => (await loadRentalRooms()).filter((room) => ["vacant", "reserved"].includes(normalizeRoomStatus(room))), enabled: true, staleTime: 30_000 });
  const servicesQuery = useQuery({ queryKey: ["services", "active"], queryFn: () => loadServiceConfigs(true), staleTime: 60_000 });
  const depositsQuery = useQuery({ queryKey: ["deposits"], queryFn: loadDeposits, staleTime: 60_000 });
  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: loadWallets, staleTime: 60_000 });
  
  const room = roomQuery.data;
  const services = servicesQuery.data || [];
  const [selectedServiceIds, setSelectedServiceIds] = useState<Array<string>>([]);

  const roomDeposit = useMemo(() => {
    if (!roomId || !depositsQuery.data) return null;
    return depositsQuery.data.find(d => String(d.room_id) === String(roomId) && d.status === "holding");
  }, [roomId, depositsQuery.data]);

  useEffect(() => {
    if (roomDeposit && !tenant.full_name) {
      setTenant(prev => ({
        ...prev,
        full_name: roomDeposit.tenant_name || "",
        phone: roomDeposit.tenant_phone || ""
      }));
    }
  }, [roomDeposit]);

  useEffect(() => {
    if (!room) return;
    setContract((prev) => ({
      ...prev,
      rent_amount: prev.rent_amount || String(room.price || 0),
      deposit_amount: prev.deposit_amount || String(room.price || 0),
      billing_day: prev.billing_day || String(Math.min(28, Math.max(1, Number(today.slice(-2))))),
      occupant_count: prev.occupant_count || String(room.num_people || 1),
    }));
  }, [room]);

  useEffect(() => {
    if (!services.length) return;
    setSelectedServiceIds((prev) => (prev.length > 0 ? prev : services.filter((service) => service.active !== false).map((service) => service.id)));
  }, [services]);

  useEffect(() => {
    if (walletsQuery.data?.length && !contract.walletId) {
      setContract(prev => ({ ...prev, walletId: walletsQuery.data[0].id }));
    }
  }, [walletsQuery.data]);

  const monthCount = useMemo(() => {
    if (!contract.start_date || !contract.end_date) return 0;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    return Math.max(0, months);
  }, [contract.end_date, contract.start_date]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!room) throw new Error("Không tìm thấy phòng.");
      setIsSubmitting(true);
      setError("");
      
      try {
        const createdTenant = await createTenant({
          name: tenant.full_name,
          phone: tenant.phone,
          email: tenant.email,
          idCard: tenant.id_number,
        });
        
        const finalDeposit = roomDeposit 
          ? Number(roomDeposit.amount) + Number(contract.supplementary_deposit || 0)
          : Number(contract.deposit_amount || 0);

        const res = await createContract({
          roomId: room.id,
          tenantId: createdTenant.id,
          startDate: contract.start_date,
          endDate: contract.end_date || undefined,
          deposit: finalDeposit,
          rentAmount: Number(contract.rent_amount),
          billingDay: Number(contract.billing_day),
          electricStart: Number(contract.electric_start),
          waterStart: Number(contract.water_start),
          occupantCount: Number(contract.occupant_count || 1),
          note: contract.note,
          serviceIds: selectedServiceIds,
          walletId: contract.walletId || undefined,
        });
        return res;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: async (created) => {
      setSuccess(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contracts"] }),
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["facility"] }),
        queryClient.invalidateQueries({ queryKey: ["deposits"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
      // Give time to show success state
      setTimeout(() => {
        router.push(`/contracts/${created.id}`);
      }, 1500);
    },
    onError: (err: any) => {
      setError(err?.message || "Không tạo được hợp đồng.");
      setIsSubmitting(false);
    },
  });

  const nextStep = () => {
    const parsed = tenantSchema.safeParse(tenant);
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const parsedTenant = tenantSchema.safeParse(tenant);
    const parsedContract = contractSchema.safeParse(contract);
    if (!parsedTenant.success || !parsedContract.success) {
      const issues = [...(parsedTenant.success ? [] : parsedTenant.error.issues), ...(parsedContract.success ? [] : parsedContract.error.issues)];
      setFieldErrors(Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setFieldErrors({});
    mutation.mutate();
  };

  if (roomQuery.isLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/rooms" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft size={15} />
        Quay lại danh sách phòng
      </Link>
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-700">Hợp đồng</p>
        <h1 className="text-2xl font-semibold text-slate-950">Tạo hợp đồng mới</h1>
      </div>

      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2"><Check size={18} /> Tạo hợp đồng thành công! Đang chuyển hướng...</div>}

      <div className="grid gap-5 lg:grid-cols-[0.9fr_2fr]">
        <aside className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Phòng đang chọn</h2>
          {room ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-bold text-slate-950">{room.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{getFloorFromRoomName(room.name)} · {getRoomArea(room)}m²</div>
                </div>
                <StatusBadge status={normalizeRoomStatus(room)} />
              </div>
              <Info label="Giá thuê" value={formatMoney(room.price)} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Đổi phòng trống</span>
                <select
                  className="input"
                  value={room.id}
                  onChange={(event) => router.replace(`/contracts/new?room_id=${event.target.value}&facility_id=${facilityId}`)}
                >
                  {(vacantRoomsQuery.data || []).map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.price)}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">Không tìm thấy phòng hoặc phòng không còn khả dụng.</div>
          )}
        </aside>

        <form onSubmit={submit} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          {/* === KHÁCH THUÊ === */}
          <div className="mb-6">
            <h2 className="mb-4 text-base font-semibold text-slate-950 border-b border-slate-100 pb-2">Thông tin khách thuê</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Họ tên *" error={fieldErrors.full_name}><input className="input" value={tenant.full_name} onChange={(e) => setTenant((prev) => ({ ...prev, full_name: e.target.value }))} /></Field>
              <Field label="SĐT *" error={fieldErrors.phone}><input className="input" inputMode="numeric" value={tenant.phone} onChange={(e) => setTenant((prev) => ({ ...prev, phone: onlyDigits(e.target.value) }))} /></Field>
              <Field label="CCCD *" error={fieldErrors.id_number}><input className="input" inputMode="numeric" value={tenant.id_number} onChange={(e) => setTenant((prev) => ({ ...prev, id_number: onlyDigits(e.target.value) }))} /></Field>
              <Field label="Email" error={fieldErrors.email}><input className="input" value={tenant.email} onChange={(e) => setTenant((prev) => ({ ...prev, email: e.target.value }))} /></Field>
            </div>
          </div>

          {/* === CHI TIẾT HĐ === */}
          <div className="mb-6">
            <h2 className="mb-4 text-base font-semibold text-slate-950 border-b border-slate-100 pb-2">Chi tiết hợp đồng</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ngày bắt đầu *" error={fieldErrors.start_date}><input className="input" type="date" value={contract.start_date} onChange={(e) => setContract((prev) => ({ ...prev, start_date: e.target.value }))} /></Field>
              <Field label={`Ngày kết thúc *${monthCount ? ` · ${monthCount} tháng` : ""}`} error={fieldErrors.end_date}><input className="input" type="date" value={contract.end_date} onChange={(e) => setContract((prev) => ({ ...prev, end_date: e.target.value }))} /></Field>
              <Field label="Tiền thuê/tháng *" error={fieldErrors.rent_amount}><input className="input" type="number" value={contract.rent_amount} onChange={(e) => setContract((prev) => ({ ...prev, rent_amount: e.target.value }))} /></Field>

              {roomDeposit ? (
                <div className="md:col-span-2 grid gap-4 md:grid-cols-2 rounded-[8px] border border-orange-200 bg-orange-50/50 p-4">
                  <div>
                    <div className="mb-1 text-sm font-medium text-orange-800">Tiền cọc giữ phòng đã thu</div>
                    <div className="text-xl font-bold text-orange-600">{formatMoney(roomDeposit.amount)}</div>
                    <div className="mt-1 text-xs text-orange-600/80">Khách: {roomDeposit.tenant_name}</div>
                  </div>
                  <Field label="Tiền cọc bổ sung (nếu có)" error={fieldErrors.supplementary_deposit}>
                    <input className="input border-orange-200 bg-white focus:border-orange-500 focus:ring-orange-500/20" type="number" value={contract.supplementary_deposit} onChange={(e) => setContract((prev) => ({ ...prev, supplementary_deposit: e.target.value }))} />
                  </Field>
                </div>
              ) : (
                <Field label="Tiền cọc" error={fieldErrors.deposit_amount}><input className="input" type="number" value={contract.deposit_amount} onChange={(e) => setContract((prev) => ({ ...prev, deposit_amount: e.target.value }))} /></Field>
              )}

              <Field label="Ngày thu tiền hàng tháng *" error={fieldErrors.billing_day}><input className="input" type="number" min={1} max={28} value={contract.billing_day} onChange={(e) => setContract((prev) => ({ ...prev, billing_day: e.target.value }))} /></Field>
              <Field label="Số người ở trong phòng *" error={fieldErrors.occupant_count}><input className="input" type="number" min={1} value={contract.occupant_count} onChange={(e) => setContract((prev) => ({ ...prev, occupant_count: e.target.value }))} /></Field>
              <Field label="Ví thu tiền cọc *" error={fieldErrors.walletId}>
                <select className="input" value={contract.walletId} onChange={(e) => setContract((prev) => ({ ...prev, walletId: e.target.value }))}>
                  {walletsQuery.data?.map((w: Wallet) => <option key={w.id} value={w.id}>{w.name} ({formatMoney(w.balance || 0)})</option>)}
                </select>
              </Field>
              <div className="hidden md:block"></div>
              <Field label="Điện đầu kỳ (kWh) *" error={fieldErrors.electric_start}><input className="input" type="number" value={contract.electric_start} onChange={(e) => setContract((prev) => ({ ...prev, electric_start: e.target.value }))} /></Field>
              <Field label="Nước đầu kỳ (m³) *" error={fieldErrors.water_start}><input className="input" type="number" value={contract.water_start} onChange={(e) => setContract((prev) => ({ ...prev, water_start: e.target.value }))} /></Field>
            </div>
          </div>

          {/* === DỊCH VỤ === */}
          <div className="mb-6 rounded-[8px] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Dịch vụ áp dụng</div>
            <div className="space-y-2">
              {services.length === 0 ? <div className="text-sm text-slate-500">Chưa có dịch vụ nào trong bảng giá dịch vụ.</div> : services.map((service) => {
                const checked = selectedServiceIds.some((id) => String(id) === String(service.id));
                const category = getServiceCategory(service);
                const price = category === "electricity" && room?.has_ac && Number(service.unit_price_ac || 0) > 0
                  ? Number(service.unit_price_ac || 0)
                  : Number(service.unit_price || 0);

                return (
                  <label key={service.id} className="flex items-start gap-3 rounded-[8px] border border-slate-200 bg-white px-3 py-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      checked={checked}
                      onChange={(event) => setSelectedServiceIds((prev) => event.target.checked ? [...prev, service.id] : prev.filter((item) => String(item) !== String(service.id)))}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900">{service.name}</div>
                      <div className="text-xs text-slate-500">{describeServiceType(service)} · {formatMoney(price)}{getServiceUnitLabel(service)}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <Field label="Ghi chú" error={fieldErrors.note}><textarea className="input min-h-[96px]" value={contract.note} onChange={(e) => setContract((prev) => ({ ...prev, note: e.target.value }))} /></Field>

          <div className="mt-5 flex justify-end">
            <button disabled={isSubmitting || success || !room} className="rounded-[8px] bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {isSubmitting ? "Đang tạo..." : success ? "Đã xong!" : "Tạo hợp đồng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-950">{value}</div></div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>{children}{error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}</label>;
}
