import type { SupabaseClient } from "@supabase/supabase-js";
import { updateWalletBalance } from "../utils/wallet.js";

type ApplyInvoicePaymentInput = {
  invoice: any;
  amount: number;
  walletId: string;
  source: "manual" | "sepay" | "bank_transfer" | "cash";
  date?: string;
  note?: string;
  externalRef?: string | null;
  metadata?: Record<string, unknown>;
  roomName?: string | null;
};

export type ApplyInvoicePaymentResult = {
  invoice: any;
  transaction: any;
  allocatedAmount: number;
  overpaidAmount: number;
  status: "paid" | "partial";
};

const toDateOnly = (value?: string) => {
  if (!value) return new Date().toISOString().split("T")[0];
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return value.slice(0, 10);
};

export async function applyInvoicePayment(
  db: SupabaseClient,
  input: ApplyInvoicePaymentInput
): Promise<{ data?: ApplyInvoicePaymentResult; error?: string }> {
  const invoice = input.invoice;
  const total = Number(invoice.total_amount || 0);
  const currentPaid = Number(invoice.paid_amount || 0);
  const remaining = Math.max(0, total - currentPaid);
  const receivedAmount = Number(input.amount || 0);

  if (!invoice?.id) return { error: "Invoice is required." };
  if (receivedAmount <= 0) return { error: "Invalid payment amount." };
  if (remaining <= 0) return { error: "Hóa đơn này đã được thanh toán đầy đủ." };

  const allocatedAmount = Math.min(receivedAmount, remaining);
  const overpaidAmount = Math.max(0, receivedAmount - remaining);
  const nextPaid = currentPaid + allocatedAmount;
  const nextStatus = nextPaid >= total ? "paid" : "partial";
  const now = new Date().toISOString();

  const invoiceUpdate = await db
    .from("invoices")
    .update({
      paid_amount: nextPaid,
      status: nextStatus,
      updated_at: now,
    })
    .eq("id", invoice.id)
    .eq("user_id", invoice.user_id)
    .select("*")
    .single();

  if (invoiceUpdate.error || !invoiceUpdate.data) {
    return { error: invoiceUpdate.error?.message || "Failed to update invoice." };
  }

  const sourceLabel = input.source === "sepay" ? "SePay" : input.source === "bank_transfer" ? "Chuyển khoản" : input.source === "cash" ? "Tiền mặt" : "Thủ công";
  const description = [
    `Thu tiền phòng ${input.roomName || invoice.room_name || invoice.room_id} ${invoice.month}/${invoice.year}`,
    sourceLabel,
    input.note,
  ].filter(Boolean).join(" · ");

  const txRes = await db
    .from("transactions")
    .insert({
      user_id: invoice.user_id,
      type: "income",
      amount: receivedAmount,
      description,
      category_id: null,
      wallet_id: input.walletId,
      image_uri: null,
      date: toDateOnly(input.date),
      invoice_id: invoice.id,
      contract_id: invoice.contract_id || null,
      source: input.source,
      external_ref: input.externalRef || null,
      metadata: {
        ...(input.metadata || {}),
        allocated_amount: allocatedAmount,
        overpaid_amount: overpaidAmount,
        payment_code: invoice.payment_code || null,
      },
    })
    .select("*")
    .single();

  if (txRes.error || !txRes.data) {
    await db
      .from("invoices")
      .update({
        paid_amount: currentPaid,
        status: invoice.status,
        transaction_id: invoice.transaction_id || null,
        updated_at: now,
      })
      .eq("id", invoice.id)
      .eq("user_id", invoice.user_id);
    return { error: txRes.error?.message || "Failed to create payment transaction." };
  }

  await updateWalletBalance(db, input.walletId, receivedAmount, "income");

  const linkedInvoice = await db
    .from("invoices")
    .update({
      transaction_id: txRes.data.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)
    .eq("user_id", invoice.user_id)
    .select("*")
    .single();

  if (linkedInvoice.error || !linkedInvoice.data) {
    return {
      error: linkedInvoice.error?.message || "Payment recorded but failed to link invoice transaction.",
    };
  }

  return {
    data: {
      invoice: linkedInvoice.data,
      transaction: txRes.data,
      allocatedAmount,
      overpaidAmount,
      status: nextStatus,
    },
  };
}
