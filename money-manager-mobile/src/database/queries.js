import { shouldUseApiData } from '../services/dataMode';
import { apiWalletRepository } from '../repositories/api/ApiWalletRepository';
import { apiCategoryRepository } from '../repositories/api/ApiCategoryRepository';
import { apiRentalRepository } from '../repositories/api/ApiRentalRepository';

// Re-export from repositories
export * from './repositories/RentalRepository';
export * from './repositories/InvoiceRepository';
export * from './repositories/TransactionRepository';
export * from './repositories/TradingRepository';
export * from './repositories/CommonRepository';

// Shared Constants & Bootstrap logic (kept here for central management)
export const DEFAULT_WALLETS = [
  { name: 'Tài chính cá nhân', type: 'personal' },
  { name: 'Quản lý nhà trọ', type: 'rental' },
  { name: 'Kinh doanh / Tồn kho', type: 'trading' },
];

const DEFAULT_CATEGORIES_BY_WALLET_TYPE = {
  personal: {
    expense: [
      { name: 'Ăn uống', icon: '🍔', color: '#ef4444' },
      { name: 'Di chuyển', icon: '🚗', color: '#3b82f6' },
      { name: 'Hóa đơn', icon: '📄', color: '#6366f1' },
    ],
    income: [
      { name: 'Lương', icon: '💼', color: '#10b981' },
      { name: 'Thưởng', icon: '🎁', color: '#0ea5e9' },
    ],
  },
  rental: {
    expense: [{ name: 'Bảo trì', icon: '🔧', color: '#f59e0b' }],
    income: [{ name: 'Thu tiền phòng', icon: '🏠', color: '#10b981' }],
  },
  trading: {
    expense: [{ name: 'Nhập hàng', icon: '📦', color: '#f97316' }],
    income: [{ name: 'Bán hàng', icon: '💰', color: '#16a34a' }],
  },
};

const DEFAULT_RENTAL_SERVICES = [
  { name: 'Điện', type: 'metered', unitPrice: 3500, unitPriceAc: 4000, unit: 'kWh', icon: '⚡' },
  { name: 'Nước', type: 'metered', unitPrice: 15000, unitPriceAc: 0, unit: 'm3', icon: '💧' },
  { name: 'Rác', type: 'fixed', unitPrice: 30000, unitPriceAc: 0, unit: 'month', icon: '🗑️' },
  { name: 'Wifi', type: 'fixed', unitPrice: 70000, unitPriceAc: 0, unit: 'month', icon: '📶' },
];

let apiBootstrapPromise = null;
let apiServicesBootstrapPromise = null;

export const ensureApiBootstrapData = async () => {
  if (!shouldUseApiData()) return;
  if (apiBootstrapPromise) return apiBootstrapPromise;

  apiBootstrapPromise = (async () => {
    let allWallets = await apiWalletRepository.getAllWallets();
    if (allWallets.length === 0) {
      await Promise.all(
        DEFAULT_WALLETS.map((wallet) => apiWalletRepository.addWallet(wallet.name, wallet.type))
      );
      allWallets = await apiWalletRepository.getAllWallets();
    }

    await Promise.all(
      allWallets.map(async (wallet) => {
        const walletType = String(wallet.type || '');
        const defaults = DEFAULT_CATEGORIES_BY_WALLET_TYPE[walletType];
        if (!defaults) return;

        const [expenseCats, incomeCats] = await Promise.all([
          apiCategoryRepository.getCategories('expense', wallet.id),
          apiCategoryRepository.getCategories('income', wallet.id),
        ]);

        const expenseNames = new Set(expenseCats.map((x) => String(x.name).toLowerCase()));
        const incomeNames = new Set(incomeCats.map((x) => String(x.name).toLowerCase()));

        for (const cat of defaults.expense) {
          if (!expenseNames.has(cat.name.toLowerCase())) {
            await apiCategoryRepository.addCategory(cat.name, cat.icon, cat.color, 'expense', wallet.id, null);
          }
        }
        for (const cat of defaults.income) {
          if (!incomeNames.has(cat.name.toLowerCase())) {
            await apiCategoryRepository.addCategory(cat.name, cat.icon, cat.color, 'income', wallet.id, null);
          }
        }
      })
    );
  })();

  try {
    await apiBootstrapPromise;
  } catch (error) {
    apiBootstrapPromise = null;
    throw error;
  }
};

export const ensureApiRentalServices = async () => {
  if (!shouldUseApiData()) return;
  if (apiServicesBootstrapPromise) return apiServicesBootstrapPromise;

  apiServicesBootstrapPromise = (async () => {
    const services = await apiRentalRepository.getServices(false);
    if (services.length > 0) return;

    for (const service of DEFAULT_RENTAL_SERVICES) {
      await apiRentalRepository.addService(service);
    }
  })();

  try {
    await apiServicesBootstrapPromise;
  } catch (error) {
    apiServicesBootstrapPromise = null;
    throw error;
  }
};
