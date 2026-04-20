import apiClient from '../../services/apiClient';
import { IWalletRepository } from '../IWalletRepository';

const sumByType = (rows, type) =>
  rows
    .filter((x) => x.type === type)
    .reduce((sum, x) => sum + Number(x.amount || 0), 0);

const fetchAllTransactions = async (walletId = null) => {
  const limit = 200;
  let offset = 0;
  let all = [];
  let count = null;

  while (count === null || all.length < count) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (walletId) query.set('walletId', String(walletId));

    const res = await apiClient.get(`/transactions?${query.toString()}`);
    const rows = res?.data || [];
    count = Number(res?.count || 0);
    all = all.concat(rows);
    if (rows.length === 0) break;
    offset += limit;
  }

  return all;
};

export class ApiWalletRepository extends IWalletRepository {
  async addWallet(name, typeStr) {
    const res = await apiClient.post('/wallets', {
      name,
      type: typeStr,
    });
    return res?.data || null;
  }

  async getWallets() {
    const res = await apiClient.get('/wallets');
    return res?.data || [];
  }

  async getAllWallets() {
    const res = await apiClient.get('/wallets?activeOnly=0');
    return res?.data || [];
  }

  async toggleWalletStatus(id, active) {
    const res = await apiClient.patch(`/wallets/${id}`, { active: Boolean(active) });
    return res?.data || null;
  }

  async updateWallet(id, name, typeStr) {
    const res = await apiClient.patch(`/wallets/${id}`, {
      name,
      type: typeStr,
    });
    return res?.data || null;
  }

  async getWalletStats(walletId) {
    const res = await apiClient.get(`/wallets/${walletId}/stats`);
    return res?.data || { income: 0, expense: 0, balance: 0 };
  }

  async getMonthlyWalletStats(walletId, month, year) {
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
    });
    const res = await apiClient.get(`/wallets/${walletId}/stats?${params.toString()}`);
    return res?.data || { income: 0, expense: 0, balance: 0 };
  }

  async getTotalStats() {
    const rows = await fetchAllTransactions();
    const income = sumByType(rows, 'income');
    const expense = sumByType(rows, 'expense');
    return { income, expense, balance: income - expense };
  }

  async getMonthlyStats(month, year) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const rows = await fetchAllTransactions();
    const filtered = rows.filter((x) => String(x.date || '').startsWith(prefix));
    const income = sumByType(filtered, 'income');
    const expense = sumByType(filtered, 'expense');
    return { income, expense, balance: income - expense };
  }
}

export const apiWalletRepository = new ApiWalletRepository();
