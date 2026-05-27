import { describe, expect, it } from "vitest";
import {
  extractPaymentCodeFromPayload,
  extractPaymentCodeFromText,
  generatePaymentCode,
  getPaymentCodePrefix,
} from "../src/utils/paymentCodes.js";

describe("payment code helpers", () => {
  it("generates a system-owned invoice payment code", () => {
    const code = generatePaymentCode();

    expect(getPaymentCodePrefix()).toBe("TCINV");
    expect(code).toMatch(/^TCINV[A-F0-9]{10}$/);
  });

  it("extracts a payment code from SePay transfer content", () => {
    expect(extractPaymentCodeFromText("CK tien phong TCINV8F3A19C02B cam on")).toBe("TCINV8F3A19C02B");
  });

  it("normalizes direct payment code fields", () => {
    expect(extractPaymentCodeFromPayload({ payment_code: " tcinv-8f3a19c02b " })).toBe("TCINV8F3A19C02B");
  });

  it("does not match generic hard-coded notes without an invoice code", () => {
    expect(extractPaymentCodeFromText("THANH TOAN TIEN PHONG")).toBe("");
    expect(extractPaymentCodeFromText("TCINV")).toBe("");
    expect(extractPaymentCodeFromText("TCINVABC")).toBe("");
  });
});
