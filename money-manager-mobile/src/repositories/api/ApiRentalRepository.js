import apiClient from '../../services/apiClient';

export class ApiRentalRepository {
  async getRooms(walletId = null) {
    const params = new URLSearchParams();
    if (walletId) params.set('walletId', String(walletId));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get(`/rental/rooms${suffix}`);
    return res?.data || [];
  }

  async addRoom(name, price, hasAc = false, numPeople = 1, walletId = null) {
    const res = await apiClient.post('/rental/rooms', {
      name,
      price: Number(price || 0),
      hasAc: Boolean(hasAc),
      numPeople: Number(numPeople || 1),
      walletId: walletId ? Number(walletId) : null,
    });
    return Number(res?.data?.id);
  }

  async updateRoom(id, name, price, hasAc, numPeople) {
    const res = await apiClient.patch(`/rental/rooms/${id}`, {
      name,
      price: Number(price || 0),
      hasAc: Boolean(hasAc),
      numPeople: Number(numPeople || 1),
    });
    return res?.data || null;
  }

  async deleteRoom(id) {
    await apiClient.delete(`/rental/rooms/${id}`);
  }

  async getTenants() {
    const res = await apiClient.get('/rental/tenants');
    return res?.data || [];
  }

  async addTenant(name, phone, idCard, address) {
    const res = await apiClient.post('/rental/tenants', {
      name,
      phone: phone || '',
      idCard: idCard || '',
      address: address || '',
    });
    return Number(res?.data?.id);
  }

  async updateTenant(id, data) {
    const res = await apiClient.patch(`/rental/tenants/${id}`, {
      name: data.name,
      phone: data.phone || '',
      idCard: data.idCard || '',
      address: data.address || '',
    });
    return res?.data || null;
  }

  async getActiveContracts() {
    const res = await apiClient.get('/rental/contracts/active');
    return res?.data || [];
  }

  async addContract(roomId, tenantId, startDate, deposit, serviceIds = []) {
    const res = await apiClient.post('/rental/contracts', {
      roomId: Number(roomId),
      tenantId: Number(tenantId),
      startDate,
      deposit: Number(deposit || 0),
      serviceIds,
    });
    return Number(res?.data?.id);
  }

  async updateContract(id, { startDate, deposit, serviceIds = [] }) {
    const res = await apiClient.patch(`/rental/contracts/${id}`, {
      startDate,
      deposit: Number(deposit || 0),
      serviceIds,
    });
    return res?.data || null;
  }

  async terminateContract(id, roomId, refundAmount = 0, walletId = null) {
    const payload = {
      roomId: Number(roomId),
      refundAmount: Number(refundAmount || 0),
      walletId: walletId ? Number(walletId) : null,
    };
    await apiClient.post(`/rental/contracts/${id}/terminate`, payload);
  }

  async getServices(activeOnly = true) {
    const params = new URLSearchParams({ activeOnly: activeOnly ? '1' : '0' });
    const res = await apiClient.get(`/rental/services?${params.toString()}`);
    return res?.data || [];
  }

  async addService({ name, type, unitPrice, unitPriceAc = 0, unit, icon }) {
    const res = await apiClient.post('/rental/services', {
      name,
      type,
      unitPrice: Number(unitPrice || 0),
      unitPriceAc: Number(unitPriceAc || 0),
      unit,
      icon,
    });
    return Number(res?.data?.id);
  }

  async updateService(id, { unitPrice, unitPriceAc, active }) {
    const payload = {};
    if (unitPrice !== undefined) payload.unitPrice = Number(unitPrice || 0);
    if (unitPriceAc !== undefined) payload.unitPriceAc = Number(unitPriceAc || 0);
    if (active !== undefined) payload.active = Boolean(active);
    const res = await apiClient.patch(`/rental/services/${id}`, payload);
    return res?.data || null;
  }

  async deleteService(id) {
    await apiClient.delete(`/rental/services/${id}`);
  }

  async getContractServices(contractId) {
    const res = await apiClient.get(`/rental/contracts/${contractId}/services`);
    return res?.data || [];
  }
}

export const apiRentalRepository = new ApiRentalRepository();
