"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";

export type FeeSign = "charge" | "discount";

/** Signed amount from the toggle plus a positive number the owner typed. */
export function signedFeeAmount(sign: FeeSign, amount: string | number): number {
  const value = Math.abs(Number(String(amount).replace(/[^\d.]/g, "") || 0));
  return sign === "discount" ? -value : value;
}

/** Keeps only digits, so phone keyboards without a minus key still work. */
export function cleanAmountInput(value: string): string {
  return value.replace(/[^\d]/g, "");
}

/**
 * Picks whether an extra line adds to the bill ("Thu thêm") or reduces it
 * ("Giảm trừ"). Numeric phone keyboards often have no minus key, so the sign
 * lives here instead of in the amount field.
 */
export default function FeeSignToggle({ value, onChange, size = "md" }: { value: FeeSign; onChange: (sign: FeeSign) => void; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const option = (sign: FeeSign, label: string, icon: React.ReactNode, active: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === sign}
      onClick={() => onChange(sign)}
      className={`inline-flex items-center gap-1 rounded-md font-semibold transition-colors ${pad} ${value === sign ? active : "text-slate-500 hover:text-slate-800"}`}
    >
      {icon}
      {label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Loại khoản" className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {option("charge", "Thu thêm", <Plus size={12} />, "bg-white text-slate-900 shadow-sm")}
      {option("discount", "Giảm trừ", <Minus size={12} />, "bg-emerald-600 text-white shadow-sm")}
    </div>
  );
}
