function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return { year, month, day };
}

/** Prorates rent only for the contract's first calendar month, inclusive of move-in day. */
export function calculateProratedRoomFee(
  monthlyRent: number,
  contractStartDate: string | null | undefined,
  billingMonth: number,
  billingYear: number,
) {
  const rent = Math.max(0, Number(monthlyRent || 0));
  const start = parseDateOnly(contractStartDate);
  if (!start || start.year !== billingYear || start.month !== billingMonth || start.day === 1) {
    return Math.round(rent);
  }

  const daysInMonth = new Date(Date.UTC(billingYear, billingMonth, 0)).getUTCDate();
  const billableDays = daysInMonth - start.day + 1;
  return Math.round((rent * billableDays) / daysInMonth);
}

export function resolveInvoiceRoomFee(input: {
  requestedRoomFee?: number;
  monthlyRent: number;
  contractStartDate?: string | null;
  month: number;
  year: number;
}) {
  const monthlyRent = Math.max(0, Number(input.monthlyRent || 0));
  const requested = input.requestedRoomFee;
  // Preserve a deliberate manual override. Existing clients send the full monthly rent,
  // so that value is still converted to the correct first-month prorated amount.
  if (requested !== undefined && Math.round(requested) !== Math.round(monthlyRent)) {
    return Math.round(requested);
  }
  return calculateProratedRoomFee(monthlyRent, input.contractStartDate, input.month, input.year);
}
