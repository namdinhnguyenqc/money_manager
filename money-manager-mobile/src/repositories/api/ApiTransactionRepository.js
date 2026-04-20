import apiClient from '../../services/apiClient';

export class ApiTransactionRepository {
  async getTransactions({ walletId, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (walletId) params.set('walletId', String(walletId));

    const res = await apiClient.get(`/transactions?${params.toString()}`);
    return res?.data || [];
  }

  async getTransactionCount(walletId = null) {
    const params = new URLSearchParams({
      limit: '1',
      offset: '0',
    });
    if (walletId) params.set('walletId', String(walletId));

    const res = await apiClient.get(`/transactions?${params.toString()}`);
    return Number(res?.count || 0);
  }

  async addTransaction({ type, amount, description, categoryId, walletId, imageUri, date }) {
    const payload = {
      type,
      amount,
      description: description || '',
      categoryId: categoryId || null,
      walletId,
      imageUri: imageUri || null,
      date,
    };
    const res = await apiClient.post('/transactions', payload);
    return Number(res?.data?.id);
  }

  async updateTransaction(id, { type, amount, description, categoryId, walletId, imageUri, date }) {
    const payload = {
      type,
      amount,
      description: description || '',
      categoryId: categoryId || null,
      walletId,
      imageUri: imageUri || null,
      date,
    };
    const res = await apiClient.patch(`/transactions/${id}`, payload);
    return res?.data || null;
  }

  async deleteTransaction(id) {
    await apiClient.delete(`/transactions/${id}`);
  }
}

export const apiTransactionRepository = new ApiTransactionRepository();
