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

/**
 * Days billed in a contract's first month when it starts after the 1st, or
 * null when the period is not a partial first month.
 */
export function firstMonthStay(contractStartDate: string | null | undefined, billingMonth: number, billingYear: number) {
  const start = parseDateOnly(contractStartDate);
  if (!start || start.year !== billingYear || start.month !== billingMonth || start.day === 1) return null;
  const daysInMonth = new Date(Date.UTC(billingYear, billingMonth, 0)).getUTCDate();
  return { stayedDays: daysInMonth - start.day + 1, daysInMonth };
}

type ProratableItem = {
  name?: string | null;
  amount: number;
  detail?: string | null;
  serviceId?: string | null;
  calculationType?: string | null;
};

const isMeteredType = (type: unknown) => ["metered", "meter"].includes(String(type || "").toLowerCase());

/**
 * Scales the contract's non-metered service lines (rubbish, wifi, per-person
 * water...) by the days stayed in a partial first month, matching how rent is
 * prorated. Metered lines and owner-added fees are left untouched; a line is a
 * contract service when its serviceId or name matches the contract snapshot.
 */
export function prorateFirstMonthServiceItems<T extends ProratableItem>(
  items: T[],
  contractServices: Array<{ service_id?: string | null; id?: string | null; name?: string | null; type?: string | null }>,
  stay: { stayedDays: number; daysInMonth: number } | null,
): T[] {
  if (!stay || stay.daysInMonth <= 0) return items;
  const services = (contractServices ?? []).filter((s) => !isMeteredType(s.type));
  const ids = new Set(services.map((s) => String(s.service_id ?? s.id ?? "")).filter(Boolean));
  const names = new Set(services.map((s) => String(s.name ?? "").trim()).filter(Boolean));
  return items.map((item) => {
    if (isMeteredType(item.calculationType)) return item;
    const matches = (item.serviceId && ids.has(String(item.serviceId))) || names.has(String(item.name ?? "").trim());
    if (!matches) return item;
    const note = `tháng đầu ${stay.stayedDays}/${stay.daysInMonth} ngày`;
    return {
      ...item,
      amount: Math.round((Number(item.amount || 0) * stay.stayedDays) / stay.daysInMonth),
      detail: item.detail ? `${item.detail} · ${note}` : note,
    };
  });
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
 * Invoices are priced from this snapshot, not from the service table. When the
 * owner edits a service price, syncActiveContractSnapshots re-prices the
 * matching entries on active contracts; ended contracts keep their old prices.
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

// ── Carrying an unpaid remainder into the next invoice ─────────────────────
// When a later invoice takes over an earlier one's unpaid remainder (its
// previous_debt), the earlier invoice must stop showing that remainder as
// owed, or every place that sums "total − paid" counts it twice. The moved
// amount is recorded in carried_forward_amount and taken off total_amount, so
// the earlier invoice ends with nothing left to collect. Its original total is
// total_amount + carried_forward_amount.

type CarryInvoiceRow = {
  total_amount?: number | string | null;
  paid_amount?: number | string | null;
  carried_forward_amount?: number | string | null;
};

const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;

export function invoiceStatusFor(total: number, paid: number): "paid" | "partial" | "unpaid" {
  if (paid >= total) return "paid";
  return paid > 0 ? "partial" : "unpaid";
}

/** Update that closes an earlier invoice whose remainder moved to a later one, or null if nothing is owed. */
export function carryForwardUpdate(src: CarryInvoiceRow) {
  const total = money(src.total_amount);
  const paid = money(src.paid_amount);
  const remaining = money(total - paid);
  if (remaining <= 0) return null;
  return {
    total_amount: paid,
    carried_forward_amount: money(money(src.carried_forward_amount) + remaining),
    status: "paid" as const,
  };
}

/** Update that gives an earlier invoice its carried remainder back (the later invoice was deleted), or null. */
export function reopenCarriedUpdate(src: CarryInvoiceRow) {
  const carried = money(src.carried_forward_amount);
  if (carried <= 0) return null;
  const total = money(money(src.total_amount) + carried);
  const paid = money(src.paid_amount);
  return { total_amount: total, carried_forward_amount: 0, status: invoiceStatusFor(total, paid) };
}

const isMissingColumn = (error: any) =>
  error?.code === "42703" || error?.code === "PGRST204" || /carried_forward_amount/.test(String(error?.message || ""));

/** Closes the earlier invoice after a later one took over its remainder. Safe before the migration runs. */
export async function closeCarriedSourceInvoice(db: SupabaseLike, userId: string, sourceInvoiceId: string | null | undefined) {
  if (!sourceInvoiceId) return;
  const srcRes = await db
    .from("invoices")
    .select("id,total_amount,paid_amount,carried_forward_amount")
    .eq("id", sourceInvoiceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (srcRes.error) {
    if (!isMissingColumn(srcRes.error)) console.error("[carry-forward] read source failed:", srcRes.error.message);
    return;
  }
  const update = srcRes.data ? carryForwardUpdate(srcRes.data) : null;
  if (!update) return;
  const res = await db
    .from("invoices")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", sourceInvoiceId)
    .eq("user_id", userId);
  if (res.error) console.error("[carry-forward] close source failed:", res.error.message);
}

/** Gives the earlier invoice its remainder back when the invoice that carried it is deleted. */
export async function reopenCarriedSourceInvoice(db: SupabaseLike, userId: string, sourceInvoiceId: string | null | undefined) {
  if (!sourceInvoiceId) return;
  const srcRes = await db
    .from("invoices")
    .select("id,total_amount,paid_amount,carried_forward_amount")
    .eq("id", sourceInvoiceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (srcRes.error || !srcRes.data) return;
  const update = reopenCarriedUpdate(srcRes.data);
  if (!update) return;
  const res = await db
    .from("invoices")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", sourceInvoiceId)
    .eq("user_id", userId);
  if (res.error) console.error("[carry-forward] reopen source failed:", res.error.message);
}

/**
 * A payment aimed at an invoice whose remainder moved on (e.g. the tenant paid
 * last month's QR code) belongs to the invoice that now holds that debt.
 * Follows the chain to the latest one.
 */
export async function resolveCarryingInvoice<T extends { id: string; user_id: string; carried_forward_amount?: unknown }>(
  db: SupabaseLike,
  invoice: T,
): Promise<T> {
  let current = invoice;
  for (let hop = 0; hop < 24 && money(current.carried_forward_amount) > 0; hop += 1) {
    const nextRes = await db
      .from("invoices")
      .select("*")
      .eq("user_id", current.user_id)
      .eq("previous_debt_source_invoice_id", current.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (nextRes.error || !nextRes.data) break;
    current = nextRes.data as T;
  }
  return current;
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
  await syncActiveContractSnapshots(db, userId, due.map((row: { service_id: string }) => String(row.service_id)));
}

type SnapshotEntry = Record<string, unknown> & { service_id?: unknown; occupant_count?: unknown };

/** Snapshots are JSONB arrays, but some older rows hold the array as a JSON string. */
export function parseSnapshot(snapshot: unknown): SnapshotEntry[] {
  if (Array.isArray(snapshot)) return snapshot as SnapshotEntry[];
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

const normalizeName = (value: unknown) => String(value ?? "").trim().toLowerCase();

/**
 * Finds the service a snapshot entry belongs to: by service_id (or id on older
 * entries), else by name when the entry has no id that still exists. Without the
 * name fallback, entries written by older app versions never picked up edits.
 */
function serviceForEntry(entry: SnapshotEntry, byId: Map<string, ServiceRow>, byName: Map<string, ServiceRow | null>) {
  const id = String(entry?.service_id ?? entry?.id ?? "");
  if (id && byId.has(id)) return byId.get(id)!;
  return byName.get(normalizeName(entry?.name)) ?? undefined;
}

function indexServices(services: ServiceRow[]) {
  const byId = new Map(services.map((service) => [String(service.id), service]));
  // A name shared by two services is ambiguous, so it matches neither.
  const byName = new Map<string, ServiceRow | null>();
  for (const service of services) {
    const key = normalizeName(service.name);
    if (!key) continue;
    byName.set(key, byName.has(key) ? null : service);
  }
  return { byId, byName };
}

/**
 * Re-prices the entries of a contract snapshot that belong to the given
 * services, keeping every other entry (and the entry order) as it was.
 * Returns null when nothing in the snapshot changed.
 */
export function refreshSnapshotEntries(
  snapshot: unknown,
  services: ServiceRow[],
  options: { occupantCount: number; roomHasAc: boolean },
): SnapshotEntry[] | null {
  const entries = parseSnapshot(snapshot);
  const { byId, byName } = indexServices(services);
  let changed = typeof snapshot === "string" && entries.length > 0;
  const next = entries.map((entry) => {
    const service = serviceForEntry(entry, byId, byName);
    if (!service) return entry;
    const [rebuilt] = buildAppliedServicesSnapshot([service], {
      occupantCount: Number(entry.occupant_count || options.occupantCount || 1),
      roomHasAc: options.roomHasAc,
    });
    const same = Object.keys(rebuilt).every((key) => JSON.stringify((rebuilt as Record<string, unknown>)[key]) === JSON.stringify(entry[key]));
    if (!same) changed = true;
    return same ? entry : { ...entry, ...rebuilt };
  });
  return changed ? next : null;
}

const SERVICE_COLUMNS = "id,name,type,unit,unit_price,unit_price_ac";

async function writeSnapshot(db: SupabaseLike, userId: string, contractId: unknown, snapshot: SnapshotEntry[]) {
  const res = await db
    .from("contracts")
    .update({ applied_services_snapshot: snapshot, updated_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("user_id", userId);
  return !res.error;
}

/**
 * Carries an edited service price into the active contracts that use it.
 *
 * Invoices are priced from the contract snapshot, so without this an owner
 * who changes a service fee keeps billing the old fee on every running
 * contract. Ended contracts keep the price they were settled at.
 */
export async function syncActiveContractSnapshots(db: SupabaseLike, userId: string, serviceIds: string[]): Promise<number> {
  const ids = [...new Set(serviceIds.filter(Boolean))];
  if (ids.length === 0) return 0;

  const [servicesRes, contractsRes] = await Promise.all([
    db.from("services").select(SERVICE_COLUMNS).eq("user_id", userId).in("id", ids),
    db.from("contracts").select("id,room_id,occupant_count,applied_services_snapshot").eq("user_id", userId).eq("status", "active"),
  ]);
  const services: ServiceRow[] = servicesRes.data ?? [];
  if (servicesRes.error || contractsRes.error || services.length === 0) return 0;

  const { byId, byName } = indexServices(services);
  const affected = (contractsRes.data ?? []).filter((contract: any) =>
    parseSnapshot(contract.applied_services_snapshot).some((entry) => serviceForEntry(entry, byId, byName)),
  );
  if (affected.length === 0) return 0;

  const roomIds = [...new Set(affected.map((contract: any) => String(contract.room_id)))];
  const roomsRes = await db.from("rooms").select("id,has_ac").eq("user_id", userId).in("id", roomIds);
  const hasAc = new Map<string, boolean>((roomsRes.data ?? []).map((room: any) => [String(room.id), Boolean(room.has_ac)]));

  let updated = 0;
  for (const contract of affected) {
    const next = refreshSnapshotEntries(contract.applied_services_snapshot, services, {
      occupantCount: Number(contract.occupant_count || 1),
      roomHasAc: hasAc.get(String(contract.room_id)) ?? false,
    });
    if (next && (await writeSnapshot(db, userId, contract.id, next))) updated += 1;
  }
  return updated;
}

/**
 * Brings one active contract's snapshot up to the owner's current service
 * prices before it is billed, and saves it when anything changed. This catches
 * prices edited before syncActiveContractSnapshots existed, or edits whose
 * sync never reached this contract. Returns the snapshot to price from.
 */
export async function refreshActiveContractSnapshot(
  db: SupabaseLike,
  userId: string,
  contract: { id: unknown; room_id?: unknown; status?: unknown; occupant_count?: unknown; applied_services_snapshot?: unknown },
): Promise<unknown> {
  if (contract.status !== "active") return contract.applied_services_snapshot;
  const [servicesRes, roomRes] = await Promise.all([
    db.from("services").select(SERVICE_COLUMNS).eq("user_id", userId),
    contract.room_id
      ? db.from("rooms").select("id,has_ac").eq("id", contract.room_id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (servicesRes.error || !servicesRes.data?.length) return contract.applied_services_snapshot;
  const next = refreshSnapshotEntries(contract.applied_services_snapshot, servicesRes.data, {
    occupantCount: Number(contract.occupant_count || 1),
    roomHasAc: Boolean(roomRes.data?.has_ac),
  });
  if (!next) return contract.applied_services_snapshot;
  await writeSnapshot(db, userId, contract.id, next);
  return next;
}

/**
 * The batch form of refreshActiveContractSnapshot, for list endpoints that
 * already hold the contracts and rooms. Updates each contract in place.
 */
export async function refreshContractSnapshots(
  db: SupabaseLike,
  userId: string,
  contracts: Array<{ id: unknown; room_id?: unknown; occupant_count?: unknown; applied_services_snapshot?: unknown }>,
  rooms: Array<{ id: unknown; has_ac?: unknown }>,
): Promise<void> {
  if (contracts.length === 0) return;
  const servicesRes = await db.from("services").select(SERVICE_COLUMNS).eq("user_id", userId);
  if (servicesRes.error || !servicesRes.data?.length) return;
  const hasAc = new Map(rooms.map((room) => [String(room.id), Boolean(room.has_ac)]));
  await Promise.all(contracts.map(async (contract) => {
    const next = refreshSnapshotEntries(contract.applied_services_snapshot, servicesRes.data, {
      occupantCount: Number(contract.occupant_count || 1),
      roomHasAc: hasAc.get(String(contract.room_id)) ?? false,
    });
    if (!next) return;
    contract.applied_services_snapshot = next;
    await writeSnapshot(db, userId, contract.id, next);
  }));
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
