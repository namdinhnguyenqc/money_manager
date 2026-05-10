import { describe, expect, it, vi, beforeEach } from "vitest";
import { createTenant, onlyDigits, RentalValidationError, validateTenantInput } from "../src/lib/rentalOps";

describe("rental tenant validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid tenant phone and id card before calling API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(createTenant({
      name: "Khách A",
      phone: "1",
      email: "0927368772@gmail.com",
      idCard: "1",
    })).rejects.toBeInstanceOf(RentalValidationError);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns field-level messages for invalid tenant input", () => {
    const result = validateTenantInput({
      name: "Khách A",
      phone: "1",
      email: "bad-email",
      idCard: "1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.phone).toBe("Số điện thoại phải có đúng 10 số.");
      expect(result.fieldErrors.idCard).toBe("CCCD phải có đúng 12 số.");
      expect(result.fieldErrors.email).toBe("Email không hợp lệ.");
    }
  });

  it("rejects old 9-digit identity numbers for CCCD rental flow", () => {
    const result = validateTenantInput({
      name: "Khách A",
      phone: "0927368772",
      email: "0927368772@gmail.com",
      idCard: "123456789",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.idCard).toBe("CCCD phải có đúng 12 số.");
    }
  });

  it("accepts valid tenant identity data", () => {
    const result = validateTenantInput({
      name: "Khách A",
      phone: "0927368772",
      email: "0927368772@gmail.com",
      idCard: "123456789012",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.phone).toBe("0927368772");
      expect(result.data.idCard).toBe("123456789012");
    }
  });

  it("strips non-digits and caps CCCD/phone input length", () => {
    expect(onlyDigits("abc123-456 789 012xyz", 12)).toBe("123456789012");
    expect(onlyDigits("09a27368772xxx", 10)).toBe("0927368772");
  });
});
