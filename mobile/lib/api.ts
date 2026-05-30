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

const API_URL = Config.API_URL;
const REQUEST_TIMEOUT_MS = 15000;

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
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
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

function getTimeoutMessage(url: string): string {
  return `Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`;
}

function getUrlCandidates(url: string): string[] {
  if (!url.startsWith(API_URL)) return [url];

  return Array.from(new Set([
    url,
    ...Config.API_FALLBACK_URLS.map((baseUrl) => `${baseUrl}${url.slice(API_URL.length)}`),
  ]));
}

async function fetchSingleUrlWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiClientError(getTimeoutMessage(url), 0, { code: 'NETWORK_TIMEOUT' });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const candidates = getUrlCandidates(url);
  let lastError: any = null;

  for (const candidateUrl of candidates) {
    try {
      return await fetchSingleUrlWithTimeout(candidateUrl, init);
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
        await setAccessToken(data.accessToken);
        if (data?.refreshToken) {
          console.log('[Token Refresh] New refresh token saved.');
          await setRefreshToken(data.refreshToken);
        } else {
          console.warn('[Token Refresh] No refresh token returned in body.');
        }
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

function buildUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${p}`;
}

async function request<T>(path: string, method: HttpMethod, body?: any, retry = true): Promise<T> {
  const url = buildUrl(path);
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    'x-client-platform': Platform.OS === 'ios' ? 'ios' : 'android',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetchWithTimeout(url, {
    method,
    headers,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

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
      return request<T>(path, method, body, false);
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

  return data as T;
}

// ─── Public API Methods ───
export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, 'GET');
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  return request<T>(path, 'POST', body);
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  return request<T>(path, 'PATCH', body);
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  return request<T>(path, 'PUT', body);
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, 'DELETE');
}
