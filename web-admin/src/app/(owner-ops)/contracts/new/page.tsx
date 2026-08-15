"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Home, UserRound, WalletCards } from "lucide-react";
import { z } from "zod";
import LoadingSkeleton from "@/components/ops/LoadingSkeleton";
import { createContract, createTenant, describeServiceType, formatMoney, getFloorFromRoomName, getRoomArea, getServiceCategory, getServiceUnitLabel, loadRentalRooms, loadRoom, loadServiceConfigs, normalizeRoomStatus, onlyDigits, loadDeposits, loadWallets, Wallet, loadBoardingHouses, seedDefaultServices } from "@/lib/rentalOps";
import StatusBadge from "@/components/ops/StatusBadge";
import { invalidateOwnerOpsQueries } from "@/utils/queryInvalidation";
import OperationStatusPopup from "@/components/ui/OperationStatusPopup";
import { useToast } from "@/components/ui/Toast";

const tenantSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().regex(/^\d+$/, "Số điện thoại chỉ được chứa chữ số."),
  id_number: z.string().optional().refine((val) => !val || /^\d+$/.test(val), "CCCD chỉ được chứa chữ số.").or(z.literal("")),
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
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room_id");
  const facilityId = searchParams.get("facility_id");
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

  const housesQuery = useQuery({ queryKey: ["facilities"], queryFn: loadBoardingHouses, staleTime: 60_000 });
  const allRoomsQuery = useQuery({ queryKey: ["rooms", "all"], queryFn: () => loadRentalRooms(), staleTime: 30_000 });
  const roomQuery = useQuery({ queryKey: ["room", roomId], queryFn: () => loadRoom(String(roomId)), enabled: Boolean(roomId), staleTime: 60_000 });
  const vacantRoomsQuery = useQuery({ queryKey: ["rooms", "vacant", facilityId], queryFn: async () => (await loadRentalRooms()).filter((room) => ["vacant", "reserved"].includes(normalizeRoomStatus(room))), enabled: true, staleTime: 30_000 });
  const servicesQuery = useQuery({ queryKey: ["services", "active"], queryFn: () => loadServiceConfigs(true), staleTime: 60_000 });
  const depositsQuery = useQuery({ queryKey: ["deposits"], queryFn: loadDeposits, staleTime: 60_000 });
  const walletsQuery = useQuery({ queryKey: ["wallets"], queryFn: loadWallets, staleTime: 60_000 });
  
  const room = roomQuery.data;
  const services = useMemo(() => servicesQuery.data || [], [servicesQuery.data]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Array<string>>([]);
  const [seedingServices, setSeedingServices] = useState(false);

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
  }, [roomDeposit, tenant.full_name]);

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
  }, [walletsQuery.data, contract.walletId]);

  const monthCount = useMemo(() => {
    if (!contract.start_date || !contract.end_date) return 0;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    return Math.max(0, months);
  }, [contract.end_date, contract.start_date]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<"idle" | "tenant" | "contract" | "redirecting">("idle");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!room) throw new Error("Không tìm thấy phòng.");
      setIsSubmitting(true);
      setSubmissionStage("tenant");
      setError("");
      
      try {
        const createdTenant = await createTenant({
          name: tenant.full_name,
          phone: tenant.phone,
          email: tenant.email,
          idCard: tenant.id_number,
        });
        setSubmissionStage("contract");
        
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
    onSuccess: (created) => {
      setSuccess(true);
      setSubmissionStage("redirecting");
      void invalidateOwnerOpsQueries(queryClient, {
        facilityId,
        roomId,
        contractId: created?.id,
      });
      showToast("Tạo hợp đồng thành công.", "success");
      window.setTimeout(() => router.replace(`/contracts/${created.id}`), 400);
    },
    onError: (err: any) => {
      const message = err?.message || "Không tạo được hợp đồng.";
      setError(message);
      setSubmissionStage("idle");
      showToast(message, "error");
      setIsSubmitting(false);
    },
  });

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

  const hasFacilities = (housesQuery.data || []).length > 0;
  const allRooms = allRoomsQuery.data || [];
  const hasRooms = allRooms.length > 0;
  const activeServices = servicesQuery.data || [];
  const hasElectric = activeServices.some(s => s.name.toLowerCase().includes("điện") || s.name.toLowerCase().includes("electric") || s.icon === "⚡");
  const hasWater = activeServices.some(s => s.name.toLowerCase().includes("nước") || s.name.toLowerCase().includes("water") || s.icon === "💧");
  const hasWifi = activeServices.some(s => s.name.toLowerCase().includes("wifi") || s.name.toLowerCase().includes("internet") || s.name.toLowerCase().includes("mạng") || s.icon === "📶");
  const hasBasicServices = hasElectric && hasWater && hasWifi;

  // Service pricing is optional at contract creation time. Owners may create a
  // rent-only contract and add or change its applied services later.
  const showWizard = !hasFacilities || !hasRooms || !activeServices.length;

  const handleSeedServices = async () => {
    setSeedingServices(true);
    try {
      await seedDefaultServices();
      await queryClient.invalidateQueries({ queryKey: ["services", "active"] });
      showToast("Đã tạo bộ dịch vụ mẫu. Bạn có thể tiếp tục tạo hợp đồng.", "success");
    } catch (err: any) {
      showToast(err?.message || "Không thể tạo bộ dịch vụ mẫu.", "error");
    } finally {
      setSeedingServices(false);
    }
  };

  if (housesQuery.isLoading || vacantRoomsQuery.isLoading || servicesQuery.isLoading || allRoomsQuery.isLoading || roomQuery.isLoading) {
    return <LoadingSkeleton rows={4} />;
  }

  if (showWizard) {
    return (
      <div className="mx-auto max-w-2xl mt-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
          <div className="text-center mb-8">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 text-3xl mb-4">🚀</span>
            <h1 className="text-2xl font-black text-slate-900">Thiết lập hệ thống ban đầu</h1>
            <p className="text-slate-500 mt-2 text-sm">Để lập hợp đồng thuê đầu tiên, bạn chỉ cần có cơ sở và ít nhất một phòng. Dịch vụ có thể thiết lập sau.</p>
          </div>

          <div className="space-y-4">
            {/* Step 1: Boarding House */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${hasFacilities ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <div className="flex items-center gap-3">
                <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${hasFacilities ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {hasFacilities ? "✓" : "1"}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Thiết lập cơ sở (Nhà trọ)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{hasFacilities ? "Đã tạo ít nhất 1 cơ sở" : "Yêu cầu tạo ít nhất 1 cơ sở để quản lý phòng"}</p>
                </div>
              </div>
              {!hasFacilities && (
                <Link href="/owner/boarding-houses" className="text-xs font-black text-blue-600 hover:text-blue-800 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm transition-all hover:bg-slate-50">
                  Thêm ngay →
                </Link>
              )}
            </div>

            {/* Step 2: Rooms */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${hasRooms ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <div className="flex items-center gap-3">
                <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${hasRooms ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {hasRooms ? "✓" : "2"}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Thiết lập danh sách phòng</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{hasRooms ? "Đã tạo danh sách phòng" : "Yêu cầu thêm phòng vào cơ sở của bạn"}</p>
                </div>
              </div>
              {!hasRooms && (
                <Link href={hasFacilities ? "/rooms" : "#"} onClick={(e: React.MouseEvent) => { if (!hasFacilities) { e.preventDefault(); alert("Vui lòng thêm cơ sở trước!"); } }} className={`text-xs font-black rounded-lg px-3 py-2 shadow-sm transition-all ${hasFacilities ? 'text-blue-600 hover:text-blue-800 bg-white border border-slate-200 hover:bg-slate-50' : 'text-slate-400 bg-slate-100 border border-slate-100 cursor-not-allowed'}`}>
                  Thêm ngay →
                </Link>
              )}
            </div>

            {/* Step 3: Service Configs */}
            <div className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-all ${hasBasicServices ? 'border-emerald-100 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
              <div className="flex items-center gap-3">
                <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${hasBasicServices ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {hasBasicServices ? "✓" : "3"}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cấu hình dịch vụ <span className="font-medium text-amber-700">(bắt buộc)</span></h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {!hasElectric && "Thiếu dịch vụ Điện. "}
                    {!hasWater && "Thiếu dịch vụ Nước. "}
                    {!hasWifi && "Thiếu dịch vụ Wifi. "}
                    {hasBasicServices ? "Đã thiết lập đầy đủ dịch vụ cơ bản" : "Hợp đồng cần ít nhất một dịch vụ có giá rõ ràng"}
                  </p>
                </div>
              </div>
              {!hasBasicServices && <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row">
                <button type="button" onClick={handleSeedServices} disabled={seedingServices} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60">
                  {seedingServices ? "Đang tạo..." : "Tạo bộ mẫu"}
                </button>
                <Link href="/owner/services" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-blue-600 hover:bg-slate-50">
                  Tự cấu hình →
                </Link>
              </div>}
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (roomQuery.isLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/rooms" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
        <ArrowLeft size={15} />
        Quay lại danh sách phòng
      </Link>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl font-bold leading-7 tracking-[-0.02em] text-slate-950 sm:text-[22px]">Tạo hợp đồng mới</h1>
        <p className="mt-1 text-sm leading-5 text-slate-600">Nhập thông tin khách thuê và điều khoản hợp đồng.</p>
      </div>

      {error && <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <OperationStatusPopup
        open={submissionStage !== "idle"}
        status={submissionStage === "redirecting" ? "success" : "loading"}
        title={submissionStage === "redirecting" ? "Tạo hợp đồng thành công" : "Đang tạo hợp đồng"}
        description={submissionStage === "tenant"
          ? "Đang lưu thông tin khách thuê..."
          : submissionStage === "contract"
            ? "Đang tạo hợp đồng, dịch vụ và ghi nhận tiền cọc..."
            : "Đang chuyển đến chi tiết hợp đồng..."}
      />

      {room ? (
        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Home size={20} /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-bold text-slate-950">Phòng {room.name}</span><StatusBadge status={normalizeRoomStatus(room)} /></div>
              <p className="mt-0.5 text-sm text-slate-600">{getFloorFromRoomName(room.name)} · {getRoomArea(room)}m² · {formatMoney(room.price)}/tháng</p>
            </div>
          </div>
          <label className="w-full sm:w-64">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Đổi phòng</span>
            <select className="input" value={room.id} onChange={(event) => router.replace(`/contracts/new?room_id=${event.target.value}&facility_id=${facilityId || ""}`)}>
              {(vacantRoomsQuery.data || []).map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.price)}</option>)}
            </select>
          </label>
        </div>
      ) : <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không tìm thấy phòng hoặc phòng không còn khả dụng.</div>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form id="new-contract-form" onSubmit={submit} className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          <FormSection icon={<UserRound size={18} />} title="Khách thuê" description="Thông tin người đứng tên hợp đồng.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ và tên *" error={fieldErrors.full_name}><input autoFocus autoComplete="name" className="input" placeholder="Nguyễn Văn An" value={tenant.full_name} onChange={(e) => setTenant((prev) => ({ ...prev, full_name: e.target.value }))} /></Field>
              <Field label="Số điện thoại *" error={fieldErrors.phone}><input autoComplete="tel" className="input" inputMode="tel" placeholder="0901 234 567" value={tenant.phone} onChange={(e) => setTenant((prev) => ({ ...prev, phone: onlyDigits(e.target.value) }))} /></Field>
              <Field label="CCCD" hint="Không bắt buộc" error={fieldErrors.id_number}><input autoComplete="off" className="input" inputMode="numeric" placeholder="Nhập số CCCD" value={tenant.id_number} onChange={(e) => setTenant((prev) => ({ ...prev, id_number: onlyDigits(e.target.value) }))} /></Field>
              <Field label="Email" hint="Không bắt buộc" error={fieldErrors.email}><input autoComplete="email" className="input" type="email" placeholder="email@example.com" value={tenant.email} onChange={(e) => setTenant((prev) => ({ ...prev, email: e.target.value }))} /></Field>
            </div>
          </FormSection>

          <FormSection icon={<CalendarDays size={18} />} title="Thời hạn và tiền thuê" description="Các điều khoản chính của hợp đồng.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ngày bắt đầu *" error={fieldErrors.start_date}><input className="input" type="date" value={contract.start_date} onChange={(e) => setContract((prev) => ({ ...prev, start_date: e.target.value }))} /></Field>
              <Field label="Ngày kết thúc *" hint={monthCount ? `${monthCount} tháng` : undefined} error={fieldErrors.end_date}><input className="input" type="date" value={contract.end_date} onChange={(e) => setContract((prev) => ({ ...prev, end_date: e.target.value }))} /></Field>
              <Field label="Tiền thuê mỗi tháng *" error={fieldErrors.rent_amount}><input className="input" min={1} inputMode="numeric" type="number" value={contract.rent_amount} onChange={(e) => setContract((prev) => ({ ...prev, rent_amount: e.target.value }))} /></Field>
              <Field label="Ngày thu tiền *" hint="Từ ngày 1 đến 28" error={fieldErrors.billing_day}><input className="input" type="number" min={1} max={28} value={contract.billing_day} onChange={(e) => setContract((prev) => ({ ...prev, billing_day: e.target.value }))} /></Field>
              <Field label="Số người ở *" error={fieldErrors.occupant_count}><input className="input" type="number" min={1} value={contract.occupant_count} onChange={(e) => setContract((prev) => ({ ...prev, occupant_count: e.target.value }))} /></Field>
            </div>
          </FormSection>

          <FormSection icon={<WalletCards size={18} />} title="Tiền cọc" description="Khoản thu được ghi vào ví đã chọn.">
            {roomDeposit ? (
              <div className="grid gap-4 rounded-lg bg-amber-50 p-4 sm:grid-cols-2">
                <div><p className="text-sm font-semibold text-amber-900">Đã thu cọc giữ phòng</p><p className="mt-1 text-xl font-bold text-amber-700">{formatMoney(roomDeposit.amount)}</p><p className="mt-1 text-xs text-amber-800">Khách: {roomDeposit.tenant_name}</p></div>
                <Field label="Thu cọc bổ sung" hint="Nhập 0 nếu không thu thêm" error={fieldErrors.supplementary_deposit}><input className="input bg-white" min={0} type="number" value={contract.supplementary_deposit} onChange={(e) => setContract((prev) => ({ ...prev, supplementary_deposit: e.target.value }))} /></Field>
              </div>
            ) : <Field label="Tiền cọc" error={fieldErrors.deposit_amount}><input className="input sm:max-w-xs" min={0} type="number" value={contract.deposit_amount} onChange={(e) => setContract((prev) => ({ ...prev, deposit_amount: e.target.value }))} /></Field>}
            <div className="mt-4">
              <Field label="Ví nhận tiền cọc *" error={fieldErrors.walletId}>
                {walletsQuery.data && walletsQuery.data.length === 0 ? <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Chưa có ví nhận tiền. <a href="/owner/settings" className="font-semibold text-blue-700 underline" target="_blank">Tạo ví trong Cài đặt</a>.</div> : <select className="input sm:max-w-md" value={contract.walletId} onChange={(e) => setContract((prev) => ({ ...prev, walletId: e.target.value }))}>{walletsQuery.data?.map((w: Wallet) => <option key={w.id} value={w.id}>{w.name} · {formatMoney(w.balance || 0)}</option>)}</select>}
              </Field>
            </div>
          </FormSection>

          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-slate-900 sm:px-6"><span>Dịch vụ và chỉ số đầu kỳ <span className="ml-1 text-sm font-normal text-slate-500">({selectedServiceIds.length} dịch vụ)</span></span><span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span></summary>
            <div className="border-t border-slate-100 px-5 pb-6 pt-5 sm:px-6">
              <div className="mb-5 grid gap-4 sm:grid-cols-2">
                <Field label="Điện đầu kỳ (kWh) *" error={fieldErrors.electric_start}><input className="input" type="number" min={0} value={contract.electric_start} onChange={(e) => setContract((prev) => ({ ...prev, electric_start: e.target.value }))} /></Field>
                <Field label="Nước đầu kỳ (m³) *" error={fieldErrors.water_start}><input className="input" type="number" min={0} value={contract.water_start} onChange={(e) => setContract((prev) => ({ ...prev, water_start: e.target.value }))} /></Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {services.length === 0 ? <p className="text-sm text-slate-600">Chưa có dịch vụ. Bạn vẫn có thể tạo hợp đồng chỉ thu tiền phòng.</p> : services.map((service) => {
                  const checked = selectedServiceIds.some((id) => String(id) === String(service.id));
                  const category = getServiceCategory(service);
                  const price = category === "electricity" && room?.has_ac && Number(service.unit_price_ac || 0) > 0 ? Number(service.unit_price_ac || 0) : Number(service.unit_price || 0);
                  return <label key={service.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${checked ? "border-blue-200 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={checked} onChange={(event) => setSelectedServiceIds((prev) => event.target.checked ? [...prev, service.id] : prev.filter((item) => String(item) !== String(service.id)))} /><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{service.name}</span><span className="mt-0.5 block text-xs text-slate-600">{describeServiceType(service)} · {formatMoney(price)}{getServiceUnitLabel(service)}</span></span></label>;
                })}
              </div>
              <div className="mt-5"><Field label="Ghi chú" hint="Không bắt buộc" error={fieldErrors.note}><textarea className="input min-h-[88px] resize-y" placeholder="Điều khoản hoặc lưu ý riêng..." value={contract.note} onChange={(e) => setContract((prev) => ({ ...prev, note: e.target.value }))} /></Field></div>
            </div>
          </details>
        </form>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-5">
          <h2 className="font-bold text-slate-950">Kiểm tra trước khi tạo</h2>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            <SummaryRow label="Phòng" value={room?.name || "—"} />
            <SummaryRow label="Khách thuê" value={tenant.full_name || "Chưa nhập"} muted={!tenant.full_name} />
            <SummaryRow label="Thời hạn" value={monthCount ? `${monthCount} tháng` : "Chưa chọn"} muted={!monthCount} />
            <SummaryRow label="Tiền thuê" value={formatMoney(Number(contract.rent_amount || 0))} />
            <SummaryRow label="Tiền cọc" value={formatMoney(roomDeposit ? Number(roomDeposit.amount || 0) + Number(contract.supplementary_deposit || 0) : Number(contract.deposit_amount || 0))} />
          </dl>
          <button form="new-contract-form" type="submit" disabled={isSubmitting || success || !room} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? "Đang tạo hợp đồng..." : success ? "Đã tạo hợp đồng" : "Tạo hợp đồng"}
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">Kiểm tra thông tin trước khi tạo. Bạn có thể chỉnh sửa hợp đồng sau.</p>
        </aside>
      </div>
    </div>
  );
}

function FormSection({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <section className="p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">{icon}</span><div><h2 className="font-bold text-slate-950">{title}</h2><p className="mt-0.5 text-sm text-slate-600">{description}</p></div></div>{children}</section>;
}

function SummaryRow({ label, value, muted = false }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return <div className="flex items-start justify-between gap-4 py-3"><dt className="text-slate-600">{label}</dt><dd className={`text-right font-semibold ${muted ? "text-slate-400" : "text-slate-950"}`}>{value}</dd></div>;
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-slate-700"><span>{label}</span>{hint ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}</span>{children}{error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}</label>;
}
