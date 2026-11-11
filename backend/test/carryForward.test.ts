import { describe, expect, it } from "vitest";
import { buildCheckoutPreview } from "../src/utils/checkoutSettlement.js";
import { carryForwardUpdate, invoiceStatusFor, reopenCarriedUpdate, resolveCarryingInvoice } from "../src/utils/billing.js";

// Scenario from the owner: October bill 2.000.000, tenant paid 1.800.000.
// November's bill takes over the 200.000 as previous_debt.
const october = { total_amount: 2_000_000, paid_amount: 1_800_000, carried_forward_amount: 0 };

describe("carryForwardUpdate", () => {
  it("closes the old bill so nothing is left to collect there", () => {
    const update = carryForwardUpdate(october)!;
    expect(update).toEqual({ total_amount: 1_800_000, carried_forward_amount: 200_000, status: "paid" });
    // Original total is still recoverable.
    expect(update.total_amount + update.carried_forward_amount).toBe(2_000_000);
  });

  it("closes a bill the tenant paid nothing on", () => {
    expect(carryForwardUpdate({ total_amount: 2_000_000, paid_amount: 0 })).toEqual({
      total_amount: 0,
      carried_forward_amount: 2_000_000,
      status: "paid",
    });
  });

  it("does nothing when the old bill was paid in full", () => {
    expect(carryForwardUpdate({ total_amount: 2_000_000, paid_amount: 2_000_000 })).toBeNull();
  });
});

describe("reopenCarriedUpdate", () => {
  it("gives the remainder back when the later bill is deleted", () => {
    const closed = { ...october, ...carryForwardUpdate(october)! };
    expect(reopenCarriedUpdate(closed)).toEqual({ total_amount: 2_000_000, carried_forward_amount: 0, status: "partial" });
  });

  it("does nothing for a bill that never carried anything", () => {
    expect(reopenCarriedUpdate(october)).toBeNull();
  });
});

describe("invoiceStatusFor", () => {
  it("maps totals to statuses", () => {
    expect(invoiceStatusFor(100, 100)).toBe("paid");
    expect(invoiceStatusFor(100, 40)).toBe("partial");
    expect(invoiceStatusFor(100, 0)).toBe("unpaid");
  });
});

describe("move-out settlement after a carry-over", () => {
  it("counts the 200.000 once, on November, not on both bills", () => {
    const closedOctober = { id: "oct", month: 10, year: 2026, paid_amount: 1_800_000, ...carryForwardUpdate(october)! };
    const november = { id: "nov", month: 11, year: 2026, total_amount: 2_200_000, paid_amount: 0 };
    const preview = buildCheckoutPreview({
      moveOutDate: "2026-12-05",
      contract: { start_date: "2026-01-01", rent_amount: 2_000_000, deposit: 2_000_000 },
      services: [],
      invoices: [closedOctober, november],
    });
    expect(preview.unpaidInvoices).toEqual([{ id: "nov", month: 11, year: 2026, remaining: 2_200_000 }]);
  });
});

// Minimal stand-in for the Supabase query builder used by resolveCarryingInvoice.
function fakeDb(rows: any[]) {
  return {
    from: () => {
      const filters: Record<string, unknown> = {};
      const builder: any = {
        select: () => builder,
        eq: (column: string, value: unknown) => { filters[column] = value; return builder; },
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({
          data: rows.find((row) => Object.entries(filters).every(([key, value]) => row[key] === value)) ?? null,
          error: null,
        }),
      };
      return builder;
    },
  };
}

describe("resolveCarryingInvoice", () => {
  const rows = [
    { id: "oct", user_id: "u", carried_forward_amount: 200_000, previous_debt_source_invoice_id: null },
    { id: "nov", user_id: "u", carried_forward_amount: 900_000, previous_debt_source_invoice_id: "oct" },
    { id: "dec", user_id: "u", carried_forward_amount: 0, previous_debt_source_invoice_id: "nov" },
  ];

  it("sends a payment on an old QR code to the bill that holds the debt now", async () => {
    const target = await resolveCarryingInvoice(fakeDb(rows), rows[0]);
    expect(target.id).toBe("dec");
  });

  it("keeps an open bill as it is", async () => {
    const target = await resolveCarryingInvoice(fakeDb(rows), rows[2]);
    expect(target.id).toBe("dec");
  });
});
