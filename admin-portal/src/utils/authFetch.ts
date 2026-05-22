"use client";

import { clearClientSession, getLoginPath, getStoredAccessToken, setClientSession } from "@/utils/session";
import { API_URL } from "@/lib/apiUrl";

type AuthFetchOptions = RequestInit & {
  auth?: boolean;
  skipRefresh?: boolean;
  _retried?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;
const REFRESH_LOCK_KEY = "trocare.refresh.lock";
const REFRESH_LOCK_TTL_MS = 8000;
const REFRESH_WAIT_TIMEOUT_MS = 10000;
const REFRESH_WAIT_INTERVAL_MS = 120;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

const redirectToLogin = () => {
  if (typeof window === "undefined") return;
  clearClientSession();
  window.location.replace(getLoginPath(window.location.pathname));
};

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const previousToken = getStoredAccessToken();
    const owner = getTabId();

    if (!tryAcquireRefreshLock(owner)) {
      const peerToken = await waitForPeerRefresh(previousToken);
      if (peerToken) return peerToken;
      if (!tryAcquireRefreshLock(owner)) return null;
    }

    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      releaseRefreshLock(owner);
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.session?.access_token) {
      return null;
    }

    const accessToken = data.session.access_token;

    setClientSession({
      accessToken,
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

    const res = await fetch(input, { ...init, headers, credentials: init.credentials ?? "include", cache: "no-store" });
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
    return fetch(input, { ...init, headers: retryHeaders, credentials: init.credentials ?? "include", cache: "no-store", _retried: true } as RequestInit);
  };

  if (dedupeKey) {
    const fetchPromise = doFetch();
    pendingRequests.set(dedupeKey, fetchPromise);

    // Giá»¯ káº¿t quáº£ trong 200ms Ä‘á»ƒ gá»™p cÃ¡c request tá»›i cÃ¹ng lÃºc
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
