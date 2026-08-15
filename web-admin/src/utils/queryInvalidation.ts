"use client";

import type { QueryClient } from "@tanstack/react-query";

type OwnerOpsInvalidationOptions = {
  facilityId?: string | null;
  roomId?: string | null;
  contractId?: string | null;
  invoiceId?: string | null;
};

const CACHE_SYNC_KEY = "trocare-cache-sync";

const uniqueKeys = (keys: unknown[][]) => {
  const seen = new Set<string>();
  return keys.filter((key) => {
    const id = JSON.stringify(key);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export async function invalidateOwnerOpsQueries(
  queryClient: QueryClient,
  options: OwnerOpsInvalidationOptions = {},
) {
  const keys = uniqueKeys([
    ["owner", "dashboard-init"],
    ["owner", "boarding-houses"],
    ["owner", "rooms"],
    ["owner", "wallets"],
    ["owner", "settings"],
    ["facilities"],
    ["boardinghouses"],
    ["facility"],
    ["rooms"],
    ["room"],
    ["contracts"],
    ["invoices"],
    ["payments"],
    ["transactions"],
    ["wallets"],
    ["deposits"],
    ["services"],
    ["settings"],
    ["payment-channels"],
    ["bank-config"],
    options.facilityId ? ["facility", options.facilityId] : [],
    options.facilityId ? ["rooms", { facilityId: options.facilityId }] : [],
    options.facilityId ? ["contracts", { facilityId: options.facilityId }] : [],
    options.facilityId ? ["invoices", { facilityId: options.facilityId }] : [],
    options.roomId ? ["room", options.roomId] : [],
    options.contractId ? ["contracts", options.contractId] : [],
    options.contractId ? ["contracts", options.contractId, "invoices"] : [],
    options.contractId ? ["contracts", options.contractId, "transactions"] : [],
    options.invoiceId ? ["invoices", options.invoiceId] : [],
  ].filter((key) => key.length > 0));

  await Promise.all(
    keys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
        // Mark inactive screens stale without downloading all of them now.
        // Only data visible on the current screen needs an immediate refetch.
        refetchType: "active",
      }),
    ),
  );

  if (typeof window !== "undefined") {
    localStorage.setItem(CACHE_SYNC_KEY, String(Date.now()));
  }
}
