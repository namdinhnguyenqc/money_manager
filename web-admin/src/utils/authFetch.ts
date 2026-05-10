"use client";

import { clearClientSession, getLoginPath, getStoredAccessToken, getStoredRefreshToken, setClientSession } from "@/utils/session";

type AuthFetchOptions = RequestInit & {
  auth?: boolean;
  skipRefresh?: boolean;
  _retried?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

const redirectToLogin = () => {
  if (typeof window === "undefined") return;
  clearClientSession();
  window.location.href = getLoginPath(window.location.pathname);
};

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.session?.access_token) {
      return null;
    }

    const accessToken = data.session.access_token;
    const nextRefreshToken = data.session.refresh_token;

    setClientSession({
      accessToken,
      refreshToken: nextRefreshToken,
      role: localStorage.getItem("userRole") || undefined,
      name: localStorage.getItem("userName") || undefined,
      email: localStorage.getItem("userEmail") || undefined,
      isProfileCompleted: localStorage.getItem("isProfileCompleted") === "true",
      onboardingStep: localStorage.getItem("onboardingStep") || undefined,
    });

    return accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

const pendingRequests = new Map<string, Promise<Response>>();

export async function authFetch(input: string, init: AuthFetchOptions = {}) {
  const method = (init.method || "GET").toUpperCase();
  const url = input.toString();
  
  const isGet = method === "GET";
  const dedupeKey = isGet ? url : null;

  if (dedupeKey && pendingRequests.has(dedupeKey)) {
    const res = await pendingRequests.get(dedupeKey)!;
    return res.clone();
  }

  const doFetch = async () => {
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.body !== undefined && init.body !== null) {
      headers.set("Content-Type", "application/json");
    }

    if (init.auth !== false) {
      const token = getStoredAccessToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(input, { ...init, headers });
    if (res.status !== 401 || init.auth === false || init.skipRefresh || init._retried) {
      return res;
    }

    const nextToken = await refreshAccessToken();
    if (!nextToken) {
      redirectToLogin();
      return res;
    }

    const retryHeaders = new Headers(init.headers || {});
    if (!retryHeaders.has("Content-Type") && init.body !== undefined && init.body !== null) {
      retryHeaders.set("Content-Type", "application/json");
    }
    retryHeaders.set("Authorization", `Bearer ${nextToken}`);
    return fetch(input, { ...init, headers: retryHeaders, _retried: true } as RequestInit);
  };

  if (dedupeKey) {
    const fetchPromise = doFetch();
    pendingRequests.set(dedupeKey, fetchPromise);
    
    // Giữ kết quả trong 200ms để gộp các request tới cùng lúc
    setTimeout(() => {
      if (pendingRequests.get(dedupeKey) === fetchPromise) {
        pendingRequests.delete(dedupeKey);
      }
    }, 200);

    const res = await fetchPromise;
    return res.clone();
  }

  return doFetch();
}

export function handleUnauthorizedLogout() {
  redirectToLogin();
}
