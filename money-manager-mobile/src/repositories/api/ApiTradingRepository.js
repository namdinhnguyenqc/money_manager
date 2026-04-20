import apiClient from '../../services/apiClient';

export class ApiTradingRepository {
  async getTradingItems(walletId) {
    const params = new URLSearchParams({ walletId: String(walletId) });
    const res = await apiClient.get(`/trading/items?${params.toString()}`);
    return res?.data || [];
  }

  async getTradingItemsByBatch(batchId) {
    const res = await apiClient.get(`/trading/items/batch/${batchId}`);
    return res?.data || [];
  }

  async addTradingItem(payload) {
    const res = await apiClient.post('/trading/items', payload);
    const rows = res?.data || [];
    if (Array.isArray(rows) && rows.length > 0) {
      return Number(rows[rows.length - 1].id);
    }
    return null;
  }

  async updateTradingItem(id, data) {
    const payload = {
      name: data.name,
      category: data.category || '',
      importPrice: data.importPrice,
      sellPrice: data.sellPrice || 0,
      targetPrice: data.targetPrice || null,
      importDate: data.importDate,
      sellDate: data.sellDate || null,
      status: data.status,
      note: data.note || '',
    };
    const res = await apiClient.patch(`/trading/items/${id}`, payload);
    return res?.data || null;
  }

  async deleteTradingItem(id) {
    await apiClient.delete(`/trading/items/${id}`);
  }

  async getTradingStats(walletId) {
    const params = new URLSearchParams({ walletId: String(walletId) });
    const res = await apiClient.get(`/trading/stats?${params.toString()}`);
    return res?.data || {
      unsoldCapital: 0,
      unsoldCount: 0,
      realizedProfit: 0,
      soldCount: 0,
    };
  }
}

export const apiTradingRepository = new ApiTradingRepository();
