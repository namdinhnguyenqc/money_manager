# Finance & Cash Flow — API Mapping

This document maps all financial endpoints to their corresponding frontend callers and backend file systems.

---

## 1. Financial Transactions APIs (`/transactions/*`)

| Method | Endpoint | FE Caller (mobile/web) | Description |
|---|---|---|---|
| `GET` | `/transactions` | `loadTransactions()` | List transaction records (filter by contract, wallet, type). |
| `POST` | `/transactions` | `createTransaction()` | Create manual income or expense ticket. |
| `PATCH` | `/transactions/:id` | `updateTransaction()` | Update description, category, or note. |
| `DELETE` | `/transactions/:id` | `deleteTransaction()` | Delete transaction and revert wallet balance. |

---

## 2. Wallet Management APIs (`/wallets/*`)

| Method | Endpoint | FE Caller (mobile/web) | Description |
|---|---|---|---|
| `GET` | `/wallets` | `loadWallets()` | List all active wallets (cash, bank, MOMO) and current balances. |
| `POST` | `/wallets` | `createWallet()` | Create a new financial source/wallet. |
| `PATCH` | `/wallets/:id` | `updateWallet()` | Rename wallet or change type. |
| `GET` | `/wallets/:id/stats` | `loadWalletStats()` | Thống kê ví (income, expense, net balance). |
| `DELETE` | `/wallets/:id` | `deleteWallet()` | Delete wallet (only if balance is `0` or no transactions exist). |

---

## 3. Transaction Categories APIs (`/categories/*`)

| Method | Endpoint | FE Caller (mobile/web) | Description |
|---|---|---|---|
| `GET` | `/categories` | `loadCategories()` | Fetch categories for classification (income vs expense). |
| `POST` | `/categories` | `createCategory()` | Create custom category. |
| `PATCH` | `/categories/:id` | `updateCategory()` | Update custom category icon or name. |
| `DELETE` | `/categories/:id` | `deleteCategory()` | Delete custom category. |

---

## 4. Code Base Paths

| System Layer | Target Files |
|---|---|
| **Backend Route Handlers** | - [transactions.ts](file:///Users/thao/money_manager/backend/src/routes/transactions.ts)<br/>- [wallets.ts](file:///Users/thao/money_manager/backend/src/routes/wallets.ts)<br/>- [categories.ts](file:///Users/thao/money_manager/backend/src/routes/categories.ts) |
| **Mobile Core Callers** | - `mobile/lib/rentalOps.ts` |
| **Mobile Zustand Stores** | - `mobile/store/useWalletStore.ts` |
| **Web-Admin View Logs** | - `web-admin/src/app/(owner-ops)/finance/page.tsx` |
