import { describe, expect, it } from "vitest";
import { buildCheckoutPreview, settleAgainstDeposit } from "../src/utils/checkoutSettlement.js";

const services = [
  { name: "Tiền điện", category: "electricity", type: "metered", unit: "kWh", applied_unit_price: 3500, is_metered: true },
  { name: "Tiền nước", category: "water", type: "metered", unit: "m³", applied_unit_price: 15000, is_metered: true },
  { name: "Wifi", category: "other", type: "fixed", amount: 100000 },
];
const contract = { start_date: "2026-05-10", rent_amount: 3000000, deposit: 3000000, electric_start: 100, water_start: 20 };

describe("settleAgainstDeposit", () => {
  it("refunds the tenant when charges are below the deposit", () => {
    expect(settleAgainstDeposit(3000000, 1200000)).toEqual({ refundToTenant: 1800000, tenantPays: 0, isEven: false });
  });
  it("asks the tenant to pay when charges exceed the deposit", () => {
    expect(settleAgainstDeposit(3000000, 3500000)).toEqual({ refundToTenant: 0, tenantPays: 500000, isEven: false });
  });
  it("is even when charges equal the deposit", () => {
    expect(settleAgainstDeposit(3000000, 3000000)).toEqual({ refundToTenant: 0, tenantPays: 0, isEven: true });
  });
});

describe("buildCheckoutPreview", () => {
  it("prorates rent and fixed services up to the move-out date", () => {
    const preview = buildCheckoutPreview({ moveOutDate: "2026-06-15", contract, services, invoices: [] });
    expect(preview.rent).toMatchObject({ alreadyInvoiced: false, stayedDays: 15, daysInMonth: 30, amount: 1500000, fromDate: "2026-06-01" });
    expect(preview.fixedServices).toEqual([{ name: "Wifi", monthlyAmount: 100000, amount: 50000 }]);
  });

  it("starts proration at the contract start in the first month", () => {
    const preview = buildCheckoutPreview({ moveOutDate: "2026-05-19", contract, services, invoices: [] });
    expect(preview.rent).toMatchObject({ stayedDays: 10, fromDate: "2026-05-10" });
  });

  it("does not charge rent or fixed services again when the month is already invoiced", () => {
    const invoices = [{ id: "i1", month: 6, year: 2026, total_amount: 3400000, paid_amount: 0, elec_new: 250, water_new: 31 }];
    const preview = buildCheckoutPreview({ moveOutDate: "2026-06-15", contract, services, invoices });
    expect(preview.rent).toMatchObject({ alreadyInvoiced: true, amount: 0 });
    expect(preview.fixedServices).toEqual([]);
    expect(preview.unpaidInvoices).toEqual([{ id: "i1", month: 6, year: 2026, remaining: 3400000 }]);
  });

  it("reads meters from the latest invoice, else from the contract baseline", () => {
    const fresh = buildCheckoutPreview({ moveOutDate: "2026-06-15", contract, services, invoices: [] });
    expect(fresh.meters.electricity).toMatchObject({ lastReading: 100, unitPrice: 3500 });
    expect(fresh.meters.water).toMatchObject({ lastReading: 20, unitPrice: 15000 });

    const invoices = [
      { id: "a", month: 5, year: 2026, total_amount: 1, paid_amount: 1, elec_new: 180, water_new: 25 },
      { id: "b", month: 4, year: 2026, total_amount: 1, paid_amount: 1, elec_new: 150, water_new: 22 },
    ];
    const later = buildCheckoutPreview({ moveOutDate: "2026-06-15", contract, services, invoices });
    expect(later.meters.electricity?.lastReading).toBe(180);
    expect(later.meters.water?.lastReading).toBe(25);
    expect(later.unpaidInvoices).toEqual([]);
  });

  it("classifies snapshots that have no category, and bills per-person water as a fixed charge", () => {
    const legacy = [
      { name: "Điện có máy lạnh", type: "metered", unit: "kWh", unit_price: 4000, amount: 4000 },
      { name: "Nước", type: "per_person", unit: "người", unit_price: 50000, amount: 50000 },
      { name: "Rác", type: "per_room", unit: "phòng", unit_price: 36500, amount: 36500 },
    ];
    const preview = buildCheckoutPreview({
      moveOutDate: "2026-06-15",
      contract: { ...contract, occupant_count: 2 },
      services: legacy,
      invoices: [],
    });
    expect(preview.meters.electricity).toMatchObject({ name: "Điện có máy lạnh", unitPrice: 4000, lastReading: 100 });
    expect(preview.meters.water).toBeNull();
    expect(preview.fixedServices).toEqual([
      { name: "Nước", monthlyAmount: 100000, amount: 50000 },
      { name: "Rác", monthlyAmount: 36500, amount: 18250 },
    ]);
  });

  it("omits a meter the contract has no service for", () => {
    const preview = buildCheckoutPreview({ moveOutDate: "2026-06-15", contract, services: [services[0]], invoices: [] });
    expect(preview.meters.water).toBeNull();
  });
});
