export class IWalletRepository {
  async getWallets() { throw new Error('Not implemented'); }
  async getWalletStats(walletId) { throw new Error('Not implemented'); }
  async getTotalStats() { throw new Error('Not implemented'); }
  async getMonthlyStats(month, year) { throw new Error('Not implemented'); }
}
