import apiClient from '../../services/apiClient';

export class ApiBankConfigRepository {
  async getBankConfig() {
    const res = await apiClient.get('/bank-config');
    return res?.data || null;
  }

  async updateBankConfig(data) {
    const payload = {
      bank_id: data.bank_id,
      account_no: data.account_no,
      account_name: data.account_name,
      qr_uri: data.qr_uri || null,
      user_avatar: data.user_avatar || null,
    };
    const res = await apiClient.put('/bank-config', payload);
    return res?.data || null;
  }
}

export const apiBankConfigRepository = new ApiBankConfigRepository();
