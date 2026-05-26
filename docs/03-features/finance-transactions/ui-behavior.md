# Finance & Cash Flow — UI/UX Behaviors

To maintain a premium, state-of-the-art feel, all financial components adhere to strict visual guidelines.

---

## 1. The Financial Ledger ("Sổ quỹ") List
- **Grouping**: Transactions are grouped chronologically by date headers (e.g., "Hôm nay, 24/05", "Hôm qua, 23/05").
- **Directional Color Indicators**:
  - **INCOME**: Displayed with green text (`#24A148`), prefixed with a plus sign (`+ 5,000,000đ`).
  - **EXPENSE**: Displayed with crimson text (`#FA4B4B`), prefixed with a minus sign (`- 150,000đ`).
- **Icons**: Every transaction card exhibits the category's customized icon (e.g., utility icons for utility expenses, house icons for rent).

---

## 2. Interactive Wallet Cards
- **Visuals**: Wallets are styled as modern gradient cards resembling premium bank credit cards.
- **Swipe Actions**: In the mobile app, swiping right on a wallet card reveals quick actions like "Thống kê" (Analytics) and "Lịch sử" (Ledger).
- **Archived States**: Inactive wallets are rendered with high opacity (`opacity: 0.5`) and an archive badge to clearly demarcate them.

---

## 3. Large Cash Input Fields
- **Keyboard Bounds**: When writing transactional amounts, the mobile application triggers a specialized, clean decimal keypad:
  ```tsx
  <TextInput keyboardType="decimal-pad" ... />
  ```
- **Real-time Formatting**: Values are formatted instantly with thousand separators (e.g., typing `1000000` is displayed as `1.000.000đ` in real time) to avoid fat-finger entry errors.
- **Quick Amount Taps**: The form exhibits quick select chips below the input (e.g., `+100k`, `+500k`, `+1M`, `+5M`) for rapid logging.
