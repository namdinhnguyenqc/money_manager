import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { BoardingHouse, RentalRoom, Transaction, Wallet, Invoice } from "@/lib/rentalOps";

export type OwnerDashboardInit = {
  boardingHouses: BoardingHouse[];
  rooms: RentalRoom[];
  wallets: Wallet[];
  transactions: Transaction[];
  invoices: Invoice[];
  settings: Record<string, unknown>;
};

export function useBoardingHouses() {
  return useQuery({
    queryKey: ["owner", "boarding-houses"],
    queryFn: () => apiClient("/owner/boarding-houses"),
    staleTime: 60_000, // Reuse cached data for 1 minute across navigation
  });
}

export function useRooms() {
  return useQuery({
    queryKey: ["owner", "rooms"],
    queryFn: () => apiClient("/owner/rooms"),
    staleTime: 60_000, // Reuse cached data for 1 minute across navigation
  });
}

export function useWallets() {
  return useQuery({
    queryKey: ["owner", "wallets"],
    queryFn: () => apiClient("/owner/wallets"),
    staleTime: 60_000, // Reuse cached data for 1 minute across navigation
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["owner", "settings"],
    queryFn: () => apiClient("/owner/settings"),
    staleTime: 300_000, // 5 phút
  });
}

export function useOwnerDashboardInit() {
  return useQuery({
    queryKey: ["owner", "dashboard-init"],
    queryFn: () => apiClient<OwnerDashboardInit>("/owner/dashboard-init"),
    staleTime: 60_000, // 1 phút
  });
}

export type DashboardSummary = {
  period: { month: number; year: number };
  facilities: Array<{ id: string; name: string }>;
  scope: { facilityId: string | null };
  totals: {
    billed: number; collected: number; receivable: number; overdue: number; notDue: number;
    expense: number; overdueCount: number; averageOverdueDays: number; profit: number;
    margin: number; netCashflow: number; collectionRate: number;
  };
  occupancy: { total: number; occupied: number; vacant: number; maintenance: number; expiringContracts: number };
  facilitiesPerformance: Array<{ id: string; name: string; occupancyRate: number; collectedRate: number; overdue: number; receivable: number; billed: number; collected: number; roomCount: number; occupied: number }>;
  expenseComposition: Array<{ name: string; amount: number }>;
};

export function useOwnerDashboardSummary(month: number, year: number, facilityId?: string | null) {
  const params = new URLSearchParams({ month: String(month), year: String(year) });
  if (facilityId) params.set("facilityId", facilityId);
  return useQuery({
    queryKey: ["owner", "dashboard-summary", month, year, facilityId || "all"],
    queryFn: () => apiClient<DashboardSummary>(`/owner/dashboard-summary?${params.toString()}`),
    staleTime: 30_000,
    // Keep the previous period visible while the next request completes. This
    // prevents the KPI/chart from flashing zeros when users click months or
    // change facility scope quickly.
    placeholderData: (previousData) => previousData,
  });
}

export type CashflowMonth = {
  month: number;
  year: number;
  income: number;
  expense: number;
  profit: number;
  composition: { rent: number; electricity: number; water: number; other: number };
};

/**
 * `endMonth`/`endYear` anchor the window to the period being viewed. Without
 * them the API always returned the months ending at today, so navigating the
 * dashboard back in time asked for buckets the response never contained and the
 * chart drew zeros.
 */
export function useOwnerCashflowSummary(months: number, endMonth?: number, endYear?: number) {
  const params = new URLSearchParams({ months: String(months) });
  if (endMonth) params.set("endMonth", String(endMonth));
  if (endYear) params.set("endYear", String(endYear));
  const query = params.toString();

  return useQuery({
    queryKey: ["owner", "cashflow-summary", months, endMonth ?? "now", endYear ?? "now"],
    queryFn: () => apiClient<{ months: CashflowMonth[] }>(`/owner/cashflow-summary?${query}`),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
}
