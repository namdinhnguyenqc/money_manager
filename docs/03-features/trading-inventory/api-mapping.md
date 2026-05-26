# Trading & Inventory — API Mapping

This mapping aligns merchandise tracking routes and statistics with active client-side controllers.

---

## 1. Inventory & Trading Endpoints (`/trading/*`)

| Method | Endpoint | FE Caller (mobile/web) | Description |
|---|---|---|---|
| `GET` | `/trading/items?walletId=...` | `loadTradingItems()` | List merchandise in a wallet, including unit pricing and batch metrics. |
| `GET` | `/trading/items/batch/:batchId` | Custom pages | Load all stock items belonging to the same wholesale shipment. |
| `POST` | `/trading/items` | `createTradingItem()` | Register bulk or singular item purchases (deducts wallet, adds rows). |
| `PATCH` | `/trading/items/:id` | `updateTradingItem()` | Sell an item (adds revenue) or update item meta notes. |
| `DELETE` | `/trading/items/:id` | `deleteTradingItem()` | Hard delete item from database. |
| `GET` | `/trading/stats?walletId=...` | `loadTradingStats()` | Calculate overall investment capital vs realized profit margins. |

---

## 2. Code File Locations

| Layer | Path |
|---|---|
| **Backend API Route** | - [trading.ts](file:///Users/thao/money_manager/backend/src/routes/trading.ts) |
| **Mobile Service Controller** | - `mobile/lib/rentalOps.ts` |
| **Zustand Store Context** | - `mobile/store/useTradingStore.ts` |
| **Web Admin Dash View** | - `web-admin/src/app/(owner-ops)/trading/page.tsx` |
