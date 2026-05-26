# Billing & Payments — UI Behavior

## Invoice Creation Page (`/invoices/new?contract_id=:id`)
- Auto-loads contract, room, tenant, and services context.
- Pre-populates previous meter readings from `GET /invoices/latest-meter-readings`.
- Owner inputs current/final electricity and water readings.
- Real-time calculation of utility costs and invoice total.
- Submit creates invoice and redirects to `/invoices/:id`.

## Invoice Detail Page (`/invoices/:id`)
- Displays: room, tenant, period, line items (rent, utilities, fees), total, paid status.
- If unpaid: shows "Ghi nhận thanh toán" button linking to `/payments/new?invoice_id=:id`.
- If paid: shows paid badge and linked transaction ID.

## Payment Page (`/payments/new?invoice_id=:id`)
- Loads invoice details and wallet list.
- Form fields: amount (pre-filled from invoice total), payment method, wallet, date, collector, note/transaction code.
- Bank transfer / E-wallet methods require transaction code or note.
- Submit creates transaction then marks invoice paid. Redirects to invoice detail.

## Payments History (`/payments`)
- Lists completed payments with date, amount, room, tenant, and method.
- Newly recorded payments appear in this list.

## Testing Coverage
- **E2E**: `owner-rental-billing-flow.spec.ts` covers invoice creation and payment recording.
