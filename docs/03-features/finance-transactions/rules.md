# Finance & Cash Flow — Business Rules

## 1. Transaction Integrity Rules
- **Bi-directional Classification**: Every transaction must have an immutable type: `INCOME` (Thu) or `EXPENSE` (Chi).
- **Wallet Association**: Every transaction must be linked to exactly one active Wallet (`wallet_id`). Transactions without a wallet are strictly rejected.
- **Category Requirement**: Every transaction must refer to a Category (`category_id`) to maintain classification and accurate financial dashboards.
- **Negative Values Prohibited**: The transaction `amount` must be a positive decimal number greater than `0`. Direction is controlled entirely by the `type` field.

## 2. Wallet Balance Reconciliation
- **Real-time Synchronization**: The backend enforces automatic wallet reconciliation via database triggers or transactional route blocks:
  - **Create Transaction**:
    - If `type = INCOME`: increment wallet balance (`balance = balance + amount`).
    - If `type = EXPENSE`: decrement wallet balance (`balance = balance - amount`).
  - **Delete Transaction**:
    - If `type = INCOME`: decrement wallet balance (`balance = balance - amount`).
    - If `type = EXPENSE`: increment wallet balance (`balance = balance + amount`).
  - **Update Transaction**:
    - Revert the old transaction amount, then apply the new transaction amount.

## 3. Categories Management
- **Built-in System Categories**: System-defined categories are protected and cannot be deleted or renamed:
  - `INVOICE_PAYMENT` (Thu tiền phòng)
  - `CONTRACT_DEPOSIT` (Thu tiền cọc)
  - `TRADING_REVENUE` (Doanh thu bán hàng)
  - `TRADING_COST` (Chi phí nhập hàng)
- **Custom Categories**: Owners can create, update, and delete custom categories. Custom categories are restricted to the owner's account (`owner_id`).
