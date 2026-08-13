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

export type CashflowMonth = { month: number; year: number; income: number; expense: number; profit: number };

export function useOwnerCashflowSummary(months: number) {
  return useQuery({
    queryKey: ["owner", "cashflow-summary", months],
    queryFn: () => apiClient<{ months: CashflowMonth[] }>(`/owner/cashflow-summary?months=${months}`),
    staleTime: 60_000,
  });
}
