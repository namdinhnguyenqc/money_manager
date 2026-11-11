// Extra-fee lines ("phí phát sinh") may be negative: a discount such as
// "Giảm 50.000 do mất nước". These helpers keep a discount from pushing an
// invoice below zero or below what the tenant has already paid.

export const NEGATIVE_ITEMS_NEED_MIGRATION =
  "Database chưa cho phép khoản giảm trừ (số âm). Cần chạy migration 20261111_allow_negative_invoice_items.sql trong Supabase SQL Editor.";

/** Postgres CHECK violation, e.g. the old `invoice_items.amount >= 0` constraint. */
export function isCheckViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "23514";
}

export type AddedItemResult =
  | { ok: true; newTotal: number; status: "paid" | "partial" | "unpaid" }
  | { ok: false; error: string };

/** Validates adding one extra line (positive charge or negative discount) to an issued invoice. */
export function applyAddedItem(input: { total: number; paid: number; amount: number }): AddedItemResult {
  const total = Number(input.total || 0);
  const paid = Number(input.paid || 0);
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "Số tiền phải khác 0." };
  }
  const newTotal = Math.round((total + amount) * 100) / 100;
  if (newTotal < 0) {
    return { ok: false, error: "Khoản giảm trừ lớn hơn tổng hóa đơn." };
  }
  if (newTotal < paid) {
    return { ok: false, error: "Khoản giảm trừ làm tổng hóa đơn thấp hơn số tiền đã thu." };
  }
  const status = paid >= newTotal ? "paid" : paid > 0 ? "partial" : "unpaid";
  return { ok: true, newTotal, status };
}
