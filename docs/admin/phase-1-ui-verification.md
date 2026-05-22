# TroCare Admin Portal â€” Phase 1 UI Verification

**Phase:** 1 â€” Account Status + Lock/Unlock UI
**NgÃ y verify:** 2026-05-21
**Äiá»u kiá»‡n báº¯t buá»™c trÆ°á»›c UI:** `npm run admin:test-api` pass
**Lá»‡nh UI test:** `npm run admin:test-ui`
**Káº¿t quáº£:** Pass

## 1. UI Ä‘Ã£ triá»ƒn khai

```text
apps/admin-web/index.html
apps/admin-web/styles.css
apps/admin-web/app.js
```

MÃ n hÃ¬nh hiá»‡n cÃ³:

```text
Quáº£n lÃ½ tÃ i khoáº£n
Tá»•ng quan tÃ i khoáº£n
Danh sÃ¡ch tÃ i khoáº£n
Filter/search
Pagination
Modal nháº­p lÃ½ do khÃ³a/má»Ÿ khÃ³a
Audit log gáº§n Ä‘Ã¢y
```

## 2. API UI Ä‘ang dÃ¹ng

UI chá»‰ gá»i cÃ¡c API Phase 1 Ä‘Ã£ verify:

```text
GET  /admin/accounts
GET  /admin/accounts/summary
POST /admin/accounts/{id}/lock
POST /admin/accounts/{id}/unlock
GET  /admin/audit-logs
```

## 3. States Ä‘Ã£ cÃ³

```text
Loading state
Empty state
Error state
Status badge
Pagination disabled state
Modal validation error khi thiáº¿u reason
```

## 4. Test cases Ä‘Ã£ cháº¡y

Test file:

```text
tests/admin-phase-1.spec.ts
```

CÃ¡c case Ä‘Ã£ verify:

| Test | Expected | Káº¿t quáº£ |
|---|---|---|
| Load mÃ n Quáº£n lÃ½ tÃ i khoáº£n | Hiá»ƒn thá»‹ heading | Pass |
| Summary total | 9 | Pass |
| Summary active | 5 | Pass |
| Summary locked | 2 | Pass |
| Filter `status=locked` | 2 dÃ²ng | Pass |
| Filter keyword `owner.active` vá»›i `status=active` | 1 dÃ²ng | Pass |
| Click KhÃ³a | Má»Ÿ modal reason | Pass |
| Submit thiáº¿u reason | Hiá»ƒn thá»‹ lá»—i báº¯t buá»™c nháº­p lÃ½ do | Pass |
| Submit cÃ³ reason | Gá»i API lock thÃ nh cÃ´ng | Pass |
| Sau lock, filter active khÃ´ng cÃ²n record | Hiá»ƒn thá»‹ empty state | Pass |
| Summary active giáº£m | 4 | Pass |
| Summary locked tÄƒng | 3 | Pass |
| Audit log gáº§n Ä‘Ã¢y | CÃ³ `account.lock` | Pass |
| Äá»•i filter sang locked | Tháº¥y account vá»«a khÃ³a | Pass |

## 5. Lá»‡nh verify

Cháº¡y Ä‘Ãºng thá»© tá»±:

```bash
npm run admin:test-api
npm run admin:test-ui
```

Hoáº·c má»™t dÃ²ng PowerShell:

```powershell
npm run admin:test-api; if ($LASTEXITCODE -eq 0) { npm run admin:test-ui }
```

## 6. Káº¿t luáº­n

Phase 1 UI Ä‘Ã£ ná»‘i API tháº­t cá»§a local mock server vÃ  pass test tá»± Ä‘á»™ng. CÃ³ thá»ƒ cháº¡y thá»­ báº±ng:

```bash
npm run admin:api
```

Sau Ä‘Ã³ má»Ÿ:

```text
http://localhost:4100
```

ChÆ°a triá»ƒn khai Role & Permission tháº­t á»Ÿ UI/backend vÃ¬ thuá»™c Phase 3. Phase 1 chá»‰ cÃ³ placeholder Super Admin local theo seed.
