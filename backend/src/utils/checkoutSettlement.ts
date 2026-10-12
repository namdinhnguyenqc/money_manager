import { calculateProratedRent } from "./rentCalc.js";

export type CheckoutInvoice = {
  id: string;
  month: number;
  year: number;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  status?: string | null;
  elec_new?: number | string | null;
  water_new?: number | string | null;
};

export type CheckoutService = {
  name?: string | null;
  category?: string | null;
  type?: string | null;
  unit?: string | null;
  unit_price?: number | string | null;
  applied_unit_price?: number | string | null;
  amount?: number | string | null;
  is_metered?: boolean | null;
  occupant_count?: number | string | null;
};

export type CheckoutMeter = {
  name: string;
  unit: string;
  unitPrice: number;
  lastReading: number;
};

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const isMetered = (service: CheckoutService) =>
  Boolean(service.is_metered) || ["metered", "meter"].includes(String(service.type || ""));

// Older contract snapshots carry no category, so fall back to the unit and name.
const categoryOf = (service: CheckoutService): "electricity" | "water" | "other" => {
  const explicit = String(service.category || "");
  if (explicit === "electricity" || explicit === "water") return explicit;
  const unit = String(service.unit || "").toLowerCase();
  const name = String(service.name || "").toLowerCase();
  if (unit === "kwh" || name.includes("điện") || name.includes("dien")) return "electricity";
  if (unit === "m³" || unit === "m3" || unit === "khối" || name.includes("nước") || name.includes("nuoc")) return "water";
  return "other";
};

/** Who owes whom once the charges are set against the deposit. */
export function settleAgainstDeposit(deposit: number, totalCharges: number) {
  const balance = Math.round(num(totalCharges)) - Math.round(num(deposit));
  return {
    refundToTenant: balance < 0 ? -balance : 0,
    tenantPays: balance > 0 ? balance : 0,
    isEven: balance === 0,
  };
}

export function buildCheckoutPreview(input: {
  moveOutDate: string;
  contract: {
    start_date?: string | null;
    rent_amount?: number | string | null;
    deposit?: number | string | null;
    electric_start?: number | string | null;
    water_start?: number | string | null;
    occupant_count?: number | string | null;
  };
  roomPrice?: number | string | null;
  services: CheckoutService[];
  invoices: CheckoutInvoice[];
}) {
  const moveOut = parseDate(input.moveOutDate);
  const month = moveOut.getMonth() + 1;
  const year = moveOut.getFullYear();
  const monthlyRent = num(input.contract.rent_amount) || num(input.roomPrice);

  const periodInvoice = input.invoices.find((inv) => Number(inv.month) === month && Number(inv.year) === year);

  const firstOfMonth = new Date(year, month - 1, 1);
  const contractStart = input.contract.start_date ? parseDate(String(input.contract.start_date).slice(0, 10)) : null;
  const rentFrom = contractStart && contractStart > firstOfMonth ? contractStart : firstOfMonth;
  const prorated = calculateProratedRent(monthlyRent, rentFrom, moveOut);
  const ratio = prorated.daysInMonth > 0 ? Math.min(1, Math.max(0, prorated.stayedDays / prorated.daysInMonth)) : 0;

  // The month's invoice already bills rent and fixed services for this period,
  // so charging them again here would double count.
  const rent = {
    alreadyInvoiced: Boolean(periodInvoice),
    monthlyRent,
    daysInMonth: prorated.daysInMonth,
    stayedDays: Math.max(0, prorated.stayedDays),
    fromDate: `${rentFrom.getFullYear()}-${String(rentFrom.getMonth() + 1).padStart(2, "0")}-${String(rentFrom.getDate()).padStart(2, "0")}`,
    amount: periodInvoice ? 0 : Math.max(0, prorated.totalAmount),
  };

  const latestWithReading = (field: "elec_new" | "water_new") =>
    [...input.invoices]
      .filter((inv) => inv[field] !== null && inv[field] !== undefined && num(inv[field]) > 0)
      .sort((a, b) => Number(b.year) - Number(a.year) || Number(b.month) - Number(a.month))[0];

  const meterFor = (category: "electricity" | "water", field: "elec_new" | "water_new", start: unknown, unit: string): CheckoutMeter | null => {
    // Only a metered service has a reading; water billed per person is a fixed charge.
    const service = input.services.find((s) => categoryOf(s) === category && isMetered(s));
    if (!service) return null;
    const last = latestWithReading(field);
    return {
      name: service.name || (category === "electricity" ? "Tiền điện" : "Tiền nước"),
      unit: service.unit || unit,
      unitPrice: num(service.applied_unit_price) || num(service.unit_price),
      lastReading: last ? num(last[field]) : num(start),
    };
  };

  const fixedServices = periodInvoice
    ? []
    : input.services
        .filter((s) => !isMetered(s))
        .map((s) => {
          const unitPrice = num(s.applied_unit_price) || num(s.unit_price) || num(s.amount);
          const monthly = String(s.type || "") === "per_person"
            ? unitPrice * Math.max(1, num(s.occupant_count) || num(input.contract.occupant_count) || 1)
            : num(s.amount) || unitPrice;
          return { name: s.name || "Dịch vụ", monthlyAmount: monthly, amount: Math.round(monthly * ratio) };
        })
        .filter((s) => s.monthlyAmount > 0);

  const unpaidInvoices = input.invoices
    .map((inv) => ({
      id: inv.id,
      month: Number(inv.month),
      year: Number(inv.year),
      remaining: Math.max(0, num(inv.total_amount) - num(inv.paid_amount)),
    }))
    .filter((inv) => inv.remaining > 0)
    .sort((a, b) => a.year - b.year || a.month - b.month);

  return {
    moveOutDate: input.moveOutDate,
    deposit: num(input.contract.deposit),
    rent,
    meters: {
      electricity: meterFor("electricity", "elec_new", input.contract.electric_start, "kWh"),
      water: meterFor("water", "water_new", input.contract.water_start, "m³"),
    },
    fixedServices,
    unpaidInvoices,
  };
}
