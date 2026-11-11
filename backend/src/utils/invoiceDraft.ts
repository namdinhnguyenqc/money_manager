// The one place an invoice's money is worked out. The preview endpoint, the
// create endpoint and bulk create all call buildInvoiceDraft, so what the owner
// sees before saving is exactly what gets billed, on web and mobile alike.
// Clients send inputs (meter readings, extra fees, choices) and display the
// result; they never price anything themselves.

import {
  buildItemsFromRoomAdjustments,
  buildItemsFromRoomServices,
  calculateProratedRoomFee,
  firstMonthStay,
  type RoomAdjustmentRow,
  type RoomServiceRow,
} from "./billing.js";

export type SnapshotService = {
  service_id?: string | number | null;
  id?: string | number | null;
  name?: string | null;
  category?: string | null;
  type?: string | null;
  unit?: string | null;
  applied_unit_price?: number | string | null;
  unit_price?: number | string | null;
  amount?: number | string | null;
};

export type DraftLineKind = "electricity" | "water" | "service" | "room_service" | "adjustment" | "extra";

export type DraftLine = {
  /** Stable key: `svc-<service_id or name>` for contract services. Matches excludeServiceIds. */
  key: string;
  kind: DraftLineKind;
  serviceId: string | null;
  name: string;
  detail: string;
  /** What is billed for this line (0 when skipped). */
  amount: number;
  /** Amount before first-month proration or skipping. */
  fullAmount: number;
  skipped: boolean;
  metered: boolean;
  calculationType: string | null;
  unitPrice: number | null;
  quantity: number | null;
  startReading: number | null;
  endReading: number | null;
  usageValue: number | null;
  unit: string | null;
};

export type InvoiceDraftInput = {
  month: number;
  year: number;
  contract: {
    rent_amount?: number | string | null;
    start_date?: string | null;
    occupant_count?: number | string | null;
    applied_services_snapshot?: unknown;
  };
  roomPrice?: number | string | null;
  readings: { elecOld: number; elecNew: number | null; waterOld: number; waterNew: number | null };
  /** Contract services switched off for this invoice (service_id, or name when missing). */
  excludeServiceIds?: string[];
  skipRent?: boolean;
  /** Partial first month: charge non-metered services by days stayed (default) or in full. */
  prorateFirstMonthServices?: boolean;
  /** Manual rent override; omitted means monthly rent, prorated in a partial first month. */
  roomFeeOverride?: number;
  /** Owner-entered extra lines; a negative amount is a discount. */
  extraItems?: Array<{ name: string; detail?: string | null; amount: number }>;
  roomServices?: RoomServiceRow[];
  pendingAdjustments?: RoomAdjustmentRow[];
  /** Last period's unpaid remainder carried into this bill (0 when declined). */
  previousDebt?: number;
  /** Contract credit available to offset this period's own charges. */
  availableCredit?: number;
};

export type InvoiceDraft = {
  month: number;
  year: number;
  rent: {
    monthly: number;
    fullAmount: number;
    amount: number;
    skipped: boolean;
    proration: { stayedDays: number; daysInMonth: number } | null;
  };
  lines: DraftLine[];
  serviceTotal: number;
  /** Rent + every line, before previous debt and credit. */
  chargesTotal: number;
  previousDebt: number;
  previousCredit: number;
  creditLeftover: number;
  total: number;
  readings: InvoiceDraftInput["readings"];
  electricity: { configured: boolean; metered: boolean };
  water: { configured: boolean; metered: boolean };
};

export class InvoiceDraftError extends Error {}

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const round = (value: number) => Math.round(value);

const isMetered = (type: unknown) => ["metered", "meter"].includes(String(type || "").toLowerCase());

/** Older snapshots carry no category, so fall back to the unit and name. */
export function serviceCategory(service: SnapshotService): "electricity" | "water" | "other" {
  const explicit = String(service.category || "").toLowerCase();
  if (explicit === "electricity" || explicit === "water") return explicit;
  if (explicit) return "other";
  const unit = String(service.unit || "").toLowerCase();
  const name = String(service.name || "").toLowerCase();
  if (unit === "kwh" || name.includes("điện") || name.includes("dien")) return "electricity";
  if (unit === "m³" || unit === "m3" || unit === "khối" || name.includes("nước") || name.includes("nuoc")) return "water";
  return "other";
}

export const serviceKeyOf = (service: SnapshotService) => String(service.service_id ?? service.id ?? service.name ?? "");

const unitPriceOf = (service: SnapshotService) => num(service.applied_unit_price ?? service.unit_price);
const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(round(value))}đ`;

const emptyLine = (partial: Partial<DraftLine> & Pick<DraftLine, "key" | "kind" | "name">): DraftLine => ({
  serviceId: null,
  detail: "",
  amount: 0,
  fullAmount: 0,
  skipped: false,
  metered: false,
  calculationType: null,
  unitPrice: null,
  quantity: null,
  startReading: null,
  endReading: null,
  usageValue: null,
  unit: null,
  ...partial,
});

export function snapshotServices(snapshot: unknown): SnapshotService[] {
  if (Array.isArray(snapshot)) return snapshot as SnapshotService[];
  if (typeof snapshot === "string") {
    try {
      const parsed = JSON.parse(snapshot);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function buildInvoiceDraft(input: InvoiceDraftInput): InvoiceDraft {
  const services = snapshotServices(input.contract.applied_services_snapshot);
  const excluded = new Set((input.excludeServiceIds ?? []).map(String));
  const occupants = Math.max(1, num(input.contract.occupant_count) || 1);
  const stay = firstMonthStay(input.contract.start_date, input.month, input.year);
  const prorateServices = input.prorateFirstMonthServices !== false;
  const prorate = (amount: number) => (stay && prorateServices ? round((amount * stay.stayedDays) / stay.daysInMonth) : amount);
  const stayNote = stay && prorateServices ? `tháng đầu ${stay.stayedDays}/${stay.daysInMonth} ngày` : "";

  const lines: DraftLine[] = [];
  for (const service of services) {
    const key = serviceKeyOf(service);
    const category = serviceCategory(service);
    const type = String(service.type || "").toLowerCase();
    const unitPrice = unitPriceOf(service);
    const skipped = excluded.has(key);
    const kind: DraftLineKind = category === "other" ? "service" : category;
    const base = {
      key: `svc-${key}`,
      kind,
      serviceId: service.service_id != null ? String(service.service_id) : null,
      name: String(service.name || (category === "electricity" ? "Tiền điện" : category === "water" ? "Tiền nước" : "Dịch vụ")),
      unit: service.unit ?? null,
      unitPrice,
      skipped,
    };

    if (isMetered(type) && category !== "other") {
      const r = input.readings;
      const start = category === "electricity" ? r.elecOld : r.waterOld;
      const endRaw = category === "electricity" ? r.elecNew : r.waterNew;
      const end = endRaw ?? start;
      if (end < start) {
        throw new InvoiceDraftError(category === "electricity"
          ? "Chỉ số điện cuối kỳ không được nhỏ hơn đầu kỳ."
          : "Chỉ số nước cuối kỳ không được nhỏ hơn đầu kỳ.");
      }
      const used = end - start;
      const full = round(used * unitPrice);
      lines.push(emptyLine({
        ...base,
        metered: true,
        calculationType: "metered",
        detail: `${start} → ${end} × ${money(unitPrice)}`,
        fullAmount: full,
        amount: skipped ? 0 : full,
        startReading: start,
        endReading: end,
        usageValue: used,
        quantity: used,
      }));
      continue;
    }

    let full: number;
    let detail: string;
    let quantity: number | null = null;
    if (type === "per_person") {
      full = round(occupants * unitPrice);
      detail = `${occupants} người × ${money(unitPrice)}`;
      quantity = occupants;
    } else if (type === "per_room") {
      full = round(unitPrice);
      detail = `1 phòng × ${money(unitPrice)}`;
      quantity = 1;
    } else {
      full = round(num(service.amount) || unitPrice);
      detail = "";
    }
    const prorated = prorate(full);
    lines.push(emptyLine({
      ...base,
      calculationType: type || "fixed",
      detail: [detail, prorated !== full ? stayNote : ""].filter(Boolean).join(" · "),
      fullAmount: full,
      amount: skipped ? 0 : prorated,
      quantity,
    }));
  }

  // Room-level services and pending per-period fees are billed on top of the
  // contract's services. They used to be added only on save, so the preview
  // total never showed them.
  buildItemsFromRoomServices(input.roomServices ?? []).forEach((item, index) => {
    lines.push(emptyLine({
      key: `room-svc-${item.serviceId ?? index}`,
      kind: "room_service",
      serviceId: item.serviceId ?? null,
      name: item.name,
      detail: item.detail,
      amount: round(item.amount),
      fullAmount: round(item.amount),
      calculationType: "room_service",
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      unit: item.unit ?? null,
    }));
  });
  buildItemsFromRoomAdjustments(input.pendingAdjustments ?? []).forEach((item, index) => {
    lines.push(emptyLine({
      key: `adjustment-${(input.pendingAdjustments ?? [])[index]?.id ?? index}`,
      kind: "adjustment",
      name: item.name,
      detail: item.detail ?? "",
      amount: round(item.amount),
      fullAmount: round(item.amount),
    }));
  });
  (input.extraItems ?? []).forEach((item, index) => {
    const name = String(item.name || "").trim();
    const amount = round(num(item.amount));
    if (!name || amount === 0) return;
    lines.push(emptyLine({
      key: `extra-${index}`,
      kind: "extra",
      name,
      detail: String(item.detail || "").trim(),
      amount,
      fullAmount: amount,
    }));
  });

  const monthly = Math.max(0, num(input.contract.rent_amount) || num(input.roomPrice));
  const rentFull = input.roomFeeOverride !== undefined
    ? Math.max(0, round(input.roomFeeOverride))
    : calculateProratedRoomFee(monthly, input.contract.start_date, input.month, input.year);
  const rentAmount = input.skipRent ? 0 : rentFull;

  const serviceTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const chargesTotal = rentAmount + serviceTotal;
  if (chargesTotal < 0) throw new InvoiceDraftError("Khoản giảm trừ lớn hơn tổng tiền phải thu.");

  const previousDebt = Math.max(0, round(num(input.previousDebt)));
  const availableCredit = Math.max(0, num(input.availableCredit));
  const previousCredit = Math.min(availableCredit, chargesTotal);

  const electricity = services.find((s) => serviceCategory(s) === "electricity");
  const water = services.find((s) => serviceCategory(s) === "water");

  return {
    month: input.month,
    year: input.year,
    rent: { monthly, fullAmount: rentFull, amount: rentAmount, skipped: Boolean(input.skipRent), proration: stay },
    lines,
    serviceTotal,
    chargesTotal,
    previousDebt,
    previousCredit,
    creditLeftover: Math.max(0, availableCredit - previousCredit),
    total: Math.max(0, chargesTotal + previousDebt - previousCredit),
    readings: input.readings,
    electricity: { configured: Boolean(electricity), metered: Boolean(electricity && isMetered(electricity.type)) },
    water: { configured: Boolean(water), metered: Boolean(water && isMetered(water.type)) },
  };
}

/**
 * invoice_items rows for a draft: skipped lines are left out. service_id is a
 * foreign key, so it is kept only for services that still exist.
 */
export function draftItemsForInsert(draft: InvoiceDraft, existingServiceIds?: Set<string>) {
  const keepId = (id: string | null) => (id && (!existingServiceIds || existingServiceIds.has(id)) ? id : null);
  return draft.lines
    .filter((line) => !line.skipped)
    .map((line) => ({
      serviceId: line.kind === "extra" || line.kind === "adjustment" ? null : keepId(line.serviceId),
      name: line.name,
      detail: line.detail,
      amount: line.amount,
      calculationType: line.calculationType ?? undefined,
      unitPrice: line.unitPrice ?? undefined,
      quantity: line.quantity ?? undefined,
      startReading: line.startReading ?? undefined,
      endReading: line.endReading ?? undefined,
      usageValue: line.usageValue ?? undefined,
      unit: line.unit ?? undefined,
    }));
}
