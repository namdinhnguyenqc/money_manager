/**
 * TrọCare Mobile — API Client
 * Base fetch wrapper with:
 * - Bearer token injection
 * - Platform header (x-client-platform)
 * - Auto token refresh on 401
 * - PROFILE_REQUIRED redirect on 403
 * - Standard error envelope parsing matching web-admin apiClient.ts
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Config from '@/constants/Config';
import { logPerfEvent } from '@/lib/telemetry/appPerformance';

const API_URL = Config.API_URL;
const REQUEST_TIMEOUT_MS = 30000; // 30s to handle Render.com cold starts
const DEV_FALLBACK_TIMEOUT_MS = 3000;

// ─── Token Storage Keys ───
const ACCESS_TOKEN_KEY = 'trocare_access_token';
const REFRESH_TOKEN_KEY = 'trocare_refresh_token';

// ─── Token Helpers ───
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearTokens(): Promise<void> {
  clearApiCache();
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

// ─── Error Classes ───
export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: any;
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
    this.code = details?.code;
    this.fieldErrors = details?.fieldErrors;
  }
}

function getTimeoutMessage(url: string, timeoutMs: number): string {
  return `Request timed out after ${timeoutMs}ms: ${url}`;
}

let activeBaseUrl: string | null = null;

function getBaseUrl(url: string): string {
  const match = url.match(/^(https?:\/\/[^/]+)/);
  return match?.[1] || url;
}

function getPathFromApiUrl(url: string): string {
  return url.startsWith(API_URL) ? url.slice(API_URL.length) : "";
}

function getUrlCandidates(url: string): string[] {
  if (!url.startsWith(API_URL)) return [url];

  // In production (HTTPS), don't fall back to local emulator addresses
  const isProduction = API_URL.startsWith('https://');
  if (isProduction) return [url];

  const path = getPathFromApiUrl(url);
  const activeCandidate = activeBaseUrl ? `${activeBaseUrl}${path}` : null;
  return Array.from(new Set([
    activeCandidate,
    url,
    ...Config.API_FALLBACK_URLS.map((baseUrl) => `${baseUrl}${url.slice(API_URL.length)}`),
  ].filter(Boolean) as string[]));
}

function logUrlEvent(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({
    event,
    configuredBaseUrl: API_URL,
    activeBaseUrl,
    ...fields,
  }));
}

async function fetchSingleUrlWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const startedAt = Date.now();
  const baseUrl = getBaseUrl(url);
  logUrlEvent("URL_START", { url, baseUrl, timeoutMs });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    activeBaseUrl = baseUrl;
    logUrlEvent("URL_SUCCESS", { url, baseUrl, status: response.status, durationMs: Date.now() - startedAt });
    return response;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      logUrlEvent("URL_TIMEOUT", { url, baseUrl, timeoutMs, durationMs: Date.now() - startedAt });
      throw new ApiClientError(getTimeoutMessage(url, timeoutMs), 0, { code: 'NETWORK_TIMEOUT' });
    }
    logUrlEvent("URL_FAILED", { url, baseUrl, message: String(err?.message || err), durationMs: Date.now() - startedAt });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

type FetchOptions = {
  timeoutMs?: number;
};

async function fetchWithTimeout(url: string, init: RequestInit, options: FetchOptions = {}): Promise<Response> {
  const candidates = getUrlCandidates(url);
  let lastError: any = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidateUrl = candidates[index];
    const timeoutMs = index === 0
      ? (options.timeoutMs || REQUEST_TIMEOUT_MS)
      : Math.min(options.timeoutMs || REQUEST_TIMEOUT_MS, DEV_FALLBACK_TIMEOUT_MS);
    try {
      return await fetchSingleUrlWithTimeout(candidateUrl, init, timeoutMs);
    } catch (err: any) {
      lastError = err;
      const canRetry =
        err?.status === 0 ||
        err?.name === 'TypeError' ||
        /network request failed|failed to fetch|failed to connect/i.test(String(err?.message || ''));

      if (!canRetry) throw err;
      console.warn('[API] Network request failed, trying fallback URL if available:', candidateUrl, err?.message);
    }
  }

  throw lastError;
}

// ─── Event for auth state changes ───
type AuthEventListener = (event: 'logout' | 'profile_required' | 'pending_approval') => void;
let authEventListener: AuthEventListener | null = null;

export function setAuthEventListener(listener: AuthEventListener) {
  authEventListener = listener;
}

// ─── Token Refresh ───
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) {
    console.log('[Token Refresh] Reusing existing refresh promise');
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      console.log('[Token Refresh] Starting token refresh flow...');
      const rt = await getRefreshToken();
      if (!rt) {
        console.warn('[Token Refresh] No refresh token found in SecureStore');
        return false;
      }

      const res = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-platform': Platform.OS === 'ios' ? 'ios' : 'android',
        },
        body: JSON.stringify({ refreshToken: rt }),
      });

      console.log(`[Token Refresh] Refresh API response status: ${res.status}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Token Refresh] Refresh request failed:', errorData);
        return false;
      }

      const data = await res.json();
      if (data?.accessToken) {
        console.log('[Token Refresh] Token refreshed successfully!');
        await Promise.all([
          setAccessToken(data.accessToken),
          data?.refreshToken ? setRefreshToken(data.refreshToken) : Promise.resolve(),
        ]);
        if (data?.refreshToken) console.log('[Token Refresh] New refresh token saved.');
        else console.warn('[Token Refresh] No refresh token returned in body.');
        return true;
      }
      console.error('[Token Refresh] Response did not contain accessToken:', data);
      return false;
    } catch (err) {
      console.error('[Token Refresh] Exception during token refresh:', err);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Core Request Function ───
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export type RequestOptions = {
  auth?: boolean;
  retry?: boolean;
  timeoutMs?: number;
  cacheTtlMs?: number;
  forceRefresh?: boolean;
  cacheKey?: string;
};

type CacheEntry = {
  value: any;
  expiresAt: number;
  storedAt: number;
};

const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

function getDefaultCacheTtlMs(path: string, method: HttpMethod): number {
  if (method !== 'GET') return 0;
  if (path.startsWith('/auth/')) return 0;
  if (path.startsWith('/owner/notifications')) return 0;
  if (path.startsWith('/me/profile')) return 5 * 60 * 1000;
  if (path.startsWith('/owner/settings')) return 10 * 60 * 1000;
  if (path.startsWith('/categories')) return 10 * 60 * 1000;
  if (path.startsWith('/locations/')) return 24 * 60 * 60 * 1000;
  if (path.startsWith('/rental/services')) return 10 * 60 * 1000;
  if (path.startsWith('/bank-config')) return 10 * 60 * 1000;
  if (path.startsWith('/owner/dashboard-init')) return 60 * 1000;
  if (path.startsWith('/owner/dashboard-summary')) return 60 * 1000;
  if (path.startsWith('/owner/boarding-houses')) return 5 * 60 * 1000;
  if (path.startsWith('/rental/rooms')) return 2 * 60 * 1000;
  if (path.startsWith('/wallets')) return 60 * 1000;
  if (path.startsWith('/rental/contracts')) return 60 * 1000;
  if (path.startsWith('/invoices')) return 30 * 1000;
  if (path.startsWith('/transactions')) return 30 * 1000;
  if (path.startsWith('/rental/deposits')) return 60 * 1000;
  return 0;
}

function getCacheKey(path: string, method: HttpMethod, options: RequestOptions) {
  return options.cacheKey || `${method}:${path}`;
}

export function clearApiCache() {
  responseCache.clear();
  inFlightRequests.clear();
  logPerfEvent("CACHE_CLEAR", { scope: "api" });
}

function invalidateApiCacheAfterMutation(path: string, method: HttpMethod) {
  if (method === 'GET') return;
  const entriesCleared = responseCache.size;
  responseCache.clear();
  inFlightRequests.clear();
  logPerfEvent("CACHE_INVALIDATE", {
    scope: "api",
    path,
    method,
    entriesCleared,
    reason: "mutation_success",
  });
}

function buildUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${p}`;
}

async function request<T>(path: string, method: HttpMethod, body?: any, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path);
  const retry = options.retry !== false;
  const requestStartedAt = Date.now();
  const cacheKey = getCacheKey(path, method, options);
  const cacheTtlMs = options.cacheTtlMs ?? getDefaultCacheTtlMs(path, method);

  if (method === 'GET' && cacheTtlMs > 0 && !options.forceRefresh) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      logPerfEvent("CACHE_HIT", { path, method, cacheKey, ageMs: Date.now() - cached.storedAt, ttlMs: cacheTtlMs });
      return cached.value as T;
    }
    logPerfEvent("CACHE_MISS", { path, method, cacheKey, reason: cached ? "expired" : "empty", ttlMs: cacheTtlMs });

    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) {
      logPerfEvent("CACHE_HIT", { path, method, cacheKey, source: "in_flight" });
      return inFlight as Promise<T>;
    }
  } else if (method === 'GET') {
    logPerfEvent("CACHE_MISS", { path, method, reason: options.forceRefresh ? "force_refresh" : "disabled", ttlMs: cacheTtlMs });
  }

  const accessToken = options.auth === false ? null : await getAccessToken();

  const headers: Record<string, string> = {
    'x-client-platform': Platform.OS === 'ios' ? 'ios' : 'android',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const executeNetworkRequest = async () => {
    logPerfEvent("API_REQUEST_START", { path, method, cacheKey, cacheTtlMs });
    try {
      const res = await fetchWithTimeout(url, {
        method,
        headers,
        body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
      }, { timeoutMs: options.timeoutMs });

      const data = await res.json().catch(() => ({}));
      logPerfEvent("API_REQUEST_DONE", {
        path,
        method,
        status: res.status,
        ok: res.ok,
        durationMs: Date.now() - requestStartedAt,
        cacheKey,
      });

      return { res, data };
    } catch (error: any) {
      logPerfEvent("API_REQUEST_FAILED", {
        path,
        method,
        status: error?.status ?? 0,
        ok: false,
        durationMs: Date.now() - requestStartedAt,
        cacheKey,
        message: String(error?.message || error),
      });
      throw error;
    }
  };

  const runRequest = async (): Promise<T> => {
    const { res, data } = await executeNetworkRequest();

    // Handle 403 PROFILE_REQUIRED
    if (res.status === 403 && data?.code === 'PROFILE_REQUIRED') {
      authEventListener?.('profile_required');
      throw new ApiClientError(data?.message || 'Profile required', res.status, { ...data, code: data?.code });
    }

    if (res.status === 403 && data?.code === 'ACCOUNT_PENDING_APPROVAL') {
      authEventListener?.('pending_approval');
      throw new ApiClientError(data?.message || 'Account pending approval', res.status, { ...data, code: data?.code });
    }

    // Handle 401 — try token refresh once
    if (res.status === 401 && retry) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return request<T>(path, method, body, { ...options, retry: false });
      }
      authEventListener?.('logout');
      throw new ApiClientError('Unauthorized', 401);
    }

    if (res.status === 401) {
      authEventListener?.('logout');
      throw new ApiClientError('Unauthorized', res.status);
    }

    if (res.status === 403 && ['ACCOUNT_REJECTED', 'ACCOUNT_BLOCKED', 'ACCOUNT_DELETED'].includes(String(data?.code || ''))) {
      authEventListener?.('logout');
      throw new ApiClientError(data?.message || data?.error || 'Account is not active', res.status, { ...data, code: data?.code });
    }

    if (!res.ok) {
      const fieldErrors = data?.details?.fieldErrors;
      const firstFieldError = fieldErrors
        ? Object.values(fieldErrors).flat().find(Boolean)
        : null;
      throw new ApiClientError(
        String(firstFieldError || data?.message || data?.error || 'Request failed'),
        res.status,
        { ...data?.details, code: data?.code }
      );
    }

    if (method === 'GET' && cacheTtlMs > 0) {
      responseCache.set(cacheKey, {
        value: data,
        expiresAt: Date.now() + cacheTtlMs,
        storedAt: Date.now(),
      });
    } else {
      invalidateApiCacheAfterMutation(path, method);
    }

    return data as T;
  };

  const requestPromise = runRequest();
  if (method === 'GET' && cacheTtlMs > 0 && !options.forceRefresh) {
    inFlightRequests.set(cacheKey, requestPromise);
  }

  try {
    return await requestPromise;
  } finally {
    if (method === 'GET') inFlightRequests.delete(cacheKey);
  }
}

// ─── Public API Methods ───
export async function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>(path, 'GET', undefined, options);
}

export async function apiPost<T>(path: string, body: any, options?: RequestOptions): Promise<T> {
  return request<T>(path, 'POST', body, options);
}

export async function apiPatch<T>(path: string, body: any, options?: RequestOptions): Promise<T> {
  return request<T>(path, 'PATCH', body, options);
}

export async function apiPut<T>(path: string, body: any, options?: RequestOptions): Promise<T> {
  return request<T>(path, 'PUT', body, options);
}

export async function apiDelete<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>(path, 'DELETE', undefined, options);
}
