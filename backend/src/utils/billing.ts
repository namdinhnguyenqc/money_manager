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
 */
export function summarizeRoomInvoices(rows: InvoiceDebtRow[]): Map<string, RoomInvoiceSummary> {
  const byRoom = new Map<string, RoomInvoiceSummary & { latestRank: number }>();

  for (const row of rows ?? []) {
    const roomId = String(row?.room_id ?? "");
    if (!roomId) continue;

    const entry = byRoom.get(roomId) ?? { outstanding: 0, latestStatus: null, latestRank: -1 };

    if (row.status !== "paid") {
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
