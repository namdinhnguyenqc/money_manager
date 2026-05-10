"use client";

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

import { API_URL } from '@/lib/api'
import { authFetch, handleUnauthorizedLogout } from '@/utils/authFetch'

export class ApiClientError extends Error {
  status: number
  code?: string
  details?: any
  fieldErrors?: Record<string, string[]>

  constructor(message: string, status: number, details?: any) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.details = details
    this.code = details?.code
    this.fieldErrors = details?.fieldErrors
  }
}

export const toURL = (path: string) => {
  if (path.startsWith('http')) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_URL}${p}`
}

// Expose for manual integration tests to verify URL mapping
export function buildUrl(path: string): string {
  return toURL(path)
}

async function request<T>(path: string, method: HttpMethod, body?: any): Promise<T> {
  const url = toURL(path)
  const res = await authFetch(url, {
    method,
    headers: body !== undefined && body !== null ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined && body !== null && typeof body !== 'string' ? JSON.stringify(body) : body,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 403 && data?.code === 'PROFILE_REQUIRED') {
    if (typeof window !== 'undefined' && window.location.pathname !== '/complete-profile') {
      sessionStorage.setItem('profileRequiredMessage', data?.message || 'Vui lòng hoàn tất hồ sơ để tiếp tục sử dụng hệ thống.')
      window.location.href = '/complete-profile'
    }
    throw new ApiClientError(data?.message || 'Profile required', res.status, { ...data, code: data?.code })
  }

  if (res.status === 401 || res.status === 403) {
    if (typeof window !== 'undefined') {
      handleUnauthorizedLogout()
    }
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const fieldErrors = data?.details?.fieldErrors
    const firstFieldError = fieldErrors
      ? Object.values(fieldErrors).flat().find(Boolean)
      : null
    throw new ApiClientError(String(firstFieldError || data?.message || data?.error || 'Request failed'), res.status, { ...data?.details, code: data?.code })
  }
  // Try to parse JSON, otherwise return raw
  return data as T
}

export async function apiGet<T>(path: string): Promise<T> {
  return await request<T>(path, 'GET')
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  return await request<T>(path, 'POST', body)
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  return await request<T>(path, 'PATCH', body)
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  return await request<T>(path, 'PUT', body)
}

export async function apiDelete<T>(path: string): Promise<T> {
  return await request<T>(path, 'DELETE')
}
