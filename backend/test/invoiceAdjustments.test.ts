import { describe, expect, it } from "vitest";
import { applyAddedItem, isCheckViolation } from "../src/utils/invoiceAdjustments.js";

describe("applyAddedItem", () => {
  it("adds a charge to an unpaid invoice", () => {
    expect(applyAddedItem({ total: 3_000_000, paid: 0, amount: 150_000 })).toEqual({ ok: true, newTotal: 3_150_000, status: "unpaid" });
  });

  it("accepts a discount and lowers the total", () => {
    expect(applyAddedItem({ total: 3_000_000, paid: 1_000_000, amount: -50_000 })).toEqual({ ok: true, newTotal: 2_950_000, status: "partial" });
  });

  it("marks the invoice paid when a discount covers the remainder", () => {
    expect(applyAddedItem({ total: 3_000_000, paid: 2_900_000, amount: -100_000 })).toEqual({ ok: true, newTotal: 2_900_000, status: "paid" });
  });

  it("rejects a discount below what was already collected", () => {
    expect(applyAddedItem({ total: 3_000_000, paid: 2_900_000, amount: -200_000 }).ok).toBe(false);
  });

  it("rejects a discount larger than the invoice", () => {
    expect(applyAddedItem({ total: 100_000, paid: 0, amount: -200_000 }).ok).toBe(false);
  });

  it("rejects zero", () => {
    expect(applyAddedItem({ total: 100_000, paid: 0, amount: 0 }).ok).toBe(false);
  });
});

describe("isCheckViolation", () => {
  it("recognises the Postgres CHECK error code", () => {
    expect(isCheckViolation({ code: "23514" })).toBe(true);
    expect(isCheckViolation({ code: "23505" })).toBe(false);
    expect(isCheckViolation(null)).toBe(false);
  });
});
