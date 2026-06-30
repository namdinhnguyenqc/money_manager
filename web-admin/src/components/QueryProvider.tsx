"use client";

import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { API_URL } from "@/lib/apiUrl";
import { clearClientSession, createAuthBroadcastChannel, getLoginPath, getStoredAccessToken } from "@/utils/session";
import { authFetch, logAuthEvent } from "@/utils/authFetch";

const privatePrefixes = [
  "/owner",
  "/facilities",
  "/contracts",
  "/invoices",
  "/deposits",
  "/payments",
  "/rooms",
  "/settings",
  "/complete-profile",
];

const isPrivatePath = (pathname: string) => privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
const CACHE_SYNC_KEY = "trocare-cache-sync";
const syncedQueryKeys = [
  ["contracts"],
  ["rooms"],
  ["room"],
  ["facility"],
  ["facilities"],
  ["boardinghouses"],
  ["invoices"],
  ["payments"],
  ["deposits"],
  ["transactions"],
  ["wallets"],
  ["services"],
  ["settings"],
  ["payment-channels"],
  ["bank-config"],
  ["owner", "boarding-houses"],
  ["owner", "rooms"],
  ["owner", "wallets"],
  ["owner", "settings"],
  ["owner", "dashboard-init"],
] as const;

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      })
  );

  useEffect(() => {
    const handleSessionCleared = () => {
      client.clear();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CACHE_SYNC_KEY || !event.newValue) return;
      syncedQueryKeys.forEach((queryKey) => {
        client.invalidateQueries({ queryKey: [...queryKey], refetchType: "all" });
      });
    };

    window.addEventListener("session-cleared", handleSessionCleared);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("session-cleared", handleSessionCleared);
      window.removeEventListener("storage", handleStorage);
    };
  }, [client]);

  useEffect(() => {
    let verifying = false;
    let lastVerifiedAt = 0;
    const VERIFY_COOLDOWN_MS = 5 * 60 * 1000;

    const redirectToLogin = (details: Record<string, unknown> = {}) => {
      const pathname = window.location.pathname;
      logAuthEvent("AUTH_QUERY_PROVIDER_REDIRECT_LOGIN", details);
      clearClientSession({ broadcast: false });
      client.clear();
      window.location.replace(getLoginPath(pathname));
    };

    const verifyPrivateSession = async () => {
      const pathname = window.location.pathname;
      const now = Date.now();
      if (!isPrivatePath(pathname) || verifying || now - lastVerifiedAt < VERIFY_COOLDOWN_MS) return;

      const token = getStoredAccessToken();
      if (!token) {
        redirectToLogin();
        return;
      }

      verifying = true;
      lastVerifiedAt = Date.now();
      try {
        const res = await authFetch(`${API_URL}/auth/me`, {
          cache: "no-store",
        });
        if (res.status === 401 || res.status === 403) {
          const data = await res.clone().json().catch(() => ({}));
          redirectToLogin({
            status: res.status,
            code: data?.code,
            message: data?.message || data?.error,
          });
        } else if (!res.ok) {
          logAuthEvent("AUTH_VERIFY_NON_AUTH_ERROR", { status: res.status });
        }
      } catch (error) {
        logAuthEvent("AUTH_VERIFY_NETWORK_ERROR", {
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        verifying = false;
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void verifyPrivateSession();
    };

    const handleFocus = () => {
      void verifyPrivateSession();
    };

    const channel = createAuthBroadcastChannel();
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === "logout") {
          redirectToLogin();
        }
      };
    }

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
      channel?.close();
    };
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
