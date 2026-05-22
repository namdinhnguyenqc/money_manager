# TroCare Admin Portal â€” Current State Audit

**Phase:** 0 â€” Audit hiá»‡n tráº¡ng Admin hiá»‡n táº¡i
**NgÃ y audit:** 2026-05-21
**Workspace:** `C:\Users\PC\Documents\Automation Config`
**Káº¿t luáº­n ngáº¯n:** Repository hiá»‡n táº¡i lÃ  project automation Playwright/Synpress cho wallet testing, chÆ°a pháº£i source code Admin Portal TroCare.

## 1. DB hiá»‡n táº¡i

KhÃ´ng tÃ¬m tháº¥y source database, schema, migration hoáº·c ORM trong repository hiá»‡n táº¡i.

ÄÃ£ kiá»ƒm tra cÃ¡c dáº¥u hiá»‡u theo implementation plan:

| Háº¡ng má»¥c | Káº¿t quáº£ |
|---|---|
| Báº£ng `users` | ChÆ°a cÃ³ trong repo |
| Báº£ng `accounts` | ChÆ°a cÃ³ trong repo |
| Báº£ng `admins` / `admin_users` | ChÆ°a cÃ³ trong repo |
| Báº£ng `roles` | ChÆ°a cÃ³ trong repo |
| Báº£ng `permissions` | ChÆ°a cÃ³ trong repo |
| Báº£ng `owners` | ChÆ°a cÃ³ trong repo |
| Báº£ng `tenants` | ChÆ°a cÃ³ trong repo |
| Báº£ng `sessions` | ChÆ°a cÃ³ trong repo |
| Báº£ng `audit_logs` | ChÆ°a cÃ³ trong repo |
| Migration | ChÆ°a cÃ³ trong repo |
| Seed/mock data nghiá»‡p vá»¥ Admin | ChÆ°a cÃ³ trong repo |

CÃ¡c cÃ¢u há»i Phase 0:

| CÃ¢u há»i | Tráº¡ng thÃ¡i |
|---|---|
| Admin vÃ  Owner dÃ¹ng chung báº£ng `users` khÃ´ng? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c vÃ¬ chÆ°a cÃ³ DB/source backend |
| CÃ³ `user_type` khÃ´ng? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| CÃ³ `status` khÃ´ng? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| KhÃ³a tÃ i khoáº£n Ä‘ang dÃ¹ng field gÃ¬? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| Active tÃ i khoáº£n Ä‘ang dÃ¹ng field gÃ¬? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| CÃ³ `last_login_at` chÆ°a? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| CÃ³ `locked_at`, `locked_by`, `locked_reason` chÆ°a? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| CÃ³ `audit_logs` chÆ°a? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| CÃ³ role/permission chÆ°a? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |

## 2. API hiá»‡n táº¡i

KhÃ´ng tÃ¬m tháº¥y backend API Admin Portal trong repository hiá»‡n táº¡i.

CÃ¡c endpoint theo plan chÆ°a cÃ³ source triá»ƒn khai trong repo:

```text
POST /login
GET /admin/accounts
GET /admin/accounts/summary
POST /admin/accounts/{id}/lock
POST /admin/accounts/{id}/active
```

CÃ¡c cÃ¢u há»i Phase 0:

| CÃ¢u há»i | Tráº¡ng thÃ¡i |
|---|---|
| API cÃ³ kiá»ƒm tra role Admin chÆ°a? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c vÃ¬ chÆ°a cÃ³ backend |
| API cÃ³ phÃ¢n biá»‡t Owner/Tenant/Admin chÆ°a? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| API lock cÃ³ yÃªu cáº§u reason khÃ´ng? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| API active cÃ³ audit log khÃ´ng? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| API list account cÃ³ filter khÃ´ng? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |
| API cÃ³ pagination khÃ´ng? | ChÆ°a xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c |

## 3. UI hiá»‡n táº¡i

KhÃ´ng tÃ¬m tháº¥y frontend Admin Portal trong repository hiá»‡n táº¡i.

Repo hiá»‡n táº¡i cÃ³:

```text
dapp/index.html
dapp/server.mjs
tests/example.spec.ts
tests/tbmarket-login.spec.ts
wallet-setup/basic.setup.ts
wallet-setup/playwright.config.ts
```

`dapp/index.html` lÃ  demo dapp Ä‘á»ƒ test MetaMask/Synpress, khÃ´ng pháº£i UI Admin Portal.

CÃ¡c mÃ n hÃ¬nh Phase 0 chÆ°a cÃ³ trong repo:

```text
Login Admin
Account List
Account Summary
Button khÃ³a/active
```

CÃ¡c cÃ¢u há»i Phase 0:

| CÃ¢u há»i | Tráº¡ng thÃ¡i |
|---|---|
| CÃ³ filter/search chÆ°a? | ChÆ°a cÃ³ UI Admin Ä‘á»ƒ kiá»ƒm tra |
| CÃ³ status badge chÆ°a? | ChÆ°a cÃ³ UI Admin Ä‘á»ƒ kiá»ƒm tra |
| CÃ³ modal reason chÆ°a? | ChÆ°a cÃ³ UI Admin Ä‘á»ƒ kiá»ƒm tra |
| CÃ³ loading/empty/error chÆ°a? | ChÆ°a cÃ³ UI Admin Ä‘á»ƒ kiá»ƒm tra |
| CÃ³ phÃ¢n quyá»n button chÆ°a? | ChÆ°a cÃ³ UI Admin Ä‘á»ƒ kiá»ƒm tra |

## 4. TÃ­nh nÄƒng reuse Ä‘Æ°á»£c

CÃ¡c pháº§n cÃ³ thá»ƒ reuse cho QA/e2e sau nÃ y:

| ThÃ nh pháº§n | Reuse Ä‘Æ°á»£c cho Admin khÃ´ng? | Ghi chÃº |
|---|---:|---|
| Playwright config | CÃ³ | CÃ³ thá»ƒ dÃ¹ng lÃ m ná»n e2e test cho Admin UI sau nÃ y |
| Test structure trong `tests/` | CÃ³ má»™t pháº§n | CÃ³ thá»ƒ thÃªm test admin riÃªng khi cÃ³ URL/app |
| npm scripts | CÃ³ má»™t pháº§n | CÃ³ thá»ƒ bá»• sung script `test:admin` sau |
| README setup WSL/Synpress | CÃ³ cho wallet test | KhÃ´ng pháº£i setup Admin Portal |
| Synpress wallet setup | KhÃ´ng trá»±c tiáº¿p | Chá»‰ liÃªn quan flow MetaMask/web3, khÃ´ng pháº£i admin core |
| Demo dapp | KhÃ´ng | Chá»‰ dÃ¹ng test wallet local |

## 5. TÃ­nh nÄƒng cáº§n refactor hoáº·c bá»• sung

VÃ¬ repository hiá»‡n táº¡i chÆ°a cÃ³ Admin Portal source, cÃ¡c viá»‡c cáº§n bá»• sung trÆ°á»›c khi báº¯t Ä‘áº§u Phase 1:

```text
1. XÃ¡c Ä‘á»‹nh source backend Admin Portal náº±m á»Ÿ repo nÃ o.
2. XÃ¡c Ä‘á»‹nh source frontend Admin Portal náº±m á»Ÿ repo nÃ o.
3. Cung cáº¥p thÃ´ng tin DB/ORM/migration tool hiá»‡n Ä‘ang dÃ¹ng.
4. Cung cáº¥p env local/staging Ä‘á»ƒ cháº¡y Admin hiá»‡n táº¡i.
5. Cung cáº¥p tÃ i khoáº£n Super Admin test.
6. XÃ¡c Ä‘á»‹nh API hiá»‡n táº¡i cá»§a account list/lock/active.
```

Náº¿u muá»‘n scaffold Admin Portal má»›i trong chÃ­nh repo nÃ y, cáº§n quyáº¿t Ä‘á»‹nh stack trÆ°á»›c:

```text
Frontend: React/Vite/Next.js?
Backend: Node/Nest/Express hoáº·c framework khÃ¡c?
DB: PostgreSQL/MySQL/MongoDB?
ORM: Prisma/TypeORM/Sequelize?
Auth: JWT/session?
UI library/design system: hiá»‡n cÃ³ hay lÃ m má»›i?
```

## 6. Rá»§i ro hiá»‡n táº¡i

| Rá»§i ro | Má»©c Ä‘á»™ | Ghi chÃº |
|---|---|---|
| KhÃ´ng cÃ³ source Admin trong repo | Blocker | KhÃ´ng thá»ƒ implement Phase 1 tháº­t náº¿u thiáº¿u backend/frontend |
| KhÃ´ng cÃ³ DB schema | Blocker | KhÃ´ng thá»ƒ viáº¿t migration chuáº©n |
| KhÃ´ng cÃ³ API hiá»‡n táº¡i | Blocker | KhÃ´ng thá»ƒ review/reuse lock/active |
| KhÃ´ng cÃ³ UI hiá»‡n táº¡i | Blocker | KhÃ´ng thá»ƒ chá»‰nh Account List/Login hiá»‡n cÃ³ |
| Docs Ä‘Ã£ Ä‘Æ°á»£c lÆ°u nhÆ°ng repo khÃ´ng pháº£i app admin | High | Dá»… nháº§m ráº±ng cÃ³ thá»ƒ code Phase 1 ngay trong repo nÃ y |
| README hiá»‡n mÃ´ táº£ automation wallet | Medium | Cáº§n bá»• sung README Admin náº¿u repo nÃ y trá»Ÿ thÃ nh monorepo/admin app |

## 7. Äá» xuáº¥t nÃ¢ng cáº¥p

### HÆ°á»›ng A â€” DÃ¹ng Ä‘Ãºng repo Admin hiá»‡n cÃ³

Khuyáº¿n nghá»‹ náº¿u Admin Portal Ä‘Ã£ tá»“n táº¡i á»Ÿ repo khÃ¡c.

Viá»‡c cáº§n lÃ m tiáº¿p:

```text
1. Má»Ÿ Ä‘Ãºng repo backend/frontend Admin Portal.
2. Cháº¡y local theo README cá»§a repo Ä‘Ã³.
3. Audit DB/API/UI theo Phase 0.
4. Cáº­p nháº­t láº¡i file nÃ y báº±ng thÃ´ng tin tháº­t.
5. Sau Ä‘Ã³ má»›i báº¯t Ä‘áº§u Phase 1: Account Status + Lock/Unlock.
```

### HÆ°á»›ng B â€” Scaffold Admin Portal má»›i trong repo nÃ y

Chá»‰ chá»n náº¿u muá»‘n táº¡o Admin Portal má»›i tá»« Ä‘áº§u trong workspace hiá»‡n táº¡i.

Äá» xuáº¥t cáº¥u trÃºc:

```text
apps/admin-web
apps/admin-api
packages/shared
docs/admin
tests/admin-e2e
```

Luá»“ng lÃ m tiáº¿p:

```text
1. Chá»‘t stack.
2. Táº¡o app backend + frontend.
3. Thiáº¿t káº¿ DB schema ná»n: users, roles, permissions, role_permissions, audit_logs.
4. Seed Super Admin.
5. Implement Phase 1 theo plan.
```

## 8. Phase 0 Done Criteria

| Criteria | Káº¿t quáº£ |
|---|---|
| Biáº¿t rÃµ account hiá»‡n táº¡i lÆ°u á»Ÿ báº£ng nÃ o | ChÆ°a Ä‘áº¡t, thiáº¿u DB/source backend |
| Biáº¿t lock/active hiá»‡n táº¡i xá»­ lÃ½ báº±ng field nÃ o | ChÆ°a Ä‘áº¡t, thiáº¿u DB/source backend |
| Biáº¿t cÃ³ cáº§n migrate status khÃ´ng | ChÆ°a Ä‘áº¡t, thiáº¿u DB/source backend |
| Biáº¿t API hiá»‡n táº¡i reuse Ä‘Æ°á»£c bao nhiÃªu % | ChÆ°a Ä‘áº¡t, thiáº¿u API source |
| Biáº¿t UI cáº§n chá»‰nh gÃ¬ | ChÆ°a Ä‘áº¡t, thiáº¿u UI source |
| CÃ³ file `admin-current-state.md` | Äáº¡t |

## 9. Káº¿t luáº­n Phase 0

KhÃ´ng nÃªn báº¯t Ä‘áº§u implement Phase 1 trong repository hiá»‡n táº¡i náº¿u má»¥c tiÃªu lÃ  chá»‰nh Admin Portal Ä‘ang cÃ³, vÃ¬ repo nÃ y chÆ°a chá»©a code Admin Portal.

BÆ°á»›c Ä‘Ãºng tiáº¿p theo lÃ  má»Ÿ Ä‘Ãºng repo/source Admin hiá»‡n táº¡i hoáº·c quyáº¿t Ä‘á»‹nh scaffold Admin Portal má»›i trong workspace nÃ y. Sau khi cÃ³ source tháº­t, Phase 0 cáº§n Ä‘Æ°á»£c cháº¡y láº¡i Ä‘á»ƒ tráº£ lá»i chÃ­nh xÃ¡c DB/API/UI hiá»‡n táº¡i trÆ°á»›c khi viáº¿t migration/API/UI cho Phase 1.
