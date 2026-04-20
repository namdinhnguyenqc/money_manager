import apiClient from '../../services/apiClient';

export class ApiCategoryRepository {
  async getCategories(type, walletId) {
    const params = new URLSearchParams({
      type: String(type),
      walletId: String(walletId),
    });
    const res = await apiClient.get(`/categories?${params.toString()}`);
    return res?.data || [];
  }

  async addCategory(name, icon, color, type, walletId, parentId = null) {
    const res = await apiClient.post('/categories', {
      name,
      icon,
      color,
      type,
      walletId: Number(walletId),
      parentId,
    });
    return Number(res?.data?.id);
  }

  async updateCategory(id, name, icon, color, parentId = null) {
    const res = await apiClient.patch(`/categories/${id}`, {
      name,
      icon,
      color,
      parentId,
    });
    return res?.data || null;
  }

  async deleteCategory(id) {
    await apiClient.delete(`/categories/${id}`);
  }
}

export const apiCategoryRepository = new ApiCategoryRepository();
