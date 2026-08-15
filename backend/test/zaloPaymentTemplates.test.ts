import { describe, expect, it } from "vitest";
import {
  DEFAULT_ZALO_PAYMENT_RECEIVED_MESSAGE,
  renderZaloPaymentReceivedMessage,
} from "../src/services/zaloPaymentTemplates.js";

describe("Zalo payment received template", () => {
  it("renders receipt values for a fully paid invoice", () => {
    const message = renderZaloPaymentReceivedMessage(DEFAULT_ZALO_PAYMENT_RECEIVED_MESSAGE, {
      tenant_name: "Nguyễn Văn An",
      room_name: "P101",
      month: 8,
      year: 2026,
      received_amount: "2.074.900 đ",
      payment_status: "Đã thanh toán đủ",
      remaining_amount: "0 đ",
      payment_code: "TCINV123",
    });

    expect(message).toContain("đã nhận 2.074.900 đ");
    expect(message).toContain("phòng P101 tháng 8/2026");
    expect(message).toContain("Đã thanh toán đủ");
    expect(message).toContain("TCINV123");
    expect(message).not.toMatch(/\{(?:tenant_name|received_amount|payment_status)\}/);
  });

  it("preserves unknown placeholders so a typo remains visible to the owner", () => {
    expect(renderZaloPaymentReceivedMessage("{tenant_name} {custom_token}", {
      tenant_name: "An",
    })).toBe("An {custom_token}");
  });
});
