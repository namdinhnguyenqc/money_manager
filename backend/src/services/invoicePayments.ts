import type { SupabaseClient } from "@supabase/supabase-js";

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
  idempotent: boolean;
};

const toDateOnly = (value?: string): string => {
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
  if (!invoice?.id) return { error: "Invoice is required." };
  if ((input.amount ?? 0) <= 0) return { error: "Invalid payment amount." };

  const sourceLabel =
    input.source === "sepay" ? "SePay" :
    input.source === "bank_transfer" ? "Chuyển khoản" :
    input.source === "cash" ? "Tiền mặt" : "Thủ công";

  const description = [
    `Thu tiền phòng ${input.roomName || invoice.room_name || invoice.room_id} ${invoice.month}/${invoice.year}`,
    sourceLabel,
    input.note,
  ].filter(Boolean).join(" · ");

  // ✅ Call RPC — execution runs in a single database transaction
  const { data: rpcResult, error: rpcError } = await db.rpc(
    "apply_invoice_payment_atomic",
    {
      p_invoice_id:   invoice.id,
      p_user_id:      invoice.user_id,
      p_wallet_id:    String(input.walletId),
      p_amount:       input.amount,
      p_source:       input.source,
      p_date:         toDateOnly(input.date),
      p_description:  description,
      p_external_ref: input.externalRef ?? null,
      p_metadata:     input.metadata ?? {},
    }
  );

  if (rpcError) {
    return { error: rpcError.message };
  }

  const result = rpcResult as Record<string, any>;
  if (result.error) {
    return { error: result.error };
  }

  // Get the updated invoice to return
  const { data: updatedInvoice, error: invError } = await db
    .from("invoices")
    .select("*")
    .eq("id", invoice.id)
    .eq("user_id", invoice.user_id)
    .single();

  if (invError) {
    return { error: invError.message || "Failed to fetch updated invoice." };
  }

  // Get transaction just created
  const { data: newTx, error: txError } = await db
    .from("transactions")
    .select("*")
    .eq("id", result.transaction_id)
    .single();

  if (txError) {
    return { error: txError.message || "Failed to fetch created transaction." };
  }

  return {
    data: {
      invoice: updatedInvoice,
      transaction: newTx,
      allocatedAmount: Number(result.allocated_amount),
      overpaidAmount: Number(result.overpaid_amount),
      status: result.status as "paid" | "partial",
      idempotent: result.idempotent === true,
    },
  };
}
