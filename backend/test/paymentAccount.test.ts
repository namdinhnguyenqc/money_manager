import { describe, expect, it } from "vitest";
import { buildInvoicePayment, publicAccountFields, resolvePaymentAccount } from "../src/utils/paymentAccount.js";

type Rows = Record<string, any[]>;

// A tiny stand-in for the Supabase query builder: filters by eq/in, honours
// maybeSingle, ignores ordering (rows are given in the order wanted).
function fakeDb(tables: Rows) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const q: any = {
        select: () => q,
        eq: (col: string, val: unknown) => { rows = rows.filter((r) => r[col] === val); return q; },
        in: (col: string, vals: unknown[]) => { rows = rows.filter((r) => vals.includes(r[col])); return q; },
        not: (col: string) => { rows = rows.filter((r) => r[col] != null); return q; },
        order: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (resolve: any) => resolve({ data: rows, error: null }),
      };
      return q;
    },
  };
}

const sepay = { id: "ch1", user_id: "u1", provider: "sepay", display_name: "ACB", bank_id: "970416", account_no: "111", account_name: "A", enabled: true, is_default: true };
const other = { id: "ch2", user_id: "u1", provider: "bank_transfer", display_name: "VCB", bank_id: "970436", account_no: "222", account_name: "B", enabled: true, is_default: false };

describe("resolvePaymentAccount", () => {
  it("uses the invoice's own channel while it is enabled", async () => {
    const account = await resolvePaymentAccount(fakeDb({ payment_channels: [sepay, other] }), "u1", "ch2");
    expect(account).toMatchObject({ source: "channel", channelId: "ch2", accountNo: "222" });
  });

  it("falls back to the default channel when the invoice's channel was disabled", async () => {
    const account = await resolvePaymentAccount(fakeDb({ payment_channels: [sepay, { ...other, enabled: false }] }), "u1", "ch2");
    expect(account).toMatchObject({ channelId: "ch1", accountNo: "111" });
  });

  it("falls back to bank config, then to the account typed in settings", async () => {
    const bank = await resolvePaymentAccount(fakeDb({ bank_config: [{ user_id: "u1", bank_name: "970418", account_number: "333", account_name: "C" }] }), "u1", null);
    expect(bank).toMatchObject({ source: "bank_config", bankId: "970418", accountNo: "333" });
    const settings = await resolvePaymentAccount(fakeDb({ system_settings: [
      { user_id: "u1", key: "static_bank_name", value: "970422" },
      { user_id: "u1", key: "static_bank_account_number", value: "4 44" },
    ] }), "u1", null);
    expect(settings).toMatchObject({ source: "settings", bankId: "970422", accountNo: "444" });
  });

  it("returns nothing (no made-up account) when nothing is configured", async () => {
    expect(await resolvePaymentAccount(fakeDb({}), "u1", null)).toBeNull();
  });
});

describe("buildInvoicePayment", () => {
  const account = { source: "channel" as const, channelId: "ch1", provider: "sepay", displayName: null, bankId: "970416", accountNo: "111", accountName: "A", staticQrUrl: null };

  it("puts what is left to pay and the payment code in the QR", () => {
    const payment = buildInvoicePayment({ total_amount: 2_000_000, paid_amount: 1_800_000, payment_code: "TC123" }, account);
    expect(payment.amount).toBe(200_000);
    expect(payment.qrUrl).toContain("970416-111");
    expect(payment.qrUrl).toContain("amount=200000");
    expect(payment.qrUrl).toContain("addInfo=TC123");
  });

  it("shows no QR once the invoice is paid (it used to ask for the full total again)", () => {
    expect(buildInvoicePayment({ total_amount: 2_000_000, paid_amount: 2_000_000, payment_code: "TC123" }, account).qrUrl).toBeNull();
  });

  it("only exposes public account fields", () => {
    expect(Object.keys(publicAccountFields(account)!)).not.toContain("staticQrUrl");
  });
});
