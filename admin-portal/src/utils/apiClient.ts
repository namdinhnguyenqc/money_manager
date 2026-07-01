"use client";

import { apiClient } from "@/lib/api";

export const apiGet = <T,>(url: string) => apiClient<T>(url, { method: "GET" });

export const apiPost = <T,>(url: string, body?: any) =>
  apiClient<T>(url, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });

export const apiPut = <T,>(url: string, body?: any) =>
  apiClient<T>(url, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });

export const apiDelete = <T,>(url: string) => apiClient<T>(url, { method: "DELETE" });
