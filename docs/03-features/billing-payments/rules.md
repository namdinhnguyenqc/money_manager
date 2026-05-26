# Billing & Payments — Rules

## Invoice Calculation
- **Total** = Room Rent + Utility Costs + Extra Fees − Discount.
- **Utility Cost** = (Current Meter Reading − Previous Meter Reading) × Unit Price.
- Previous meter readings are loaded from the last invoice via `GET /invoices/latest-meter-readings?roomId=`.

## Duplicate Prevention
- Only one invoice per `room_id` + `contract_id` + `month` + `year`.
- Backend rejects duplicate creation with an error.

## Payment Ledger Linkage (Two-Step)
1. **Step 1**: Create income transaction via `POST /transactions` — maps to a wallet, increases balance.
2. **Step 2**: Mark invoice paid via `POST /invoices/:id/mark-paid` — binds `transaction_id`, sets `paid_amount` and `status = PAID`.
- Both steps must succeed. Do not switch to the combined `POST /invoices/:id/collect-payment` endpoint without verifying wallet balance, transaction creation, and invoice status together.

## Payment Methods
Supported methods: Cash, Bank Transfer, E-Wallet.
- **Bank Transfer / E-Wallet**: Requires transaction code and/or note.
- **Cash**: Note is optional.

## Wallet Rules
- Each owner can have multiple wallets (cash, bank accounts, e-wallets).
- Payment recording requires selecting a target wallet.
- Wallet balance is updated atomically with transaction creation.

## Previous Debt
- `GET /invoices/previous-debt` provides the unpaid amount from prior periods for inclusion in new invoices.
