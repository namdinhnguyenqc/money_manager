import { describe, expect, it } from "vitest";
import { buildInvoiceDraft, draftItemsForInsert, InvoiceDraftError, serviceCategory } from "../src/utils/invoiceDraft.js";

const snapshot = [
  { service_id: "e1", name: "Tiền điện", category: "electricity", type: "metered", unit: "kWh", applied_unit_price: 3500 },
  { service_id: "w1", name: "Tiền nước", category: "water", type: "per_person", applied_unit_price: 50000 },
  { service_id: "ac", name: "Máy lạnh", category: "other", type: "fixed", applied_unit_price: 200000 },
  { service_id: "r1", name: "Rác", type: "per_room", applied_unit_price: 36500 },
];

const contract = { rent_amount: 2_000_000, start_date: "2026-01-01", occupant_count: 2, applied_services_snapshot: snapshot };
const base = {
  month: 11,
  year: 2026,
  contract,
  readings: { elecOld: 100, elecNew: 150, waterOld: 0, waterNew: null },
};

describe("buildInvoiceDraft", () => {
  it("prices a normal month from the contract snapshot", () => {
    const draft = buildInvoiceDraft(base);
    const amounts = Object.fromEntries(draft.lines.map((line) => [line.key, line.amount]));
    expect(amounts).toEqual({ "svc-e1": 175_000, "svc-w1": 100_000, "svc-ac": 200_000, "svc-r1": 36_500 });
    expect(draft.rent.amount).toBe(2_000_000);
    expect(draft.chargesTotal).toBe(2_511_500);
    expect(draft.total).toBe(2_511_500);
    expect(draft.electricity).toEqual({ configured: true, metered: true });
    expect(draft.water).toEqual({ configured: true, metered: false });
  });

  it("records meter readings on the metered line", () => {
    const line = buildInvoiceDraft(base).lines[0];
    expect(line).toMatchObject({ metered: true, startReading: 100, endReading: 150, usageValue: 50, unitPrice: 3500 });
  });

  it("refuses a meter reading that goes backwards", () => {
    expect(() => buildInvoiceDraft({ ...base, readings: { ...base.readings, elecNew: 90 } })).toThrow(InvoiceDraftError);
  });

  it("prorates rent and non-metered services in a partial first month", () => {
    const draft = buildInvoiceDraft({ ...base, contract: { ...contract, start_date: "2026-11-21" } });
    // November has 30 days; staying 21st–30th is 10 days.
    expect(draft.rent).toMatchObject({ amount: 666_667, proration: { stayedDays: 10, daysInMonth: 30 } });
    const byKey = Object.fromEntries(draft.lines.map((line) => [line.key, line]));
    expect(byKey["svc-e1"].amount).toBe(175_000); // metered: by usage, not days
    expect(byKey["svc-ac"].amount).toBe(66_667);
    expect(byKey["svc-ac"].fullAmount).toBe(200_000);
    expect(byKey["svc-ac"].detail).toContain("tháng đầu 10/30 ngày");
  });

  it("charges the full month for services when the owner picks it", () => {
    const draft = buildInvoiceDraft({ ...base, contract: { ...contract, start_date: "2026-11-21" }, prorateFirstMonthServices: false });
    expect(draft.lines.find((line) => line.key === "svc-ac")!.amount).toBe(200_000);
  });

  it("drops switched-off services and rent", () => {
    const draft = buildInvoiceDraft({ ...base, excludeServiceIds: ["ac"], skipRent: true });
    const ac = draft.lines.find((line) => line.key === "svc-ac")!;
    expect(ac).toMatchObject({ skipped: true, amount: 0, fullAmount: 200_000 });
    expect(draft.rent.amount).toBe(0);
    expect(draftItemsForInsert(draft).map((item) => item.name)).not.toContain("Máy lạnh");
  });

  it("adds room services, pending fees and extra lines including discounts", () => {
    const draft = buildInvoiceDraft({
      ...base,
      roomServices: [{ id: "rs", service_id: "park", quantity: 2, custom_unit_price: 100_000, services: { name: "Gửi xe" } }],
      pendingAdjustments: [{ id: "adj", label: "Sửa vòi", amount: 80_000 }],
      extraItems: [
        { name: "Giảm do mất nước", detail: "2 ngày", amount: -50_000 },
        { name: "", amount: 10_000 }, // no name: ignored
      ],
    });
    const kinds = draft.lines.map((line) => [line.kind, line.amount]);
    expect(kinds).toContainEqual(["room_service", 200_000]);
    expect(kinds).toContainEqual(["adjustment", 80_000]);
    expect(kinds).toContainEqual(["extra", -50_000]);
    expect(draft.chargesTotal).toBe(2_511_500 + 200_000 + 80_000 - 50_000);
  });

  it("refuses discounts larger than the bill", () => {
    expect(() => buildInvoiceDraft({ ...base, skipRent: true, extraItems: [{ name: "Giảm", amount: -9_000_000 }] })).toThrow(InvoiceDraftError);
  });

  it("adds last period's debt and spends available credit on this period", () => {
    const draft = buildInvoiceDraft({ ...base, previousDebt: 200_000, availableCredit: 300_000 });
    expect(draft).toMatchObject({ previousDebt: 200_000, previousCredit: 300_000, creditLeftover: 0, total: 2_511_500 + 200_000 - 300_000 });
  });

  it("keeps leftover credit when it exceeds the charges", () => {
    const draft = buildInvoiceDraft({ ...base, skipRent: true, excludeServiceIds: ["e1", "w1", "ac", "r1"], availableCredit: 500_000 });
    expect(draft).toMatchObject({ chargesTotal: 0, previousCredit: 0, creditLeftover: 500_000, total: 0 });
  });

  it("keeps service ids only for services that still exist", () => {
    const items = draftItemsForInsert(buildInvoiceDraft(base), new Set(["e1", "w1"]));
    expect(items.map((item) => item.serviceId)).toEqual(["e1", "w1", null, null]);
  });
});

describe("serviceCategory", () => {
  it("falls back to unit and name for old snapshots", () => {
    expect(serviceCategory({ name: "Điện", unit: "kWh" })).toBe("electricity");
    expect(serviceCategory({ name: "Nước sinh hoạt" })).toBe("water");
    expect(serviceCategory({ name: "Wifi" })).toBe("other");
    expect(serviceCategory({ name: "Điện", category: "other" })).toBe("other");
  });
});
