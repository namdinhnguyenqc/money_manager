import apiClient from '../../services/apiClient';
import { IInvoiceRepository } from '../IInvoiceRepository';

export class ApiInvoiceRepository extends IInvoiceRepository {
  async getInvoices(month, year) {
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
    });
    const res = await apiClient.get(`/invoices?${params.toString()}`);
    return res?.data || [];
  }

  async createInvoice(data) {
    const res = await apiClient.post('/invoices', data);
    return Number(res?.data?.id);
  }

  async getInvoiceDetails(invoiceId) {
    const res = await apiClient.get(`/invoices/${invoiceId}`);
    return res?.data || null;
  }

  async getInvoiceHistory(contractId) {
    const res = await apiClient.get(`/invoices/history/${contractId}`);
    return res?.data || [];
  }

  async getPreviousDebt(roomId, month, year) {
    const params = new URLSearchParams({
      roomId: String(roomId),
      month: String(month),
      year: String(year),
    });
    const res = await apiClient.get(`/invoices/previous-debt?${params.toString()}`);
    return Number(res?.data || 0);
  }

  async getLatestMeterReadings(roomId) {
    const params = new URLSearchParams({ roomId: String(roomId) });
    const res = await apiClient.get(`/invoices/latest-meter-readings?${params.toString()}`);
    return res?.data || null;
  }

  async markInvoicePaid(invoiceId, { paidAmount, transactionId = null }) {
    const res = await apiClient.post(`/invoices/${invoiceId}/mark-paid`, {
      paidAmount,
      transactionId,
    });
    return res?.data || null;
  }

  async deleteInvoice(invoiceId) {
    await apiClient.delete(`/invoices/${invoiceId}`);
  }
}

export const apiInvoiceRepository = new ApiInvoiceRepository();
