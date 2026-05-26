# Finance & Cash Flow — Mobile Integration

The mobile application utilizes the finance APIs to provide landlords with an on-the-go cash flow ledger ("Sổ quỹ") and convenient multi-wallet tracking.

---

## 1. Zustand Store Configuration (`useWalletStore`)
Mobile relies on a central Zustand store to hold current cash levels across all bank and cash wallets, avoiding repeated API fetches across screens:

```typescript
import { create } from 'zustand';
import { loadWallets, createTransaction } from '../lib/rentalOps';

interface WalletStore {
  wallets: Wallet[];
  isLoading: boolean;
  fetchWallets: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  wallets: [],
  isLoading: false,
  fetchWallets: async () => {
    set({ isLoading: true });
    const data = await loadWallets();
    set({ wallets: data, isLoading: false });
  },
  addTransaction: async (tx) => {
    await createTransaction(tx);
    await get().fetchWallets(); // Recalculate wallet balances instantly
  }
}));
```

---

## 2. Shared Wallet Switcher Component
Form elements (such as `payment/new.tsx`, `contract/new.tsx`, and transaction additions) render a gorgeous, horizontal selector to choose payment channels:

```tsx
import React from 'react';
import { ScrollView, Pressable, Text } from 'react-native';

export function WalletPicker({ wallets, selectedId, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {wallets.map((wallet) => (
        <Pressable
          key={wallet.id}
          onPress={() => onSelect(wallet.id)}
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: selectedId === wallet.id ? '#8A3FFC' : '#F1F5F9',
            marginRight: 8,
          }}
        >
          <Text style={{ color: selectedId === wallet.id ? '#FFFFFF' : '#1E293B' }}>
            {wallet.name} ({wallet.balance.toLocaleString()}đ)
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
```

---

## 3. Integrated Billing Collections
Whenever an owner clicks **"Thu tiền"** on an invoice card inside the Mobile application:
1. The app loads the payment drawer.
2. The owner selects a wallet (e.g., *Vietcombank* or *Tiền mặt*).
3. Confirming payment invokes `POST /invoices/:id/collect-payment` with `walletId`, automatically creating a `COMPLETED` transaction of category `INVOICE_PAYMENT`.
