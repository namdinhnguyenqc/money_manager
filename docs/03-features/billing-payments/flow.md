# Billing & Payments — Flow

## Create Invoice Flow
```mermaid
sequenceDiagram
  autonumber
  actor Owner
  participant FE as web-admin
  participant BE as Hono backend

  Owner->>FE: Open contract detail, click "Tạo hóa đơn tháng này"
  FE->>FE: Navigate to /invoices/new?contract_id=:id
  FE->>BE: Load contract, room, tenant, services
  FE->>BE: GET /invoices/latest-meter-readings?roomId=:id
  BE-->>FE: Previous meter readings (electricity, water)
  Owner->>FE: Enter final meter readings and optional extra fees
  FE->>FE: Calculate totals (usage * unit price + rent + fees)
  FE->>BE: POST /invoices
  BE->>BE: Check duplicate (room/contract/month/year) — reject if exists
  BE-->>FE: Created invoice
  FE->>FE: Redirect to /invoices/:id
```

## Record Payment Flow
```mermaid
sequenceDiagram
  autonumber
  actor Owner
  participant FE as web-admin
  participant BE as Hono backend

  Owner->>FE: Open invoice detail, click "Ghi nhận thanh toán"
  FE->>FE: Navigate to /payments/new?invoice_id=:id
  FE->>BE: Load invoice details and wallets (GET /wallets)
  Owner->>FE: Confirm amount, select method, wallet, date, collector, note
  FE->>BE: POST /transactions (create income transaction)
  BE->>BE: Increase wallet balance
  BE-->>FE: Transaction ID
  FE->>BE: POST /invoices/:id/mark-paid (bind transaction_id)
  BE->>BE: Set invoice paid_amount, status=PAID, transaction_id
  BE-->>FE: Paid invoice
  FE->>FE: Redirect to invoice detail (shows paid state)
```

## Bulk Actions
- **Bulk Create**: `POST /invoices/bulk-create` — generates invoices for multiple rooms.
- **Bulk Collect**: `POST /invoices/bulk-collect-payment` — collects payments for multiple invoices.
- **Auto-Generate**: `POST /invoices/auto-generate` — generates draft invoices for all occupied rooms (not fully wired in FE).
