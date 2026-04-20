# Web Test Matrix (Senior QA)

## Environment

- Build: `dist-local-web`
- Serve: `npm run serve:web:local`
- URL: `http://127.0.0.1:4173`

## Critical flows (P0)

1. App bootstrap
- Step: mo URL, hard refresh.
- Expected: app render khong man trang, khong crash loop.

2. Dashboard + module navigation
- Step: vao Dashboard -> Modules -> quay lai.
- Expected: du lieu hien thi, khong freeze.

3. Wallet + transaction CRUD
- Step: tao wallet, tao transaction, sua, xoa.
- Expected: list cap nhat dung, stats thay doi dung.

4. Rental E2E
- Step: tao room -> tao tenant/contract -> tao invoice -> mark paid.
- Expected: amount, debt, invoice status dung.

5. Trading E2E
- Step: tao item `quantity=0`, rong, >1; update status sold; xoa.
- Expected: fallback quantity dung, khong crash, stats dung.

6. Settings sync/migrate
- Step: run cloud sync/migrate.
- Expected: thong bao tien trinh dung, khong crash.

## High flows (P1)

1. Analytics
- Monthly stats, category breakdown, trend.

2. Bank config + QR data
- Save/update config, reopen screen.

3. Smart batch billing
- Chay batch va verify invoice output.

## Non-functional checks

1. Performance smoke
- First paint < 5s local machine.
- Chuyen man hinh < 1s trong du lieu vua.

2. Console/runtime
- Khong co uncaught error loop.

3. Responsive
- 1366x768, 1920x1080, mobile width.

## Exit criteria

- 0 bug Sev-1/Sev-2 mo.
- Tat ca P0 PASS.
- P1 fail chi duoc phep neu PO/PM chap thuan co dieu kien.
