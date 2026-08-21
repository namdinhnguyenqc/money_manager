function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return { year, month, day };
}

/** Prorates rent only for the contract's first calendar month, inclusive of move-in day. */
export function calculateProratedRoomFee(
  monthlyRent: number,
  contractStartDate: string | null | undefined,
  billingMonth: number,
  billingYear: number,
) {
  const rent = Math.max(0, Number(monthlyRent || 0));
  const start = parseDateOnly(contractStartDate);
  if (!start || start.year !== billingYear || start.month !== billingMonth || start.day === 1) {
    return Math.round(rent);
  }

  const daysInMonth = new Date(Date.UTC(billingYear, billingMonth, 0)).getUTCDate();
  const billableDays = daysInMonth - start.day + 1;
  return Math.round((rent * billableDays) / daysInMonth);
}

export function resolveInvoiceRoomFee(input: {
  requestedRoomFee?: number;
  monthlyRent: number;
  contractStartDate?: string | null;
  month: number;
  year: number;
}) {
  const monthlyRent = Math.max(0, Number(input.monthlyRent || 0));
  const requested = input.requestedRoomFee;
  // Preserve a deliberate manual override. Existing clients send the full monthly rent,
  // so that value is still converted to the correct first-month prorated amount.
  if (requested !== undefined && Math.round(requested) !== Math.round(monthlyRent)) {
    return Math.round(requested);
  }
  return calculateProratedRoomFee(monthlyRent, input.contractStartDate, input.month, input.year);
}

export type InvoiceDebtRow = {
  id?: string | null;
  room_id?: string | null;
  total_amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  month?: number | string | null;
  year?: number | string | null;
};

export type RoomInvoiceSummary = {
  outstanding: number;
  latestStatus: string | null;
};

/**
 * Aggregates a user's invoices into per-room debt for the rooms listing.
 *
 * Outstanding is derived rather than stored on the room: invoices are the source
 * of truth, and a denormalized column would drift every time a payment lands via
 * the SePay webhook. A partially paid invoice contributes only its remaining
 * balance, and an overpayment never becomes negative debt.
 *
 * `supersededInvoiceIds` are invoices whose unpaid remainder has already been
 * carried into a later invoice's `previous_debt` (see computeCarryover). Their
 * own balance must be excluded here, or the same 100k shows up twice: once as
 * this invoice's leftover, once inside the next invoice's total.
 */
export function summarizeRoomInvoices(
  rows: InvoiceDebtRow[],
  supersededInvoiceIds: ReadonlySet<string> = new Set(),
): Map<string, RoomInvoiceSummary> {
  const byRoom = new Map<string, RoomInvoiceSummary & { latestRank: number }>();

  for (const row of rows ?? []) {
    const roomId = String(row?.room_id ?? "");
    if (!roomId) continue;

    const entry = byRoom.get(roomId) ?? { outstanding: 0, latestStatus: null, latestRank: -1 };

    if (row.status !== "paid" && !(row.id && supersededInvoiceIds.has(String(row.id)))) {
      const total = Number(row.total_amount || 0);
      const paid = Number(row.paid_amount || 0);
      entry.outstanding += Math.max(0, total - paid);
    }

    const rank = Number(row.year || 0) * 12 + Number(row.month || 0);
    if (rank > entry.latestRank) {
      entry.latestRank = rank;
      entry.latestStatus = row.status ?? null;
    }

    byRoom.set(roomId, entry);
  }

  return new Map(
    Array.from(byRoom.entries()).map(([roomId, v]) => [
      roomId,
      { outstanding: v.outstanding, latestStatus: v.latestStatus },
    ]),
  );
}

export type ServiceRow = {
  id: string;
  name?: string | null;
  type?: string | null;
  unit?: string | null;
  unit_price?: number | string | null;
  unit_price_ac?: number | string | null;
};

/**
 * Builds the applied-services snapshot a contract carries.
 *
 * A contract stores the prices agreed at signing rather than reading the
 * service table live, so later price changes never silently alter what a tenant
 * already agreed to. Re-running this is therefore an explicit act — renewing at
 * today's prices — not a background refresh.
 */
export function buildAppliedServicesSnapshot(
  services: ServiceRow[],
  options: { occupantCount: number; roomHasAc: boolean },
) {
  const occupantCount = Math.max(1, Number(options.occupantCount || 1));

  return (services ?? []).map((service) => {
    const name = String(service.name || "");
    const type = String(service.type || "");
    // Water must be settled first. A metered service matches `type` "metered",
    // and treating that as proof of electricity mislabels water as electricity —
    // after which the invoice screen cannot find a water service at all and
    // bills it at 0.
    const isWater = /nước|nuoc/i.test(name);
    const isElectricity = !isWater && (name.toLowerCase().includes("điện") || type.toLowerCase().includes("meter"));

    const base = Number(service.unit_price || 0);
    const acPrice = Number(service.unit_price_ac || 0);
    // The air-conditioned rate only applies to electricity, and only when the
    // owner actually configured one.
    const appliedUnitPrice = isElectricity && options.roomHasAc && acPrice > 0 ? acPrice : base;

    let amount = appliedUnitPrice;
    if (type === "per_person") amount = appliedUnitPrice * occupantCount;
    else if (type === "per_room") amount = appliedUnitPrice;

    return {
      service_id: service.id,
      name,
      type,
      unit_price: base,
      unit_price_ac: acPrice,
      applied_unit_price: appliedUnitPrice,
      unit: service.unit ?? "",
      occupant_count: occupantCount,
      amount,
      category: isElectricity ? "electricity" : isWater ? "water" : "other",
    };
  });
}

type SupabaseLike = {
  from: (table: string) => any;
};

export type CarryoverResult = {
  previousDebt: number;
  previousCredit: number;
  sourceInvoiceId: string | null;
};

/**
 * Computes how much of a contract's prior-period balance should roll into a
 * new invoice, and how much of any credit (from an overpayment) should offset
 * it. Only the immediately preceding period is read — each invoice already
 * carries forward whatever came before it, so this naturally chains across
 * many unpaid months without needing to sum a whole ledger.
 *
 * `previousCredit` returned here is only the portion of the contract's credit
 * balance actually available after covering the prior debt; consuming it
 * against this invoice's own charges (and writing the leftover back to
 * `contracts.credit_balance`) is the caller's job once the current-period
 * total is known, since that total isn't computed yet at this point.
 */
export async function computeCarryover(
  db: SupabaseLike,
  input: { userId: string; contractId: string; month: number; year: number },
): Promise<CarryoverResult & { availableCreditAfterDebt: number; creditBalance: number }> {
  let prevMonth = input.month - 1;
  let prevYear = input.year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const [priorRes, contractRes] = await Promise.all([
    db
      .from("invoices")
      .select("id,total_amount,paid_amount")
      .eq("contract_id", input.contractId)
      .eq("user_id", input.userId)
      .eq("month", prevMonth)
      .eq("year", prevYear)
      .maybeSingle(),
    db.from("contracts").select("credit_balance").eq("id", input.contractId).eq("user_id", input.userId).maybeSingle(),
  ]);

  const prior = priorRes.data;
  const priorRemaining = prior ? Math.max(0, Number(prior.total_amount || 0) - Number(prior.paid_amount || 0)) : 0;
  const creditBalance = Math.max(0, Number(contractRes.data?.credit_balance || 0));

  const appliedCredit = Math.min(priorRemaining, creditBalance);
  const previousDebt = priorRemaining - appliedCredit;
  const availableCreditAfterDebt = creditBalance - appliedCredit;

  return {
    previousDebt,
    previousCredit: 0,
    sourceInvoiceId: prior?.id ?? null,
    availableCreditAfterDebt,
    // The untouched balance, for when the owner declines the carry-over: if last
    // period's debt is not being settled here, the credit that would have
    // offset it must stay on the contract rather than being silently spent.
    creditBalance,
  };
}

/**
 * Given remaining credit after prior debt was offset (see computeCarryover)
 * and the current period's own charges (before carryover), decides how much
 * credit to apply to this invoice and how much stays on the contract for a
 * future period.
 */
export function applyCreditToCurrentCharges(
  availableCreditAfterDebt: number,
  currentPeriodCharges: number,
): { previousCredit: number; creditBalanceLeftover: number } {
  const previousCredit = Math.max(0, Math.min(availableCreditAfterDebt, currentPeriodCharges));
  return {
    previousCredit,
    creditBalanceLeftover: Math.max(0, availableCreditAfterDebt - previousCredit),
  };
}

/**
 * Applies any service price changes whose effective date has arrived. Lazy
 * (checked on read) instead of cron-driven — called before any code path that
 * reads or bills service prices, so a scheduled change never has a window
 * where it silently fails to apply.
 */
export async function applyDuePriceChanges(db: SupabaseLike, userId: string): Promise<void> {
  const { data: due, error } = await db
    .from("service_price_history")
    .select("id,service_id,new_unit_price,new_unit_price_ac,effective_date")
    .eq("user_id", userId)
    .eq("applied", false)
    .lte("effective_date", new Date().toISOString().slice(0, 10))
    .order("effective_date", { ascending: true });

  if (error || !due || due.length === 0) return;

  for (const row of due) {
    await db
      .from("services")
      .update({ unit_price: row.new_unit_price, unit_price_ac: row.new_unit_price_ac, updated_at: new Date().toISOString() })
      .eq("id", row.service_id)
      .eq("user_id", userId);
    await db.from("service_price_history").update({ applied: true }).eq("id", row.id);
  }
}

export type RoomServiceRow = {
  id: string;
  service_id: string;
  quantity: number | string;
  custom_unit_price: number | string | null;
  services?: { name?: string | null; unit_price?: number | string | null; unit?: string | null } | null;
};

/** Builds invoice_items rows from a room's active room-level services. */
export function buildItemsFromRoomServices(rows: RoomServiceRow[]) {
  return (rows ?? []).map((row) => {
    const unitPrice = row.custom_unit_price != null ? Number(row.custom_unit_price) : Number(row.services?.unit_price || 0);
    const quantity = Number(row.quantity || 1);
    return {
      serviceId: row.service_id,
      name: row.services?.name || "Dịch vụ phòng",
      detail: `${quantity} x ${unitPrice.toLocaleString("vi-VN")}đ`,
      amount: quantity * unitPrice,
      calculationType: "room_service",
      unitPrice,
      quantity,
      unit: row.services?.unit ?? undefined,
    };
  });
}

export type RoomAdjustmentRow = { id: string; label: string; amount: number | string; note?: string | null };

/** Builds invoice_items rows from a room's pending (not-yet-billed) ad-hoc fees. */
export function buildItemsFromRoomAdjustments(rows: RoomAdjustmentRow[]) {
  return (rows ?? []).map((row) => ({
    serviceId: null,
    name: row.label,
    detail: row.note ?? "",
    amount: Number(row.amount || 0),
  }));
}
