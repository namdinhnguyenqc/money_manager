import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyInvoicePayment } from "../src/services/invoicePayments.js";
import { updateWalletBalance } from "../src/utils/wallet.js";

type Row = Record<string, any>;

vi.mock("../src/utils/wallet.js", () => ({
  updateWalletBalance: vi.fn().mockResolvedValue(undefined),
}));

let rows: Record<string, Row[]>;
let failTransactionInsert = false;

class Query {
  filters: { col: string; value: any }[] = [];
  mode: "select" | "insert" | "update" = "select";
  payload: any = null;
  wantsSingle = false;
  wantsMaybeSingle = false;

  constructor(private table: string) {}

  select() { return this; }
  eq(col: string, value: any) { this.filters.push({ col, value }); return this; }
  single() { this.wantsSingle = true; return this; }
  maybeSingle() { this.wantsMaybeSingle = true; return this; }
  limit() { return this; }
  insert(payload: any) { this.mode = "insert"; this.payload = payload; return this; }
  update(payload: any) { this.mode = "update"; this.payload = payload; return this; }

  async execute() {
    rows[this.table] ||= [];
    let found = rows[this.table].filter((row) => this.filters.every((filter) => row[filter.col] === filter.value));

    if (this.mode === "insert") {
      if (this.table === "transactions" && failTransactionInsert) {
        return { data: null, error: { message: "insert failed" } };
      }
      const inserted = { id: `${this.table}-${rows[this.table].length + 1}`, ...this.payload };
      rows[this.table].push(inserted);
      found = [inserted];
    }

    if (this.mode === "update") {
      rows[this.table] = rows[this.table].map((row) => {
        if (!found.some((match) => match.id === row.id)) return row;
        return { ...row, ...this.payload };
      });
      found = rows[this.table].filter((row) => this.filters.every((filter) => row[filter.col] === filter.value));
    }

    if (this.wantsMaybeSingle) {
      return { data: found[0] ?? null, error: null };
    }
    if (this.wantsSingle) {
      return found[0] ? { data: found[0], error: null } : { data: null, error: { message: "not found" } };
    }
    return { data: found, error: null };
  }

  then(resolve: any, reject: any) {
    return this.execute().then(resolve, reject);
  }
}

const db = {
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: any) => {
    if (name === "apply_invoice_payment_atomic") {
      const invoiceId = args.p_invoice_id;
      const userId = args.p_user_id;
      const walletId = args.p_wallet_id;
      const amount = args.p_amount;
      const source = args.p_source;
      const date = args.p_date;
      const description = args.p_description;
      const externalRef = args.p_external_ref;
      const metadata = args.p_metadata || {};

      rows.invoices ||= [];
      rows.transactions ||= [];

      const invoiceIndex = rows.invoices.findIndex((inv) => inv.id === invoiceId && inv.user_id === userId);
      if (invoiceIndex === -1) {
        return { data: { error: "Invoice not found" }, error: null };
      }
      const invoice = rows.invoices[invoiceIndex];

      // Idempotency check
      if (externalRef) {
        const existingTx = rows.transactions.find((tx) => tx.user_id === userId && tx.external_ref === externalRef);
        if (existingTx) {
          const txMeta = existingTx.metadata || {};
          return {
            data: {
              ok: true,
              idempotent: true,
              transaction_id: existingTx.id,
              allocated_amount: txMeta.allocated_amount ?? existingTx.amount,
              overpaid_amount: txMeta.overpaid_amount ?? 0,
              status: invoice.status,
            },
            error: null,
          };
        }
      }

      const total = Number(invoice.total_amount || 0);
      const currentPaid = Number(invoice.paid_amount || 0);
      const remaining = Math.max(0, total - currentPaid);

      if (remaining <= 0) {
        return { data: { error: "Hóa đơn này đã được thanh toán đầy đủ." }, error: null };
      }

      if (amount <= 0) {
        return { data: { error: "Invalid payment amount." }, error: null };
      }

      const allocatedAmount = Math.min(amount, remaining);
      const overpaidAmount = Math.max(0, amount - remaining);
      const nextPaid = currentPaid + allocatedAmount;
      const nextStatus = nextPaid >= total ? "paid" : "partial";

      if (failTransactionInsert) {
        return { data: null, error: { message: "insert failed" } };
      }

      // Update invoice status & paid amount
      invoice.paid_amount = nextPaid;
      invoice.status = nextStatus;

      // Insert transaction
      const txId = `transactions-${rows.transactions.length + 1}`;
      const newTx = {
        id: txId,
        user_id: userId,
        type: "income",
        amount,
        description,
        category_id: null,
        wallet_id: walletId,
        image_uri: null,
        date,
        invoice_id: invoiceId,
        contract_id: invoice.contract_id || null,
        source,
        external_ref: externalRef,
        metadata: {
          ...metadata,
          allocated_amount: allocatedAmount,
          overpaid_amount: overpaidAmount,
          payment_code: invoice.payment_code || null,
        },
      };
      rows.transactions.push(newTx);

      // Link invoice to transaction
      invoice.transaction_id = txId;

      // Update wallet balance
      await updateWalletBalance(db as any, walletId, amount, "income");

      return {
        data: {
          ok: true,
          transaction_id: txId,
          allocated_amount: allocatedAmount,
          overpaid_amount: overpaidAmount,
          status: nextStatus,
          next_paid: nextPaid,
        },
        error: null,
      };
    }
    return { data: null, error: { message: "unknown RPC" } };
  }
};

const seedInvoice = (overrides: Row = {}) => {
  const invoice = {
    id: "invoice-1",
    user_id: "owner-1",
    room_id: "room-1",
    room_name: "101",
    contract_id: "contract-1",
    month: 5,
    year: 2026,
    total_amount: 2_000_000,
    paid_amount: 0,
    status: "unpaid",
    payment_code: "TCINV123",
    transaction_id: null,
    ...overrides,
  };
  rows.invoices = [invoice];
  return invoice;
};

describe("applyInvoicePayment", () => {
  beforeEach(() => {
    rows = { invoices: [], transactions: [] };
    failTransactionInsert = false;
    vi.clearAllMocks();
  });

  it("records a partial receipt when received amount is below remaining invoice amount", async () => {
    const invoice = seedInvoice();

    const result = await applyInvoicePayment(db as any, {
      invoice,
      amount: 1_500_000,
      walletId: "wallet-1",
      source: "sepay",
      externalRef: "SP-1",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({ allocatedAmount: 1_500_000, overpaidAmount: 0, status: "partial" });
    expect(rows.invoices[0]).toMatchObject({ paid_amount: 1_500_000, status: "partial", transaction_id: "transactions-1" });
    expect(rows.transactions[0]).toMatchObject({ amount: 1_500_000, source: "sepay", external_ref: "SP-1" });
    expect(updateWalletBalance).toHaveBeenCalledWith(db, "wallet-1", 1_500_000, "income");
  });

  it("marks the invoice paid when received amount exactly covers the remaining amount", async () => {
    const invoice = seedInvoice({ paid_amount: 500_000, status: "partial" });

    const result = await applyInvoicePayment(db as any, {
      invoice,
      amount: 1_500_000,
      walletId: "wallet-1",
      source: "sepay",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({ allocatedAmount: 1_500_000, overpaidAmount: 0, status: "paid" });
    expect(rows.invoices[0]).toMatchObject({ paid_amount: 2_000_000, status: "paid" });
  });

  it("keeps actual receipt amount while allocating only the remaining invoice amount when overpaid", async () => {
    const invoice = seedInvoice();

    const result = await applyInvoicePayment(db as any, {
      invoice,
      amount: 2_200_000,
      walletId: "wallet-1",
      source: "sepay",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({ allocatedAmount: 2_000_000, overpaidAmount: 200_000, status: "paid" });
    expect(rows.invoices[0]).toMatchObject({ paid_amount: 2_000_000, status: "paid" });
    expect(rows.transactions[0]).toMatchObject({ amount: 2_200_000 });
    expect(rows.transactions[0].metadata).toMatchObject({ allocated_amount: 2_000_000, overpaid_amount: 200_000 });
  });

  it("is idempotent: a repeated externalRef does not credit the wallet twice", async () => {
    const invoice = seedInvoice();

    const first = await applyInvoicePayment(db as any, {
      invoice,
      amount: 1_500_000,
      walletId: "wallet-1",
      source: "sepay",
      externalRef: "SP-DUP",
    });
    expect(first.error).toBeUndefined();
    expect(rows.transactions).toHaveLength(1);

    // Simulate a SePay webhook retry with the same transaction reference.
    const second = await applyInvoicePayment(db as any, {
      invoice: rows.invoices[0],
      amount: 1_500_000,
      walletId: "wallet-1",
      source: "sepay",
      externalRef: "SP-DUP",
    });

    expect(second.error).toBeUndefined();
    expect(rows.transactions).toHaveLength(1); // no duplicate transaction
    expect(updateWalletBalance).toHaveBeenCalledTimes(1); // wallet credited once
  });

  it("rolls the invoice back when receipt creation fails", async () => {
    const invoice = seedInvoice({ paid_amount: 300_000, status: "partial", transaction_id: "old-tx" });
    failTransactionInsert = true;

    const result = await applyInvoicePayment(db as any, {
      invoice,
      amount: 1_700_000,
      walletId: "wallet-1",
      source: "sepay",
    });

    expect(result.error).toBe("insert failed");
    expect(rows.invoices[0]).toMatchObject({ paid_amount: 300_000, status: "partial", transaction_id: "old-tx" });
    expect(updateWalletBalance).not.toHaveBeenCalled();
  });
});
