# Trading & Inventory — Mobile Integration

Landlords utilize the "Kinh Doanh" tab to view real-time sales performance, review stock counts, and execute imports directly from their mobile devices.

---

## 1. Zustand Store Configuration (`useTradingStore`)
The mobile client coordinates inventory updates and margin stats in a synchronized store:

```typescript
import { create } from 'zustand';
import { loadTradingItems, loadTradingStats, createTradingItem, updateTradingItem } from '../lib/rentalOps';

interface TradingStore {
  items: TradingItem[];
  stats: TradingStats | null;
  isLoading: boolean;
  fetchTradingData: (walletId: string) => Promise<void>;
  importStock: (payload: ImportPayload) => Promise<void>;
  sellProduct: (id: string, sellPrice: number, walletId: string) => Promise<void>;
}

export const useTradingStore = create<TradingStore>((set, get) => ({
  items: [],
  stats: null,
  isLoading: false,
  fetchTradingData: async (walletId) => {
    set({ isLoading: true });
    const [itemsData, statsData] = await Promise.all([
      loadTradingItems(walletId),
      loadTradingStats(walletId)
    ]);
    set({ items: itemsData, stats: statsData, isLoading: false });
  },
  importStock: async (payload) => {
    await createTradingItem(payload);
    await get().fetchTradingData(payload.walletId);
  },
  sellProduct: async (id, sellPrice, walletId) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    await updateTradingItem(id, {
      status: 'sold',
      sellPrice,
      sellDate: todayStr
    });
    await get().fetchTradingData(walletId);
  }
}));
```

---

## 2. Integrated Dashboard Quick Actions
The "Kinh Doanh" sub-dashboard exposes quick-action touchpoints that trigger native modals:
- **Nhập hàng (Import Modal)**: Standard sliding form letting landlords add quantities and custom sub-item names.
- **Bán hàng (Sales Modal)**: Prompts for the sale price (prepopulated with `targetPrice`) and immediately logs the transaction.
