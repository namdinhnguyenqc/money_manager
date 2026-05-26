# Trading & Inventory — User Flows

## 1. Inventory Purchase / Import Flow
This flow represents buying items in bulk (or singular items) to add to the landlord's store.

```mermaid
sequenceDiagram
  autonumber
  actor Owner
  participant FE as Mobile / Web App
  participant BE as Hono backend
  participant DB as Supabase

  Owner->>FE: Click "Nhập hàng" (Import stock)
  Owner->>FE: Fill form: Item Name, Qty, Import Cost, Target Sell Price, Wallet
  FE->>BE: POST /trading/items { name, quantity, importPrice, targetPrice, walletId, importDate }
  BE->>DB: Create EXPENSE transaction in selected wallet for importPrice
  BE->>BE: Divide importPrice & targetPrice by quantity to find per-unit values
  BE->>DB: INSERT [quantity] rows into trading_items with status='available'
  BE-->>FE: 201 Created (Items added + wallet balance decremented)
  FE->>FE: Refresh dashboard inventory counts & capital counters
```

## 2. Inventory Retail Sale Flow
This flow represents selling an available item from stock to a customer or tenant.

```mermaid
sequenceDiagram
  autonumber
  actor Owner
  participant FE as Mobile / Web App
  participant BE as Hono backend
  participant DB as Supabase

  Owner->>FE: Open "Danh sách hàng" / select available item
  Owner->>FE: Click "Bán hàng" (Register sale)
  Owner->>FE: Enter sellPrice, select payment wallet and sellDate
  FE->>BE: PATCH /trading/items/:id { status: 'sold', sellPrice, sellDate, walletId }
  BE->>DB: Query item original import price
  BE->>DB: Create INCOME transaction in selected wallet for sellPrice
  BE->>DB: UPDATE trading_items SET status='sold', sell_price=sellPrice, sell_date=sellDate
  BE-->>FE: 200 OK (Item updated, profits logged)
  FE->>FE: Update UI to SOLD and recalculate realized profit margins
```
