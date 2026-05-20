/**
 * TrọCare Design System — Shared design tokens
 * Only className strings & maps. No runtime logic.
 */

/* ── Color palette (Tailwind class fragments) ───────────────────── */
export const colors = {
  primary: "#1D8FE1",
  primaryDark: "#1573b8",
  secondary: "#24C7A6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
} as const;

/* ── Button variant class maps ──────────────────────────────────── */
export const buttonVariants = {
  primary:
    "bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 focus-visible:ring-blue-500 shadow-sm",
  secondary:
    "bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 hover:border-slate-800 focus-visible:ring-slate-500 shadow-sm",
  outline:
    "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400 shadow-sm",
  ghost:
    "bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
  warning:
    "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 focus-visible:ring-amber-400",
  danger:
    "bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700 focus-visible:ring-red-500 shadow-sm",
  "danger-ghost":
    "bg-transparent text-red-600 border border-transparent hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-400",
} as const;

export const buttonSizes = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-sm gap-2 rounded-xl",
} as const;

/* ── Badge variant class maps ───────────────────────────────────── */
export const badgeVariants = {
  primary: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-gray-100 text-gray-600 border-gray-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
} as const;

/* ── Input base classes ─────────────────────────────────────────── */
export const inputBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export const selectBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export const labelBase =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

/* ── Card classes ───────────────────────────────────────────────── */
export const cardBase =
  "rounded-xl border border-slate-200 bg-white shadow-sm";

export const cardHover =
  "rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300";

/* ── Typography scale (reference) ───────────────────────────────── */
export const typography = {
  pageTitle: "text-2xl font-bold tracking-tight text-slate-900",
  pageSubtitle: "text-sm font-medium text-blue-600",
  pageDescription: "mt-1 text-sm text-slate-500",
  sectionTitle: "text-lg font-semibold text-slate-900",
  label: "text-xs font-semibold uppercase tracking-wide text-slate-500",
  body: "text-sm text-slate-600",
  caption: "text-xs text-slate-400",
  money: "font-semibold text-slate-900 whitespace-nowrap",
  date: "text-sm text-slate-600 whitespace-nowrap",
  phone: "text-sm whitespace-nowrap",
  idCode: "font-mono text-xs text-slate-500 truncate",
} as const;

/* ── Filter pill classes ────────────────────────────────────────── */
export const filterPillActive =
  "border-blue-600 bg-blue-600 text-white shadow-sm";
export const filterPillInactive =
  "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300";
