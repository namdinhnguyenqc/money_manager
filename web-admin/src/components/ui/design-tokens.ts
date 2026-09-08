/**
 * TrọCare Design System — Shared design tokens
 * Only className strings & maps. No runtime logic.
 */

/* ── Color palette ──────────────────────────────────────────────── */
export const colors = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#EFF6FF",
  navy: "#0F172A",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  slate: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    900: "#0F172A",
  }
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
  sm: "h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm font-semibold gap-2 rounded-lg",
  lg: "h-12 px-6 text-sm font-semibold gap-2 rounded-xl",
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
  "mb-1.5 block text-xs font-semibold text-slate-600";

/* ── Card classes ───────────────────────────────────────────────── */
export const cardBase =
  "rounded-xl border border-slate-200 bg-white shadow-sm";

export const cardHover =
  "rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300";

/* ── Typography scale ───────────────────────────────────────────── */
export const typography = {
  pageTitle: "text-xl sm:text-[22px] font-bold leading-7 tracking-[-0.02em] text-slate-950",
  pageSubtitle: "text-xs font-bold text-blue-600",
  pageDescription: "mt-1 text-sm leading-5 text-slate-600",
  sectionTitle: "text-base sm:text-lg font-bold text-slate-900",
  label: "text-xs font-semibold text-slate-600",
  body: "text-sm font-medium text-slate-600",
  caption: "text-xs font-medium text-slate-400",
  money: "font-bold text-slate-900 whitespace-nowrap",
  date: "text-sm font-medium text-slate-600 whitespace-nowrap",
  phone: "text-sm font-medium whitespace-nowrap",
  idCode: "font-mono text-xs font-medium text-slate-500 truncate",
} as const;

/* ── Filter pill classes ────────────────────────────────────────── */
export const filterPillActive =
  "border-blue-600 bg-blue-600 text-white shadow-sm font-bold";
export const filterPillInactive =
  "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-semibold";

/* ── Radius scale ───────────────────────────────────────────────────
   The audit counted ten different radii in use (rounded-xl, rounded-lg,
   rounded-[8px], rounded-2xl, rounded-3xl, rounded-[10px], rounded-[2rem]…).
   Three steps cover every real case; reach for these instead of picking one
   per screen. `pill` stays separate because it is a shape, not a step. */
export const radius = {
  /** Controls: button, input, select, badge-like chips. */
  control: "rounded-lg",
  /** Surfaces: card, panel, table wrapper, dialog. */
  surface: "rounded-xl",
  /** Fully round: avatars, status dots, filter pills. */
  pill: "rounded-full",
} as const;

/* ── Spacing scale ──────────────────────────────────────────────────
   4 / 8 / 12 / 16 / 20 / 24 / 32 — the Tailwind steps that map onto it are
   1 / 2 / 3 / 4 / 5 / 6 / 8. Anything outside this set should be deliberate. */
export const spacing = {
  /** Between a label and its control, or icon and text. */
  tight: "gap-2",
  /** Between fields in a form, or items in a list. */
  field: "gap-4",
  /** Between sections inside a page. */
  section: "space-y-6",
  /** Between cards in a grid. */
  grid: "gap-4",
} as const;

/* ── Page layout ────────────────────────────────────────────────────
   Width only — no padding. OwnerWorkspaceShell's <main> already applies
   px-4 py-4 sm:px-6 sm:py-5, so adding padding here would inset the content
   twice. Screens differ deliberately in width (a form should not stretch to
   1280px), so PageContainer takes a width rather than forcing one. */
export const pageWidth = {
  /** Lists and dashboards. */
  wide: "mx-auto w-full max-w-7xl",
  /** Detail screens. */
  default: "mx-auto w-full max-w-5xl",
  /** Forms and settings, kept readable. */
  narrow: "mx-auto w-full max-w-3xl",
} as const;

/** Padding inside a card or panel. */
export const surfacePadding = "p-4 sm:p-5";

/* ── Table classes ──────────────────────────────────────────────────
   Shared so header height, row height and alignment match across screens. */
export const tableHeaderCell =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
export const tableCell = "px-4 py-3 text-sm text-slate-700";
export const tableRow = "border-t border-slate-100 transition-colors hover:bg-slate-50";
