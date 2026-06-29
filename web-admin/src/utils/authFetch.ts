"use client";

import { clearClientSession, getLoginPath, getStoredAccessToken, setClientSession } from "@/utils/session";
import { API_URL } from "@/lib/apiUrl";

type AuthFetchOptions = RequestInit & {
  auth?: boolean;
  skipRefresh?: boolean;
  _retried?: boolean;
  timeoutMs?: number;
};

let refreshPromise: Promise<string | null> | null = null;
let lastRefreshAuthFailure: { status: number; code?: string; message?: string } | null = null;
const REFRESH_LOCK_KEY = "trocare.refresh.lock";
const REFRESH_LOCK_TTL_MS = 8000;
const REFRESH_WAIT_TIMEOUT_MS = 10000;
const REFRESH_WAIT_INTERVAL_MS = 120;
const DEFAULT_AUTH_FETCH_TIMEOUT_MS = 20000;
const REFRESH_FETCH_TIMEOUT_MS = 15000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = DEFAULT_AUTH_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${input}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function logAuthEvent(event: string, details: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const safeDetails = {
    path: window.location.pathname,
    ...details,
  };
  console.warn(`[auth] ${event}`, safeDetails);
}

function getTabId() {
  if (typeof window === "undefined") return "server";
  const key = "trocare.tab.id";
  let tabId = sessionStorage.getItem(key);
  if (!tabId) {
    tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, tabId);
  }
  return tabId;
}

function readRefreshLock(): { owner: string; expiresAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(REFRESH_LOCK_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(REFRESH_LOCK_KEY);
    return null;
  }
}

function tryAcquireRefreshLock(owner: string) {
  if (typeof window === "undefined") return true;
  const now = Date.now();
  const current = readRefreshLock();
  if (current && current.expiresAt > now && current.owner !== owner) {
    return false;
  }

  localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ owner, expiresAt: now + REFRESH_LOCK_TTL_MS }));
  return readRefreshLock()?.owner === owner;
}

function releaseRefreshLock(owner: string) {
  if (typeof window === "undefined") return;
  const current = readRefreshLock();
  if (!current || current.owner === owner || current.expiresAt <= Date.now()) {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  }
}

async function waitForPeerRefresh(previousToken: string | null) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < REFRESH_WAIT_TIMEOUT_MS) {
    const currentToken = getStoredAccessToken();
    if (currentToken && currentToken !== previousToken) {
      return currentToken;
    }

    const currentLock = readRefreshLock();
    if (!currentLock || currentLock.expiresAt <= Date.now()) {
      return null;
    }

    await sleep(REFRESH_WAIT_INTERVAL_MS);
  }
  return null;
}

const redirectToLogin = (reason = "AUTH_REDIRECT_LOGIN", details: Record<string, unknown> = {}) => {
  if (typeof window === "undefined") return;
  logAuthEvent(reason, details);
  clearClientSession();
  window.location.replace(getLoginPath(window.location.pathname));
};

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    lastRefreshAuthFailure = null;
    const previousToken = getStoredAccessToken();
    const owner = getTabId();

    if (!tryAcquireRefreshLock(owner)) {
      const peerToken = await waitForPeerRefresh(previousToken);
      if (peerToken) return peerToken;
      if (!tryAcquireRefreshLock(owner)) {
        logAuthEvent("AUTH_REFRESH_LOCK_UNAVAILABLE");
        throw new Error("Refresh lock unavailable");
      }
    }

    let res: Response;
    try {
      res = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
        cache: "no-store",
      }, REFRESH_FETCH_TIMEOUT_MS);
    } catch (error) {
      logAuthEvent("AUTH_REFRESH_NETWORK_ERROR", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      releaseRefreshLock(owner);
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.session?.access_token) {
      logAuthEvent("AUTH_REFRESH_FAILED", {
        status: res.status,
        code: data?.code,
        message: data?.message || data?.error,
      });
      if (res.status === 401 || res.status === 403) {
        lastRefreshAuthFailure = {
          status: res.status,
          code: data?.code,
          message: data?.message || data?.error,
        };
        return null;
      }
      throw new Error(`Refresh failed with non-auth status ${res.status}`);
    }

    const accessToken = data.session.access_token;

    setClientSession({
      accessToken,
      role: data?.user?.role || localStorage.getItem("userRole") || undefined,
      name: data?.user?.name || localStorage.getItem("userName") || undefined,
      email: data?.user?.email || localStorage.getItem("userEmail") || undefined,
      status: data?.user?.status || localStorage.getItem("userStatus") || undefined,
      approvalStatus: data?.user?.approvalStatus || localStorage.getItem("approvalStatus") || undefined,
      isProfileCompleted: data?.user?.isProfileCompleted ?? (localStorage.getItem("isProfileCompleted") === "true"),
      onboardingStep: data?.user?.onboardingStep || localStorage.getItem("onboardingStep") || undefined,
    });

    return accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number') return true;
    // Refresh if it's already expired, or expiring in the next 15 seconds (grace window)
    return payload.exp * 1000 - 15000 < Date.now();
  } catch {
    return true;
  }
}

const pendingRequests = new Map<string, Promise<Response>>();

export async function authFetch(input: string, init: AuthFetchOptions = {}) {
  const method = (init.method || "GET").toUpperCase();
  const url = input.toString();
  const { timeoutMs, ...fetchInit } = init;
  
  const isGet = method === "GET";
  const dedupeKey = isGet ? url : null;

  if (dedupeKey && pendingRequests.has(dedupeKey)) {
    const res = await pendingRequests.get(dedupeKey)!;
    return res.clone();
  }

  const doFetch = async () => {
    const headers = new Headers(fetchInit.headers || {});
    if (!headers.has("Content-Type") && fetchInit.body !== undefined && fetchInit.body !== null) {
      headers.set("Content-Type", "application/json");
    }

    if (fetchInit.auth !== false) {
      let token = getStoredAccessToken();
      if (token && isTokenExpired(token)) {
        logAuthEvent("AUTH_PREEMPTIVE_REFRESH", { url });
        const nextToken = await refreshAccessToken();
        if (nextToken) {
          token = nextToken;
        }
      }
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetchWithTimeout(input, { ...fetchInit, headers, credentials: fetchInit.credentials ?? "include", cache: "no-store" }, timeoutMs);
    if (res.status !== 401 || fetchInit.auth === false || fetchInit.skipRefresh || fetchInit._retried) {
      return res;
    }

    logAuthEvent("AUTH_API_401_REFRESH_ATTEMPT", { url });
    const nextToken = await refreshAccessToken();
    if (!nextToken) {
      redirectToLogin("AUTH_REFRESH_AUTH_FAILED", {
        url,
        originalStatus: res.status,
        refreshStatus: lastRefreshAuthFailure?.status,
        refreshCode: lastRefreshAuthFailure?.code,
        refreshMessage: lastRefreshAuthFailure?.message,
      });
      return res;
    }

    const retryHeaders = new Headers(fetchInit.headers || {});
    if (!retryHeaders.has("Content-Type") && fetchInit.body !== undefined && fetchInit.body !== null) {
      retryHeaders.set("Content-Type", "application/json");
    }
    retryHeaders.set("Authorization", `Bearer ${nextToken}`);
    return fetchWithTimeout(input, { ...fetchInit, headers: retryHeaders, credentials: fetchInit.credentials ?? "include", cache: "no-store", _retried: true } as RequestInit, timeoutMs);
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

export function handleUnauthorizedLogout(details: Record<string, unknown> = {}) {
  redirectToLogin("AUTH_UNAUTHORIZED_LOGOUT", details);
}
