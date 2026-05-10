/**
 * rentalApiService.js
 * Gọi API Backend cho các tính năng Rental Management.
 * Dùng thay cho local SQLite queries khi isApiDataEnabled() = true.
 */
import { getAuthToken } from './authService';

const getBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Fallback cho local dev
  return 'http://localhost:8787';
};

async function apiFetch(path, options = {}) {
  const token = await getAuthToken();
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `API Error ${res.status}`);
  }
  return data;
}

const apiGet = (path) => apiFetch(path);
const apiPost = (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
const apiPatch = (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
const apiDelete = (path) => apiFetch(path, { method: 'DELETE' });

// ─── Rooms ────────────────────────────────────────────────
export async function getRoomsApi(buildingId) {
  const query = buildingId ? `?buildingId=${buildingId}` : '';
  const res = await apiGet(`/rental/rooms${query}`);
  return res?.data ?? [];
}

// ─── Contracts ────────────────────────────────────────────
export async function terminateContractApi(contractId, input) {
  const res = await apiPost(`/rental/contracts/${contractId}/terminate`, input);
  return res?.data ?? res;
}

export async function getContractByRoomApi(roomId) {
  const res = await apiGet(`/rental/contracts?roomId=${roomId}&status=active`);
  return (res?.data ?? [])[0] ?? null;
}

// ─── Invoices ─────────────────────────────────────────────
export async function getInvoicesByContractApi(contractId) {
  const res = await apiGet(`/invoices?contractId=${contractId}&limit=100`);
  return res?.data ?? [];
}

export async function collectInvoiceApi(invoiceId, body) {
  const res = await apiPost(`/invoices/${invoiceId}/collect`, body);
  return res?.data ?? res;
}

// ─── Wallets ──────────────────────────────────────────────
export async function getWalletsApi() {
  const res = await apiGet('/wallets');
  return res?.data ?? [];
}

// ─── Deposits ─────────────────────────────────────────────
export async function getDepositsApi() {
  const res = await apiGet('/rental/deposits');
  return res?.data ?? [];
}

export async function createDepositApi(input) {
  const res = await apiPost('/rental/deposits', input);
  return res?.data;
}

export async function updateDepositStatusApi(id, status, note) {
  const res = await apiPatch(`/rental/deposits/${id}`, { status, note });
  return res?.data;
}

// ─── Transactions ─────────────────────────────────────────
export async function getTransactionsApi({ contractId, walletId, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (contractId) params.append('contractId', contractId);
  if (walletId) params.append('walletId', walletId);
  if (limit) params.append('limit', limit);
  const res = await apiGet(`/transactions?${params.toString()}`);
  return res?.data ?? [];
}

export async function deleteTransactionApi(id) {
  const res = await apiDelete(`/transactions/${id}`);
  return res;
}
