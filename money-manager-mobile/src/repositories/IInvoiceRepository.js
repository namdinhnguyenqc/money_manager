export class IInvoiceRepository {
  async getInvoices(month, year) { throw new Error('Not implemented'); }
  async createInvoice(data) { throw new Error('Not implemented'); }
  async getInvoiceDetails(invoiceId) { throw new Error('Not implemented'); }
  async markInvoicePaid(invoiceId, transactionData) { throw new Error('Not implemented'); }
  async deleteInvoice(invoiceId) { throw new Error('Not implemented'); }
}
