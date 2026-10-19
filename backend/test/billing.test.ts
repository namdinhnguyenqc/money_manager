import { describe, expect, it } from 'vitest';
import { calculateProratedRoomFee, resolveInvoiceRoomFee } from '../src/utils/billing.js';

describe('first-month room fee proration', () => {
  it('charges from 17 July through 31 July inclusively', () => {
    expect(calculateProratedRoomFee(3_100_000, '2026-07-17', 7, 2026)).toBe(1_500_000);
  });

  it('keeps full rent for later months and a first-day move-in', () => {
    expect(calculateProratedRoomFee(3_100_000, '2026-07-17', 8, 2026)).toBe(3_100_000);
    expect(calculateProratedRoomFee(3_100_000, '2026-07-01', 7, 2026)).toBe(3_100_000);
  });

  it('preserves an explicit manual override', () => {
    expect(resolveInvoiceRoomFee({
      requestedRoomFee: 900_000,
      monthlyRent: 3_100_000,
      contractStartDate: '2026-07-17',
      month: 7,
      year: 2026,
    })).toBe(900_000);
  });
});

describe("first-month service proration", () => {
  it("prorates only contract services that are not metered", async () => {
    const { firstMonthStay, prorateFirstMonthServiceItems } = await import("../src/utils/billing.js");
    const stay = firstMonthStay("2026-10-15", 10, 2026);
    expect(stay).toEqual({ stayedDays: 17, daysInMonth: 31 });

    const snapshot = [
      { service_id: "water", name: "Nước", type: "per_person" },
      { service_id: "wifi", name: "Wifi", type: "per_room" },
      { service_id: "elec", name: "Điện", type: "metered" },
    ];
    const items = [
      { name: "Nước", amount: 50000, detail: "1 người × 50.000 ₫" },
      { name: "Wifi", amount: 70000, serviceId: "wifi" },
      { name: "Điện", amount: 34000, serviceId: "elec", calculationType: "metered" },
      { name: "Sửa khóa", amount: 100000 },
    ];
    const result = prorateFirstMonthServiceItems(items, snapshot, stay);
    expect(result.map((item) => item.amount)).toEqual([27419, 38387, 34000, 100000]);
    expect(result[0].detail).toBe("1 người × 50.000 ₫ · tháng đầu 17/31 ngày");
  });

  it("leaves full months and contracts starting on the 1st alone", async () => {
    const { firstMonthStay, prorateFirstMonthServiceItems } = await import("../src/utils/billing.js");
    expect(firstMonthStay("2026-10-01", 10, 2026)).toBeNull();
    expect(firstMonthStay("2026-09-15", 10, 2026)).toBeNull();
    const items = [{ name: "Wifi", amount: 70000 }];
    expect(prorateFirstMonthServiceItems(items, [{ name: "Wifi", type: "per_room" }], null)).toBe(items);
  });
});
