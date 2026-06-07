"use client";

import { z } from "zod";
import { apiGet, apiPost, apiDelete, apiPatch } from "@/utils/apiClient";
import type { ContractStatus, InvoiceStatus, RoomStatus } from "@/components/ops/StatusBadge";

export type TenantInput = {
  name: string;
  phone?: string;
  email?: string;
  idCard?: string;
  address?: string;
};

export type TenantValidationResult =
  | { ok: true; data: Required<Pick<TenantInput, "name" | "phone">> & Pick<TenantInput, "idCard" | "email" | "address"> }
  | { ok: false; fieldErrors: Record<string, string> };

export class RentalValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors)[0] || "Thông tin khách thuê không hợp lệ.");
    this.name = "RentalValidationError";
    this.fieldErrors = fieldErrors;
  }
}

const tenantInputSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên khách thuê."),
  phone: z.string().trim().length(10, "Số điện thoại phải có đúng 10 số.").regex(/^\d+$/, "Số điện thoại chỉ được chứa chữ số."),
  email: z.string().trim().optional().refine((value) => !value || z.string().email().safeParse(value).success, "Email không hợp lệ."),
  idCard: z.string().trim().optional().refine((value) => !value || (value.length === 12 && /^\d+$/.test(value)), "CCCD phải có đúng 12 số."),
  address: z.string().trim().optional(),
});

export function onlyDigits(value: string, maxLength?: number) {
  const digits = String(value || "").replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

export function validateTenantInput(input: TenantInput): TenantValidationResult {
  let cleanPhone = onlyDigits(input.phone ?? "");
  if (cleanPhone.startsWith("84") && cleanPhone.length === 11) {
    cleanPhone = "0" + cleanPhone.slice(2);
  }

  const parsed = tenantInputSchema.safeParse({
    ...input,
    name: input.name ?? "",
    phone: cleanPhone,
    idCard: onlyDigits(input.idCard ?? ""),
    email: input.email ?? "",
    address: input.address ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])),
    };
  }
  return { ok: true, data: parsed.data };
}

export function getTenantValidationMessage(errors: Record<string, string>) {
  return Object.values(errors).filter(Boolean).join(" ");
}

export type BoardingHouse = {
  id: string;
  name: string;
  address?: string;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
  isPublic?: boolean;
};

export type RentalRoom = {
  id: string;
  owner_room_id?: string | null;
  name: string;
  price: number;
  area?: number;
  max_people?: number;
  status?: "vacant" | "occupied" | "maintenance" | string;
  has_ac?: boolean;
  num_people?: number;
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_phone?: string | null;
  tenant_id_card?: string | null;
  tenant_address?: string | null;
  tenant_email?: string | null;
  contract_id?: string | null;
  deposit?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  rent_amount?: number | null;
  billing_day?: number | null;
  note?: string | null;
  latest_invoice_id?: string | null;
  latest_invoice_label?: string | null;
  latest_invoice_status?: "PAID" | "PARTIAL" | "UNPAID" | "READY_TO_BILL" | "VACANT" | string | null;
  latest_invoice_total?: number;
  outstanding_amount?: number;
  is_expired?: boolean;
  boarding_house_id?: string;
};

export type ContractView = {
  id: string;
  room_id: string;
  facility_id?: string;
  room_name: string;
  room_price?: number;
  has_ac?: boolean;
  tenant_name: string;
  tenant_phone?: string;
  tenant_id_card?: string;
  tenant_email?: string;
  tenant_address?: string;
  start_date?: string | null;
  end_date?: string | null;
  rent_amount: number;
  deposit_amount?: number;
  billing_day?: number;
  electric_start?: number;
  water_start?: number;
  occupant_count?: number | null;
  applied_services_snapshot?: AppliedServiceSnapshot[] | null;
  note?: string;
  status: ContractStatus;
};

export type ServiceConfig = {
  id: string;
  name: string;
  type: "fixed" | "per_person" | "per_room" | "metered" | "meter" | string;
  unit_price: number;
  unit_price_ac?: number;
  unit?: string;
  icon?: string | null;
  active?: boolean;
};

export type AppliedServiceSnapshot = {
  service_id: string;
  name: string;
  category: "electricity" | "water" | "wifi" | "trash" | "parking" | "other" | string;
  type: "fixed" | "per_person" | "per_room" | "metered" | "meter" | string;
  unit?: string;
  display_unit?: string;
  unit_price: number;
  unit_price_ac?: number;
  applied_unit_price: number;
  occupant_count?: number | null;
  quantity?: number | null;
  amount?: number | null;
  is_metered?: boolean;
};

export type OwnerRoom = {
  id: string;
  rentalRoomId?: string | null;
  name: string;
  price: number;
  status?: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | string;
  tenantName?: string | null;
  contractId?: string | null;
  latestInvoiceStatus?: string | null;
};

export type Invoice = {
  id: string;
  room_id: string;
  contract_id: string;
  month: number;
  year: number;
  room_fee?: number;
  total_amount: number;
  paid_amount?: number;
  previous_debt?: number;
  status?: string;
  room_name?: string;
  tenant_name?: string;
  tenant_phone?: string;
  elec_old?: number | null;
  elec_new?: number | null;
  water_old?: number | null;
  water_new?: number | null;
  items?: Array<{ id?: string; name: string; detail?: string; amount: number }>;
  transaction_id?: string | null;
  payment_code?: string | null;
  paymentCode?: string | null;
  payment_channel_id?: string | null;
  paymentChannelId?: string | null;
  payment_channel?: PaymentChannel | null;
  remaining_amount?: number;
  remainingAmount?: number;
  created_at?: string;
  updated_at?: string;
};

export type Wallet = {
  id: string;
  name: string;
  balance?: number;
  type?: string;
  color?: string;
};

export type BankConfig = {
  id?: string;
  bank_id: string;
  account_no: string;
  account_name: string;
  qr_uri?: string | null;
};

export type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description?: string;
  date: string;
  wallet_id?: string;
  wallet_name?: string;
  category_id?: string;
  category_name?: string;
  invoice_id?: string | null;
  source?: string;
  external_ref?: string | null;
  metadata?: Record<string, any>;
};

export type PaymentChannel = {
  id: string;
  provider: "sepay" | "bank_transfer" | "cash" | "manual" | string;
  display_name?: string;
  displayName?: string;
  bank_id?: string | null;
  bankId?: string | null;
  account_no?: string | null;
  accountNo?: string | null;
  account_name?: string | null;
  accountName?: string | null;
  wallet_id?: string | null;
  walletId?: string | null;
  enabled?: boolean;
  auto_reconcile_enabled?: boolean;
  autoReconcileEnabled?: boolean;
  is_default?: boolean;
  isDefault?: boolean;
  config?: Record<string, any>;
};

export type FacilityRoomSummary = {
  total: number;
  vacant: number;
  occupied: number;
  maintenance: number;
};

export const formatMoney = (value?: number | null) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(value || 0)))} ₫`;

export const getInvoiceRemainingAmount = (invoice?: Invoice | null) => {
  if (!invoice) return 0;
  return Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
};

export const buildInvoiceQrUrl = (invoice: Invoice, fallback?: { bankId?: string; accountNo?: string }) => {
  const channel = invoice.payment_channel;
  const bankId = channel?.bank_id || channel?.bankId || fallback?.bankId || "";
  const accountNo = channel?.account_no || channel?.accountNo || fallback?.accountNo || "";
  const amount = getInvoiceRemainingAmount(invoice) || Number(invoice.total_amount || 0);
  const addInfo = invoice.payment_code || invoice.paymentCode || "";

  if (!bankId || !accountNo || !addInfo) return "";
  return `https://img.vietqr.io/image/${String(bankId).replace(/\s/g, "")}-${String(accountNo).replace(/\s/g, "")}-compact2.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(addInfo)}`;
};

export const currentPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

export const normalizeInvoiceStatus = (invoice?: Invoice | null) => {
  if (!invoice) return "draft" as InvoiceStatus;
  
  const total = Math.round(Number(invoice.total_amount || 0));
  const paid = Math.round(Number(invoice.paid_amount || 0));
  const balance = total - paid;

  if (balance <= 0 && total > 0) return "paid";
  if (paid > 0 && balance > 0) return "partial";
  
  const status = String(invoice.status || "").toLowerCase();
  if (status === "overdue") return "overdue";
  if (status === "draft") return "draft";
  
  return "sent";
};

export const normalizeRoomStatus = (room: RentalRoom): RoomStatus => {
  if (room.is_expired) return "expired" as any;
  if (isContractSoonEnding(room)) return "expiring_soon";
  const stat = String(room.status || "").toLowerCase();
  if (stat === "occupied" || stat === "occupied_soon") return "occupied";
  if (stat === "reserved") return "reserved" as any;
  if (stat === "maintenance") return "maintenance";
  return "vacant";
};

export const roomStatusLabel = (status: RoomStatus | string) => {
  if (status === "occupied") return "Đang thuê";
  if (status === "reserved") return "Đã cọc";
  if (status === "maintenance") return "Bảo trì";
  if (status === "expiring_soon") return "Sắp hết HĐ";
  if (status === "expired") return "Quá hạn HĐ";
  if (status === "disabled") return "Ngưng SD";
  return "Trống";
};

export const toContractView = (room: RentalRoom): ContractView | null => {
  if (!room.contract_id) return null;
  return {
    id: room.contract_id!,
    room_id: room.id,
    facility_id: room.boarding_house_id || "default",
    room_name: room.name,
    tenant_name: room.tenant_name || "Khách thuê",
    tenant_phone: room.tenant_phone || "",
    tenant_id_card: room.tenant_id_card || "",
    tenant_email: room.tenant_address || "",
    start_date: room.start_date || null,
    end_date: room.end_date || null,
    rent_amount: Number(room.rent_amount || room.price || 0),
    deposit_amount: Number(room.deposit || 0),
    billing_day: Number(room.billing_day || 5),
    electric_start: 0, // Should be fetched from contract in real DB
    water_start: 0,
    occupant_count: Number((room as any).occupant_count ?? room.num_people ?? 1),
    applied_services_snapshot: ((room as any).applied_services_snapshot ?? null) as AppliedServiceSnapshot[] | null,
    note: room.note || "",
    status: room.status === "occupied" ? (isContractSoonEnding(room) ? "expiring_soon" : "active") : "ended",
  };
};

export function normalizeAppliedServicesSnapshot(snapshot: any[] | null | undefined): AppliedServiceSnapshot[] | null {
  if (!Array.isArray(snapshot)) return null;
  return snapshot.map((s: any) => {
    const name = String(s.name || "");
    const isElec = name.toLowerCase().includes("điện") || name.toLowerCase().includes("dien") || name.toLowerCase().includes("electric") || String(s.type || "").toLowerCase().includes("meter");
    const isWater = name.toLowerCase().includes("nước") || name.toLowerCase().includes("nuoc") || name.toLowerCase().includes("water");
    const category = s.category || (isElec ? "electricity" : (isWater ? "water" : "other"));
    const type = String(s.type || s.calculation_type || s.service_type || s.billing_type || "fixed").toLowerCase();
    
    const unitPrice = Number(s.unit_price ?? s.price ?? s.unitPrice ?? 0);
    const applied_unit_price = Number(s.applied_unit_price ?? s.unit_price ?? s.price ?? s.unitPrice ?? 0);
    const amount = s.amount != null ? Number(s.amount) : (s.monthlyPrice || s.monthlyAmount || s.monthly_price || s.monthly_amount || null);
    
    return {
      ...s,
      service_id: s.service_id || s.id || s.serviceId,
      name,
      category,
      type,
      unit_price: unitPrice,
      applied_unit_price: applied_unit_price,
      amount,
    };
  });
}

const toContractViewFromApi = (contract: any): ContractView => ({
  id: contract.id,
  room_id: contract.room_id,
  facility_id: contract.facility_id ?? contract.boarding_house_id ?? undefined,
  room_name: contract.room_name || "",
  room_price: Number(contract.room_price || 0),
  has_ac: Boolean(contract.has_ac),
  tenant_name: contract.tenant_name || "Khách thuê",
  tenant_phone: contract.tenant_phone || "",
  tenant_id_card: contract.tenant_id_card || "",
  tenant_email: contract.tenant_email || "",
  tenant_address: contract.tenant_address || "",
  start_date: contract.start_date || null,
  end_date: contract.end_date || null,
  rent_amount: Number(contract.rent_amount || contract.room_price || 0),
  deposit_amount: Number(contract.deposit || contract.deposit_amount || 0),
  billing_day: Number(contract.billing_day || 5),
  electric_start: contract.electric_start != null ? Number(contract.electric_start) : 0,
  water_start: contract.water_start != null ? Number(contract.water_start) : 0,
  occupant_count: contract.occupant_count != null ? Number(contract.occupant_count) : Number(contract.num_people || 1),
  applied_services_snapshot: normalizeAppliedServicesSnapshot(contract.applied_services_snapshot),
  note: contract.note || "",
  status: ["terminated", "ended", "cancelled"].includes(String(contract.status || "").toLowerCase())
    ? "ended"
    : contract.is_expired ? "expired" as any : "active",
});

export const getServiceCategory = (service: Pick<ServiceConfig, "name"> | Pick<AppliedServiceSnapshot, "name">) => {
  const name = String(service?.name || "").toLowerCase();
  if (name.includes("điện") || name.includes("dien") || name.includes("electric")) return "electricity";
  if (name.includes("nước") || name.includes("nuoc") || name.includes("water")) return "water";
  if (name.includes("wifi")) return "wifi";
  if (name.includes("rác") || name.includes("rac")) return "trash";
  if (name.includes("xe") || name.includes("parking") || name.includes("gửi")) return "parking";
  return "other";
};

export const getServiceUnitLabel = (service: Pick<ServiceConfig, "type" | "unit" | "name"> | Pick<AppliedServiceSnapshot, "type" | "unit" | "name" | "display_unit">) => {
  if ("display_unit" in service && service.display_unit) return service.display_unit;
  const type = String(service.type || "").toLowerCase();
  if (type === "per_person") return "/người";
  if (type === "per_room") return "/phòng";
  if (type === "meter" || type === "metered") return getServiceCategory(service) === "water" ? "/m³" : "/kWh";
  return service.unit ? `/${service.unit}` : "/tháng";
};

export const describeServiceType = (service: Pick<ServiceConfig, "type" | "name"> | Pick<AppliedServiceSnapshot, "type" | "name">) => {
  const type = String(service.type || "").toLowerCase();
  if (type === "meter" || type === "metered") return "Theo số đo";
  if (type === "per_person") return "Theo người";
  if (type === "per_room") return "Theo phòng";
  return "Cố định";
};

export const roomStatusMeta = (status?: string, soonEnding = false, isExpired = false) => {
  const norm = String(status || "").toLowerCase();
  if (isExpired || norm === "expired") return { label: "Quá hạn HĐ", className: "border-red-200 bg-red-50 text-red-700" };
  if (soonEnding) return { label: "Sắp hết HĐ", className: "border-orange-200 bg-orange-50 text-orange-700" };
  if (norm === "reserved") return { label: "Đã cọc", className: "border-orange-200 bg-orange-50 text-orange-700" };
  if (norm === "occupied" || norm === "occupied_soon") return { label: "Đang thuê", className: "border-blue-200 bg-blue-50 text-blue-700" };
  if (norm === "maintenance") return { label: "Bảo trì", className: "border-amber-200 bg-amber-50 text-amber-700" };
  if (norm === "disabled") return { label: "Ngưng SD", className: "border-gray-200 bg-gray-50 text-gray-500" };
  return { label: "Trống", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
};

export const invoiceStatusMeta = (status?: string) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "paid" || normalized === "đã thanh toán") return { label: "Đã thanh toán", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (normalized === "partial" || normalized === "partially_paid" || normalized === "thanh toán một phần") return { label: "Một phần", className: "border-blue-200 bg-blue-50 text-blue-700" };
  if (normalized === "overdue") return { label: "Quá hạn", className: "border-red-200 bg-red-50 text-red-700" };
  if (normalized === "unpaid" || normalized === "sent") return { label: "Chưa thanh toán", className: "border-orange-200 bg-orange-50 text-orange-700" };
  return { label: "Bản nháp", className: "border-slate-200 bg-slate-50 text-slate-600" };
};

export const getFloorFromRoomName = (name?: string) => {
  const firstDigit = String(name || "").match(/\d/)?.[0];
  return firstDigit ? `Tầng ${firstDigit}` : "Chưa rõ";
};

export const getRoomArea = (room: RentalRoom) => {
  if (room.area) return Number(room.area);
  const base = 18;
  const people = Number(room.num_people || 1);
  return base + Math.max(0, people - 1) * 3;
};

export const isContractSoonEnding = (room: RentalRoom) => {
  if (!room.end_date) return false;
  const end = new Date(room.end_date).getTime();
  const now = Date.now();
  return end >= now && end - now <= 30 * 24 * 60 * 60 * 1000;
};

export async function loadBoardingHouses() {
  const res = await apiGet<any>("/owner/boarding-houses");
  return (res?.data ?? []) as BoardingHouse[];
}

export async function createBoardingHouse(input: { name: string; address?: string; description?: string }) {
  const res = await apiPost<any>("/owner/boarding-houses", {
    name: input.name,
    address: input.address || "",
    description: input.description || "",
    status: "ACTIVE",
    isPublic: false,
  });
  return (res?.data ?? res) as BoardingHouse;
}

export async function loadBoardingHouse(id: string) {
  const res = await apiGet<any>(`/owner/boarding-houses/${id}`);
  return (res?.data ?? res) as BoardingHouse;
}

export async function loadOwnerRooms(buildingId: string) {
  const res = await apiGet<any>(`/owner/boarding-houses/${buildingId}/rooms`);
  return (res?.data ?? []) as OwnerRoom[];
}

export async function createOwnerRoom(buildingId: string, input: { name: string; price: number; area?: number; maxPeople?: number; status?: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE"; isPublic?: boolean }) {
  const res = await apiPost<any>(`/owner/boarding-houses/${buildingId}/rooms`, {
    name: input.name,
    price: Number(input.price || 0),
    area: Number(input.area || 0),
    maxPeople: Number(input.maxPeople || 1),
    status: input.status || "AVAILABLE",
    isPublic: Boolean(input.isPublic),
  });
  return (res?.data ?? res) as OwnerRoom;
}

export async function loadRentalRooms(buildingId?: string) {
  const url = buildingId ? `/rental/rooms?buildingId=${buildingId}` : "/rental/rooms";
  const res = await apiGet<any>(url);
  return (res?.data ?? []) as RentalRoom[];
}


export async function loadRoom(id: string) {
  const rooms = await loadRentalRooms();
  return rooms.find((room) => String(room.id) === String(id)) || null;
}

export async function loadContracts() {
  const res = await apiGet<any>("/rental/contracts");
  return (res?.data ?? []).map(toContractViewFromApi) as ContractView[];
}

export async function loadContract(id: string) {
  const res = await apiGet<any>(`/rental/contracts/${id}`);
  if (!res?.data) return null;
  return toContractViewFromApi(res.data) as ContractView;
}

export async function loadInvoicesByContract(contractId: string) {
  const res = await apiGet<any>(`/invoices/history/${contractId}`);
  return (res?.data ?? []) as Invoice[];
}

export async function terminateContract(contract: ContractView, input: { refundAmount: number; refundDate: string; refundMethod: string; note: string; walletId?: string; settlementWalletId?: string; settlementAmount?: number; settlementStatus?: string }) {
  const res = await apiPost<any>(`/rental/contracts/${contract.id}/terminate`, {
    roomId: contract.room_id,
    refundAmount: input.refundAmount,
    settlementAmount: input.settlementAmount,
    settlementStatus: input.settlementStatus,
    refundDate: input.refundDate,
    refundMethod: input.refundMethod,
    note: input.note,
    walletId: input.walletId || null,
    settlementWalletId: input.settlementWalletId || null,
  });
  return res?.data ?? res;
}

export async function loadDepositRefund(contractId: string) {
  const res = await apiGet<any>(`/rental/contracts/${contractId}/refund`);
  return res?.data;
}

export async function loadInvoices(buildingId?: string) {
  const url = buildingId ? `/invoices?buildingId=${buildingId}` : "/invoices";
  const res = await apiGet<any>(url);
  return (res?.data ?? []) as Invoice[];
}

export async function loadInvoicesForPeriod(buildingId: string | undefined, month: number, year: number) {
  const params = new URLSearchParams();
  params.append("month", String(month));
  params.append("year", String(year));
  params.append("includeOverdueCarryover", "true");
  if (buildingId) params.append("buildingId", buildingId);

  const res = await apiGet<any>(`/invoices?${params.toString()}`);
  return (res?.data ?? []) as Invoice[];
}

export async function loadInvoicesWithItems(buildingId?: string, month?: number, year?: number) {
  const params = new URLSearchParams();
  params.append("includeItems", "true");
  if (buildingId) params.append("buildingId", buildingId);
  if (month) params.append("month", String(month));
  if (year) params.append("year", String(year));

  const res = await apiGet<any>(`/invoices?${params.toString()}`);
  return (res?.data ?? []) as Invoice[];
}

export async function loadServiceConfigs(activeOnly = true) {
  const res = await apiGet<any>(`/rental/services${activeOnly ? "" : "?activeOnly=0"}`);
  return (res?.data ?? []) as ServiceConfig[];
}


export async function loadInvoice(id: string) {
  const res = await apiGet<any>(`/invoices/${id}`);
  return (res?.data ?? null) as Invoice;
}

export async function loadWallets() {
  const res = await apiGet<any>("/wallets");
  return (res?.data ?? []) as Wallet[];
}

export async function loadPaymentChannels() {
  const res = await apiGet<any>("/payment-channels");
  return (res?.data ?? []) as PaymentChannel[];
}

export async function createPaymentChannel(input: Partial<PaymentChannel> & { displayName: string }) {
  const res = await apiPost<any>("/payment-channels", input);
  return res?.data as PaymentChannel;
}

export async function updatePaymentChannel(id: string, input: Partial<PaymentChannel>) {
  const res = await apiPatch<any>(`/payment-channels/${id}`, input);
  return res?.data as PaymentChannel;
}

export async function disablePaymentChannel(id: string) {
  const res = await apiDelete<any>(`/payment-channels/${id}`);
  return res?.data ?? res;
}

export async function loadBankConfig() {
  const res = await apiGet<any>("/bank-config");
  return (res?.data ?? null) as BankConfig | null;
}

export async function loadTransactions() {
  const res = await apiGet<any>("/transactions?limit=200");
  return (res?.data ?? []) as Transaction[];
}

export async function createTransaction(input: { type: "income" | "expense"; amount: number; description: string; walletId: string; date: string }) {
  const res = await apiPost<any>("/transactions", input);
  return res?.data ?? res;
}

export async function loadTransactionsByContract(contractId: string) {
  const res = await apiGet<any>(`/transactions?contractId=${contractId}&limit=50`);
  return (res?.data ?? []) as Transaction[];
}

export async function deleteTransaction(id: string) {
  const res = await apiDelete<any>(`/transactions/${id}`);
  return res?.data ?? res;
}

export async function createTenant(input: TenantInput) {
  const validated = validateTenantInput(input);
  if (!validated.ok) throw new RentalValidationError(validated.fieldErrors);
  const res = await apiPost<any>("/rental/tenants", validated.data);
  return res?.data;
}

export async function createContract(input: {
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate?: string;
  deposit: number;
  rentAmount: number;
  billingDay: number;
  electricStart: number;
  waterStart: number;
  occupantCount: number;
  note?: string;
  serviceIds?: string[];
  walletId?: string;
}) {
  const res = await apiPost<any>("/rental/contracts", input);
  return res?.data;
}

export async function createInvoice(input: {
  roomId: string;
  contractId: string;
  month: number;
  year: number;
  roomFee: number;
  previousDebt?: number;
  items: Array<{ serviceId?: string | null; name: string; detail?: string; amount: number }>;
  elecOld?: number | null;
  elecNew?: number | null;
  waterOld?: number | null;
  waterNew?: number | null;
}) {
  const res = await apiPost<any>("/invoices", input);
  return res?.data as Invoice;
}

export async function createInvoiceForContract(contract: ContractView, input: {
  month: number;
  year: number;
  roomFee?: number;
  electricOld: number;
  electricNew: number;
  waterOld: number;
  waterNew: number;
  items: Array<{ name: string; amount: number }>;
}) {
  const appliedServices = normalizeAppliedServicesSnapshot(contract.applied_services_snapshot) ?? [];
  const serviceItems = appliedServices.map((service) => {
    const category = String(service.category || getServiceCategory(service));
    const type = String(service.type || "").toLowerCase();
    
    // Water/Electric can also be per_person
    const isPerPerson = type === "per_person";
    const occupantCount = Number(contract.occupant_count || 1);

    if (category === "electricity" && (type === "meter" || type === "metered")) {
      const used = Math.max(0, input.electricNew - input.electricOld);
      return {
        name: service.name,
        detail: `${input.electricOld} → ${input.electricNew} × ${service.applied_unit_price}`,
        amount: used * Number(service.applied_unit_price || 0),
      };
    }
    if (category === "water" && (type === "meter" || type === "metered")) {
      const used = Math.max(0, input.waterNew - input.waterOld);
      return {
        name: service.name,
        detail: `${input.waterOld} → ${input.waterNew} × ${service.applied_unit_price}`,
        amount: used * Number(service.applied_unit_price || 0),
      };
    }
    if (isPerPerson) {
      const unitPrice = Number(service.applied_unit_price || 0);
      return {
        name: service.name,
        detail: `${occupantCount} người × ${formatMoney(unitPrice)}`,
        amount: occupantCount * unitPrice,
      };
    }
    if (type === "per_room") {
      const unitPrice = Number(service.applied_unit_price || 0);
      return {
        name: service.name,
        detail: `1 phòng × ${formatMoney(unitPrice)}`,
        amount: unitPrice,
      };
    }
    return {
      name: service.name,
      detail: undefined,
      amount: Number(service.amount || service.applied_unit_price || 0),
    };
  });

  return createInvoice({
    roomId: contract.room_id,
    contractId: contract.id,
    month: input.month,
    year: input.year,
    roomFee: input.roomFee ?? contract.rent_amount,
    previousDebt: 0,
    elecOld: input.electricOld,
    elecNew: input.electricNew,
    waterOld: input.waterOld,
    waterNew: input.waterNew,
    items: [
      ...serviceItems,
      ...input.items,
    ],
  });
}

export async function recordPayment(invoice: Invoice, input: { amount: number; walletId: string; date: string; method: string; collector: string; note?: string }) {
  const res = await apiPost<any>(`/invoices/${invoice.id}/collect-payment`, {
    amount: Number(input.amount || 0),
    walletId: input.walletId,
    date: input.date,
    method: input.method,
    note: `${input.method}${input.note ? ` · ${input.note}` : ""}`,
  });
  
  if (res?.error) throw new Error(res.error);
  return res?.data;
}

export async function deleteWallet(id: string) {
  const res = await apiDelete<any>(`/wallets/${id}`);
  return res;
}

export async function deleteContract(id: string) {
  const res = await apiDelete<any>(`/rental/contracts/${id}`);
  return res;
}

export async function deleteRoom(id: string) {
  const res = await apiDelete<any>(`/rental/rooms/${id}`);
  return res;
}

export async function deleteInvoice(id: string) {
  const res = await apiDelete<any>(`/invoices/${id}`);
  return res;
}

export async function deleteBoardingHouse(id: string) {
  const res = await apiDelete<any>(`/owner/boarding-houses/${id}`);
  return res;
}

export async function updateBoardingHouse(id: string, input: Partial<BoardingHouse>) {
  const res = await apiPatch<any>(`/owner/boarding-houses/${id}`, input);
  return res;
}

export async function updateRoom(id: string, input: Partial<RentalRoom>) {
  const res = await apiPatch<any>(`/rental/rooms/${id}`, input);
  return res;
}

export async function updateContract(id: string, input: any) {
  const res = await apiPatch<any>(`/rental/contracts/${id}`, input);
  return res?.data;
}

export async function bulkCreateInvoices(items: any[]) {
  const res = await apiPost<any>("/invoices/bulk-create", items);
  return res?.data ?? [];
}

export async function bulkCollectPayments(invoiceIds: (string)[], walletId: string) {
  const res = await apiPost<any>("/invoices/bulk-collect-payment", {
    invoiceIds,
    walletId,
  });
  return res?.data ?? [];
}

export async function loadLatestMeterReadings(roomId: string) {
  const res = await apiGet<any>(`/invoices/latest-meter-readings?roomId=${roomId}`);
  return res?.data ?? { elec_old: 0, water_old: 0 };
}

export async function loadPendingBilling(month: number, year: number, facilityId?: string) {
  const [rooms, invoices] = await Promise.all([
    loadRentalRooms(facilityId),
    loadInvoices(facilityId)
  ]);
  
  const existingRoomIds = new Set(
    invoices
      .filter(i => i.month === month && i.year === year)
      .map(i => i.room_id)
  );

  return rooms.filter(room => {
    const status = String(room.status || "").toLowerCase();
    if (status !== "occupied" || !room.contract_id) return false;
    if (existingRoomIds.has(room.id)) return false;

    if (room.start_date) {
      const startDate = new Date(room.start_date);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;
      if (startYear > year || (startYear === year && startMonth > month)) {
        return false;
      }
    }
    return true;
  });
}

export async function loadOwnerProfile() {
  const res = await apiGet<any>("/me/profile");
  return res?.data?.user ?? res?.user ?? res;
}

export async function loadSettingsMap() {
  const res = await apiGet<any>("/owner/settings");
  const map: Record<string, any> = {};
  (res?.data || []).forEach((s: any) => {
    map[s.key] = s.value;
  });
  return map;
}

// ═══════════════════════════════════════════
// Deposit Management
// ═══════════════════════════════════════════

export type DepositStatus = "holding" | "transferred" | "refunded" | "cancelled";

export type Deposit = {
  id: string;
  room_id: string;
  room_name?: string;
  facility_name?: string;
  tenant_name: string;
  tenant_phone?: string;
  amount: number;
  deposit_date: string;
  status: DepositStatus;
  note?: string;
  contract_id?: string | null;
  created_at?: string;
};

export type DepositInput = {
  roomId: string;
  tenantName: string;
  tenantPhone?: string;
  amount: number;
  depositDate: string;
  note?: string;
  walletId?: string;
};

export async function loadDeposits() {
  const res = await apiGet<any>("/rental/deposits");
  return (res?.data ?? []) as Deposit[];
}

export async function createDeposit(input: DepositInput) {
  const res = await apiPost<any>("/rental/deposits", input);
  return res?.data as Deposit;
}

export async function updateDepositStatus(id: string, status: DepositStatus, note?: string) {
  const res = await apiPatch<any>(`/rental/deposits/${id}`, { status, note });
  return res?.data;
}

export async function cancelDeposit(id: string, note?: string) {
  return updateDepositStatus(id, "cancelled", note);
}
