import { describe, expect, it } from "vitest";
import { calculateProratedRent } from "../src/utils/rentCalc.js";

describe("calculateProratedRent", () => {
  it("counts both the first and the last day", () => {
    const result = calculateProratedRent(3_100_000, new Date(2026, 9, 5), new Date(2026, 9, 31));
    expect(result).toMatchObject({ daysInMonth: 31, stayedDays: 27, totalAmount: 2_700_000 });
  });

  it("uses the real length of February", () => {
    expect(calculateProratedRent(2_800_000, new Date(2026, 1, 1), new Date(2026, 1, 14))).toMatchObject({ daysInMonth: 28, stayedDays: 14, totalAmount: 1_400_000 });
  });

  it("does not count a partial last day", () => {
    const result = calculateProratedRent(3_000_000, new Date(2026, 10, 1, 12), new Date(2026, 10, 3, 9));
    expect(result.stayedDays).toBe(2);
  });
});
