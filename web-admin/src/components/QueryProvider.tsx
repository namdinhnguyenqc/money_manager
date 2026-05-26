"use client";

import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { API_URL } from "@/lib/apiUrl";
import { clearClientSession, createAuthBroadcastChannel, getLoginPath, getStoredAccessToken } from "@/utils/session";

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
  ["facility"],
  ["deposits"],
  ["transactions"],
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

    const redirectToLogin = () => {
      const pathname = window.location.pathname;
      clearClientSession({ broadcast: false });
      client.clear();
      window.location.replace(getLoginPath(pathname));
    };

    const verifyPrivateSession = async () => {
      const pathname = window.location.pathname;
      if (!isPrivatePath(pathname) || verifying) return;

      const token = getStoredAccessToken();
      if (!token) {
        redirectToLogin();
        return;
      }

      verifying = true;
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) redirectToLogin();
      } catch {
        redirectToLogin();
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
