# Trading & Inventory — UI/UX Behaviors

To maintain consistency with the high-end dark/light theme standards, the trading dashboard implements polished visual components.

---

## 1. Senior Trading Analytics Panel
The "Kinh Doanh" tab displays two large, elegant metric cards at the header:

- **Vốn chưa bán (Unsold Capital)**:
  - **Visuals**: Soft primary purple backing gradient card (`#8A3FFC` at `0.1` opacity).
  - **Function**: Shows the sum of `import_price` for all items currently in `'available'` status. Displays total valuation of assets locked in stock.
- **Lợi nhuận thực tế (Realized Profit)**:
  - **Visuals**: Sleek emerald green gradient card (`#24A148` at `0.1` opacity).
  - **Function**: Calculated as `sum(sell_price - import_price)` for all items in `'sold'` status. Highlights physical money earned.

---

## 2. Product Status Grid & Badges
Merchandise is displayed in a responsive grid. Each product card has a status badge:

| Status | Badge Color | Label |
|---|---|---|
| `available` | Soft Blue (`#3B82F6` / `#EFF6FF`) | Còn hàng (In stock) |
| `sold` | Soft Green (`#22C55E` / `#F0FDF4`) | Đã bán (Sold) |

---

## 3. Fast Selling Press Interaction
- **One-tap Sale**: Holding a finger on a product card for 1 second ("Long Press") displays a quick sale popover.
- **Default Fill**: The retail sale input field automatically reads the item's `targetPrice` and fills it into the `sellPrice` input to save the user from manual typing.
