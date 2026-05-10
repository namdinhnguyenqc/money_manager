"use client";

import { API_URL } from "@/lib/api";
import { authFetch, handleUnauthorizedLogout } from "@/utils/authFetch";

export const getSessionUser = () => {
  if (typeof window === "undefined") return null;
  return {
    name: localStorage.getItem("userName"),
    email: localStorage.getItem("userEmail"),
    role: localStorage.getItem("userRole"),
  };
};

const buildHeaders = (opts = {}) => {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  return headers;
};

const parseResponse = async (res) => {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (res.status === 401 || res.status === 403) {
    handleUnauthorizedLogout();
    const err = new Error("Unauthorized");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(typeof data === "object" ? data?.message || data?.error || "API Error" : data || "API Error");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
};

const request = async (method, endpoint, body, opts = {}) => {
  const headers = buildHeaders(opts);
  const res = await authFetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    auth: opts.auth !== false,
  });
  return parseResponse(res);
};

const apiClient = {
  get(endpoint, opts = {}) {
    return request("GET", endpoint, undefined, opts);
  },
  post(endpoint, body, opts = {}) {
    return request("POST", endpoint, body, opts);
  },
  patch(endpoint, body, opts = {}) {
    return request("PATCH", endpoint, body, opts);
  },
  put(endpoint, body, opts = {}) {
    return request("PUT", endpoint, body, opts);
  },
  delete(endpoint, opts = {}) {
    return request("DELETE", endpoint, undefined, opts);
  },
};

export default apiClient;
