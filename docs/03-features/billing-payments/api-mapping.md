# Billing & Payments — API Mapping

## Invoice APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/invoices?buildingId=&month=&year=&roomId=&status=` | `loadInvoices()` | Invoice list with filters. |
| `POST` | `/invoices` | `createInvoice()` | Create invoice; rejects duplicates. |
| `GET` | `/invoices/:id` | `loadInvoice()` | Invoice detail. |
| `GET` | `/invoices/history/:contractId` | `loadInvoicesByContract()` | Invoice history (BE path exists, FE filters client-side). |
| `GET` | `/invoices/previous-debt` | Invoice form helpers | Previous unpaid debt amount. |
| `GET` | `/invoices/latest-meter-readings?roomId=` | `loadLatestMeterReadings()` | Latest electricity/water meter values. |
| `POST` | `/invoices/:id/mark-paid` | `recordPayment()` | Sets invoice paid after FE creates transaction. |
| `POST` | `/invoices/:id/collect-payment` | Not used by current FE | Combined payment endpoint (future consideration). |
| `DELETE` | `/invoices/:id` | `deleteInvoice()` | Deletes invoice and linked transaction. |
| `POST` | `/invoices/bulk-create` | `bulkCreateInvoices()` | Bulk invoice creation. |
| `POST` | `/invoices/bulk-collect-payment` | `bulkCollectPayments()` | Bulk payment collection. |
| `POST` | `/invoices/auto-generate` | Not wired in FE | Generates draft invoices for occupied rooms. |

## Transaction & Wallet APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `POST` | `/transactions` | `recordPayment()` | Creates income transaction before marking invoice paid. |
| `GET` | `/wallets` | `loadWallets()` | Lists payment wallets for wallet selector. |

## Code Paths

| Layer | File |
|---|---|
| FE Invoice Create | `web-admin/src/app/(owner-ops)/invoices/new/page.tsx` |
| FE Invoice Detail | `web-admin/src/app/(owner-ops)/invoices/[id]/page.tsx` |
| FE Payment Create | `web-admin/src/app/(owner-ops)/payments/new/page.tsx` |
| FE Service | `web-admin/src/lib/rentalOps.ts` |
| BE Invoice Routes | `backend/src/routes/invoices.ts` |
| BE Transaction Routes | `backend/src/routes/transactions.ts` |
| BE Wallet Routes | `backend/src/routes/wallets.ts` |
