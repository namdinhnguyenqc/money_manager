# Trading & Inventory — Edge Cases

## 1. Legacy Schema Auto-Fallback (Schema Duality)
- **Scenario**: Older database migration instances might not have the refactored columns `import_price`, `import_date`, or `target_price`, and instead use `buy_price`, `buy_date`, and `status = 'holding'`.
- **Backend Guard**: The backend `trading.ts` contains fallback logic. If a query throws a column-missing database error, it automatically falls back to run select queries using the legacy column names and maps the results into the standard response schema using `normalizeTradingItem()`. This guarantees zero crashes during partial rollouts.

## 2. Unpacking Bulk Shipments (Sub-items)
- **Scenario**: An owner imports a box of energy drinks containing 24 cans. If logged as a single item, they cannot track individual can sales.
- **Resolution**: The `POST /items` schema supports a `subItems` array parameter. If supplied:
  - The API splits the overall `importPrice` equally across all elements in the `subItems` array.
  - Generates distinct rows dynamically named `${parentName} - ${subItemName}` so that each can is sold independently.

## 3. Wastage, Spoilage, and Theft
- **Scenario**: A physical inventory count reveals that 2 bottles of water expired or leaked.
- **Rule**: Landlords should **not** hard delete these rows, as doing so would erase the historical wholesale expense and throw off profit calculations.
- **Best Practice**: The landlord updates the item's status to `sold`, sets `sellPrice = 0`, and appends a note: `WASTAGE_SPOILAGE`. This accurately marks the unit as a `100% loss`, reducing the overall `realizedProfit` counter on the senior analytics dashboard.
