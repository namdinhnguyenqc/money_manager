# Finance & Cash Flow — Edge Cases

## 1. Negative Wallet Balances
- **Scenario**: An owner logs a large maintenance expense from a wallet that has insufficient funds.
- **Rule**: The system **allows** wallet balances to drop below `0`. This is necessary as landlords frequently pay vendors out of pocket before receiving tenant rent.
- **UI Behavior**: Negative balances are highlighted with soft crimson styling and warning icons rather than standard primary or green success layouts.

## 2. Hard Deletion vs. Active Records
- **Scenario**: An owner attempts to delete a wallet or category that is linked to 100 historical transactions.
- **Constraint**: Deletion of referenced wallets or categories is strictly **blocked** by relational database foreign keys.
- **Resolution**:
  - The API returns `409 Conflict` containing the message `CANNOT_DELETE_REFERENCED_RECORD`.
  - The UI prompts the owner to set the record as `INACTIVE` or hide it from active entry selectors rather than completely destroying historical ledgers.

## 3. Prevent Double Cash Ingestion (Idempotency)
- **Scenario**: An owner repeatedly taps "Thu tiền" on a slow cellular connection.
- **API Guard**: The endpoint `POST /invoices/:id/collect-payment` employs database locks. If the target invoice is already in a `'paid'` status, subsequent collection requests are immediately rejected with `400 Bad Request` containing `INVOICE_ALREADY_PAID`, preventing duplicate transaction entries.
