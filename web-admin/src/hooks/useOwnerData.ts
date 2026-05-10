import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useBoardingHouses() {
  return useQuery({
    queryKey: ["owner", "boarding-houses"],
    queryFn: () => apiClient("/owner/boarding-houses"),
  });
}

export function useRooms() {
  return useQuery({
    queryKey: ["owner", "rooms"],
    queryFn: () => apiClient("/owner/rooms"),
  });
}

export function useWallets() {
  return useQuery({
    queryKey: ["owner", "wallets"],
    queryFn: () => apiClient("/owner/wallets"),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["owner", "settings"],
    queryFn: () => apiClient("/owner/settings"),
    staleTime: 300000, // 5 phút
  });
}

export function useOwnerDashboardInit() {
  return useQuery({
    queryKey: ["owner", "dashboard-init"],
    queryFn: () => apiClient("/owner/dashboard-init"),
  });
}
