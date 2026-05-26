# Billing & Payments — Edge Cases

## 1. Duplicate Invoice
- **Trigger**: Owner creates an invoice for a room/contract/month/year that already has one.
- **Backend**: Rejects with error. FE should display error and not create duplicate.

## 2. Split Payment Flow vs. Combined
- **Current**: FE creates transaction (`POST /transactions`) then marks invoice paid (`POST /invoices/:id/mark-paid`).
- **Alternative**: Backend has `POST /invoices/:id/collect-payment` that combines both steps.
- **Rule**: Do NOT switch without testing wallet balance, transaction creation, and invoice status together.

## 3. Invoice Delete with Linked Transaction
- Deleting an invoice also deletes the linked transaction and reverses the wallet balance.

## 4. Zero Meter Reading
- If previous and current meter readings are the same, utility cost is zero. This is valid (e.g., vacant period).

## 5. No Wallet Available
- Payment page requires at least one wallet. If none exists, owner must create a wallet first.
- FE should show a helpful message guiding to wallet creation.

## 6. Partial Payment
- Current system assumes full payment. Partial payment flows are not implemented in Phase 1.
