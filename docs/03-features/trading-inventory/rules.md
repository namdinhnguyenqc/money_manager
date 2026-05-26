# Trading & Inventory — Business Rules

To keep cash books aligned with physical items, trading updates have strict coupling requirements.

## 1. Double-Entry Invariance
- **Import Expense Coupling**: Creating merchandise via `POST /trading/items` **must** trigger a matching Transaction of type `EXPENSE` in the associated wallet. This ensures that cash outflow is logged immediately when stock is purchased.
- **Sales Revenue Coupling**: Selling merchandise (transitioning status from `available` to `sold`) **must** trigger a matching Transaction of type `INCOME` in the selected payment wallet, matching the `sellPrice` parameter.

## 2. Unit Cost Fractional Splits
- If stock is imported with a bulk `quantity` of `N` and total `importPrice` of `P`, the backend inserts `N` independent rows into the database.
- Each row is assigned a unit price of `P / N`.
- Similarly, target selling price is split as `targetPrice / N`.
- This ensures that if the landlord sells items one by one, each sale is compared against the exact fraction of capital it cost, preserving accurate profit calculations.

## 3. Batch Boundaries
- Bulk creations (where `quantity > 1`) are stamped with a unique `batch_id` UUID.
- The stats endpoints use `batch_id` to aggregate how many units of a specific shipment remain unsold, helping the owner identify slow-moving stock.
