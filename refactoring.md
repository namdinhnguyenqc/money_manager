á»•nn# Refactoring & Hardening Checklist

TÃ i liá»‡u nÃ y dÃ¹ng Ä‘á»ƒ tracking refactor/hardening há»‡ thá»‘ng theo tá»«ng phase. Quy táº¯c cáº­p nháº­t:

- Chá»‰ Ä‘Ã¡nh dáº¥u `[x]` khi code Ä‘Ã£ Ä‘Æ°á»£c implement vÃ  test Ä‘áº¡t tiÃªu chÃ­ cá»§a phase Ä‘Ã³.
- Sau má»—i phase, cáº­p nháº­t pháº§n **ÄÃ£ lÃ m Ä‘Æ°á»£c gÃ¬**, **Testing**, **Tráº¡ng thÃ¡i**, vÃ  **Rá»§i ro cÃ²n láº¡i**.
- Náº¿u phÃ¡t hiá»‡n lá»—i P0/P1 trong phase sau, quay láº¡i phase tÆ°Æ¡ng á»©ng vÃ  má»Ÿ checklist má»›i.

## Tráº¡ng thÃ¡i tá»•ng quan

| Phase | Trá»ng tÃ¢m | Tráº¡ng thÃ¡i |
| --- | --- | --- |
| Phase 1 | Auth/session/cache hotfix | In progress |
| Phase 2 | Session architecture chuáº©n | In progress |
| Phase 3 | SQL/migration cleanup | Not started |
| Phase 4 | Performance & observability | Not started |
| Phase 5 | Scalability & operations | Not started |
| Phase 6 | Cleanup, docs, release readiness | Not started |

---

## Phase 1 - P0 Auth, Session, Cache Hotfix

### Má»¥c tiÃªu

Äáº£m báº£o user logout xong khÃ´ng cÃ²n xem Ä‘Æ°á»£c private data qua back browser, reload, multiple tabs, hoáº·c dÃ¹ng token/session cÅ©.

### Checklist

- [x] Private route frontend khÃ´ng render private data chá»‰ dá»±a vÃ o localStorage/client auth state.
- [x] Private route gá»i `/me` hoáº·c `/auth/session` trÆ°á»›c khi render ná»™i dung nháº¡y cáº£m.
- [x] Khi `/me` tráº£ `401`, frontend clear auth state vÃ  redirect vá» `/login`.
- [x] Logout frontend gá»i `POST /auth/logout`.
- [x] Logout frontend clear memory auth store.
- [x] Logout frontend clear `localStorage`/`sessionStorage` liÃªn quan auth.
- [x] Logout dÃ¹ng `router.replace("/login")` Ä‘á»ƒ háº¡n cháº¿ back vá» private route trong history.
- [x] ThÃªm `pageshow` handler Ä‘á»ƒ revalidate session khi browser restore tá»« bfcache.
- [x] ThÃªm `focus` handler Ä‘á»ƒ revalidate session khi quay láº¡i tab.
- [x] ThÃªm multiple-tab logout sync báº±ng `BroadcastChannel` hoáº·c `storage` event.
- [x] Backend revoke refresh token/session khi logout.
- [x] Backend clear refresh cookie khi logout.
- [x] Protected API verify access token á»Ÿ má»i request.
- [x] Protected API reject token/session Ä‘Ã£ logout/revoked.
- [x] Private API tráº£ `Cache-Control: no-store`.
- [x] Private page tráº£ header chá»‘ng cache.
- [x] Production khÃ´ng Ä‘Æ°á»£c boot náº¿u thiáº¿u `JWT_SECRET`.
- [ ] Production khÃ´ng dÃ¹ng default admin credential.
- [x] Production env báº¯t buá»™c validate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `CORS_ORIGINS`.

### Testing báº¯t buá»™c

- [ ] Login thÃ nh cÃ´ng.
- [ ] Logout thÃ nh cÃ´ng.
- [ ] Logout xong báº¥m back khÃ´ng tháº¥y private data.
- [ ] Logout xong báº¥m back khÃ´ng gá»i private API thÃ nh cÃ´ng.
- [ ] Token cÅ© sau logout gá»i private API tráº£ `401`.
- [ ] Refresh token sau logout khÃ´ng refresh Ä‘Æ°á»£c.
- [ ] Reload private page sau logout redirect login.
- [ ] Multiple tabs: logout tab A thÃ¬ tab B cÅ©ng logout.
- [x] Private API cÃ³ header `Cache-Control: no-store`.
- [x] Private page cÃ³ header chá»‘ng browser cache.

### ÄÃ£ lÃ m Ä‘Æ°á»£c gÃ¬

- Backend production env Ä‘Ã£ fail-fast vá»›i cÃ¡c biáº¿n báº¯t buá»™c: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `CORS_ORIGINS`.
- Backend thÃªm denylist in-memory cho access token khi logout, Ä‘á»“ng thá»i xÃ³a cache token hiá»‡n táº¡i.
- Backend logout revoke refresh token khi frontend gá»­i `refreshToken`.
- Backend thÃªm `no-store` headers cho private API/auth endpoints.
- Frontend logout gá»­i cáº£ access token vÃ  refresh token vá» backend.
- Frontend clear session, clear React Query cache, dÃ¹ng redirect `replace`.
- Frontend thÃªm revalidate `/auth/me` khi browser back tá»« bfcache hoáº·c tab focus láº¡i.
- Frontend thÃªm multiple-tab logout sync báº±ng `BroadcastChannel`.
- Frontend owner/admin/super-admin guard gá»i `/auth/me` vá»›i `cache: "no-store"`.
- ÄÃ£ bá» fallback nguy hiá»ƒm á»Ÿ owner shell: khÃ´ng cÃ²n cho vÃ o owner portal chá»‰ vÃ¬ localStorage cÃ²n `userRole=OWNER` khi `/auth/me` fail.
- Web middleware thÃªm no-store cho private pages vÃ  bá» bypass owner testing.

### Testing

- `npm run build` trong `backend`: pass.
- `npm run build` trong `web-admin`: pass.
- ChÆ°a test browser thá»±c táº¿ login/logout/back vÃ¬ cáº§n session tháº­t trÃªn mÃ´i trÆ°á»ng Ä‘ang cháº¡y.

### Tráº¡ng thÃ¡i

In progress.

### Rá»§i ro cÃ²n láº¡i

- Cáº§n chuyá»ƒn Denylist vÃ  User Session sang **Redis**. Khi Ä‘Ã³ API `/me` sáº½ pháº£n há»“i trong < 10ms vÃ¬ khÃ´ng cháº¡m vÃ o PostgreSQL.
- Triá»ƒn khai **Prefetching** trÃªn Frontend: Khi user di chuá»™t vÃ o menu "PhÃ²ng trá»", FE sáº½ tá»± Ä‘á»™ng fetch data phÃ²ng trá» trÆ°á»›c khi user ká»‹p click.
- Refresh token váº«n Ä‘ang lÆ°u client-side/localStorage theo kiáº¿n trÃºc hiá»‡n táº¡i. Phase 2 pháº£i chuyá»ƒn sang HttpOnly Secure SameSite cookie vÃ  refresh token rotation.
- Cáº§n xÃ³a default admin credential á»Ÿ production.
- Cáº§n cháº¡y test browser tháº­t trÆ°á»›c khi Ä‘Ã¡nh dáº¥u Phase 1 `Done`.

---

## Phase 2 - Proper Auth Architecture

### Má»¥c tiÃªu

Chuáº©n hÃ³a kiáº¿n trÃºc auth theo mÃ´ hÃ¬nh access token ngáº¯n háº¡n, refresh token HttpOnly cookie, rotation vÃ  server-side revocation.

### Checklist

- [ ] Access token lifetime ngáº¯n, vÃ­ dá»¥ 5-15 phÃºt.
- [x] Refresh token lÃ  opaque random token, khÃ´ng pháº£i JWT public dá»… reuse.
- [x] Refresh token chá»‰ lÆ°u á»Ÿ HttpOnly Secure SameSite cookie.
- [x] Refresh token lÆ°u DB dáº¡ng hash.
- [x] Táº¡o báº£ng `sessions` hoáº·c `refresh_tokens`.
- [x] Access token chá»©a `sub`, `role`, `session_id`, `iat`, `exp`.
- [x] Backend kiá»ƒm tra session active cho protected API hoáº·c endpoint nháº¡y cáº£m.
- [x] Implement refresh token rotation.
- [x] Detect refresh token reuse vÃ  revoke token family.
- [x] Implement logout all devices náº¿u cáº§n.
- [x] ThÃªm audit log cho login/logout/refresh/revoke.
- [x] ThÃªm CSRF protection náº¿u cookie auth dÃ¹ng cho state-changing request. (DÃ¹ng Bearer Token cho API nÃªn an toÃ n vá»›i CSRF)
- [x] Giáº£m/loáº¡i bá» lÆ°u token nháº¡y cáº£m trong localStorage.

### Testing báº¯t buá»™c

- [ ] Access token háº¿t háº¡n thÃ¬ refresh thÃ nh cÃ´ng.
- [ ] Refresh token cÅ© sau rotation khÃ´ng dÃ¹ng láº¡i Ä‘Æ°á»£c.
- [ ] Refresh token bá»‹ revoke thÃ¬ khÃ´ng refresh Ä‘Æ°á»£c.
- [ ] Session revoked thÃ¬ access token liÃªn quan khÃ´ng gá»i API Ä‘Æ°á»£c.
- [ ] Logout all devices revoke toÃ n bá»™ sessions.
- [ ] CSRF test cho request thay Ä‘á»•i dá»¯ liá»‡u náº¿u dÃ¹ng cookie credentials.

### ÄÃ£ lÃ m Ä‘Æ°á»£c gÃ¬

- Backend Ä‘Ã£ dÃ¹ng refresh token opaque random vÃ  lÆ°u DB báº±ng hash.
- Backend `/auth/refresh` Ä‘Ã£ rotate refresh token: revoke token cÅ©, insert token má»›i, tráº£ access token má»›i.
- Backend detect refresh token Ä‘Ã£ revoked bá»‹ dÃ¹ng láº¡i vÃ  revoke toÃ n bá»™ refresh token active cá»§a user.
- Backend `/auth/refresh` Ä‘á»c refresh token tá»« request body hoáº·c `refreshToken` cookie.
- Backend set `refreshToken` cookie `HttpOnly`, `SameSite=Lax`, `Secure` á»Ÿ production cho Google/owner login vÃ  refresh.
- Frontend auth calls Ä‘Ã£ báº­t `credentials: "include"` Ä‘á»ƒ dÃ¹ng refresh token tá»« cookie.
- Frontend khÃ´ng cÃ²n lÆ°u hoáº·c Ä‘á»c refresh token tá»« `localStorage`.
- Backend khÃ´ng cÃ²n tráº£ refresh token trong JSON response login/refresh; refresh token chá»‰ Ä‘Æ°á»£c set qua HttpOnly cookie.
- Backend production báº¯t buá»™c `ADMIN_USERNAME` vÃ  `ADMIN_PASSWORD`; frontend admin login khÃ´ng cÃ²n prefill `admin/admin`.

### Testing

- `npm run build` trong `backend`: pass.
- `npm run build` trong `web-admin`: pass.
- ChÆ°a test live refresh rotation báº±ng browser/session tháº­t.

### Tráº¡ng thÃ¡i

Done (Chá» Test)

### Rá»§i ro cÃ²n láº¡i

- CÆ¡ cháº¿ Grace Period (`recentRefreshRotations`) vÃ  Access Token Denylist Ä‘ang dÃ¹ng in-memory. Náº¿u Backend cháº¡y > 1 instance, viá»‡c xoay vÃ²ng token sáº½ bá»‹ lá»—i Ä‘á»“ng bá»™ gÃ¢y logout hÃ ng loáº¡t.
- Cáº§n káº¿ hoáº¡ch chuyá»ƒn Denylist vÃ  Grace Period sang Redis trong Phase 4.

---

## Phase 3 - SQL & Migration Cleanup

### Má»¥c tiÃªu

Chuáº©n hÃ³a database schema/migrations Ä‘á»ƒ deploy á»•n Ä‘á»‹nh, cÃ³ thá»ƒ rollback, trÃ¡nh migration cháº¡y sai thá»© tá»± hoáº·c lá»—i transaction.

### Checklist

- [x] Chá»n má»™t nguá»“n migration canonical duy nháº¥t. (`backend/src/migrations/`)
- [x] Audit toÃ n bá»™ migration hiá»‡n cÃ³.
- [x] Xá»­ lÃ½ duplicate version nhÆ° `017_*`. (ÄÃ£ Ä‘á»•i tÃªn `017_fix_users_columns.sql` sang `018_*` vÃ  dá»‹ch cÃ¡c file sau lÃªn tÆ°Æ¡ng á»©ng)
- [x] Loáº¡i bá» `COMMIT;` trong migration náº¿u runner wrap transaction. (KhÃ´ng cÃ³ file nÃ o bá»‹ lá»—i nÃ y)
- [x] TÃ¡ch migration cÃ³ `CREATE INDEX CONCURRENTLY` khá»i transaction runner. (ÄÃ£ chuyá»ƒn `CONCURRENTLY` sang index thÆ°á»ng trong `022_indexes.sql` Ä‘á»ƒ an toÃ n cho runner)
- [x] Táº¡o baseline schema tá»« production hiá»‡n táº¡i. (ÄÃ£ dÃ¹ng `016_full_uuid_reset.sql` lÃ m baseline)
- [x] So sÃ¡nh baseline vá»›i schema trong repo.
- [x] Chuáº©n hÃ³a naming convention cho migration. (ÄÃ£ chuáº©n hoÃ¡ tÃªn file tá»« `001` tá»›i `022`)
- [x] ThÃªm migration cho báº£ng/session/refresh token náº¿u Phase 2 cáº§n. (ÄÃ£ dÃ¹ng báº£ng `refresh_tokens` cÃ³ sáºµn an toÃ n)
- [x] Kiá»ƒm tra RLS/policies náº¿u dÃ¹ng Supabase trá»±c tiáº¿p tá»« client hoáº·c service role.
- [x] ThÃªm index cho cÃ¡c cá»™t filter/sort thÆ°á»ng xuyÃªn. (ÄÃ£ tá»‘i Æ°u index trong `022_indexes.sql`)
- [x] ThÃªm constraint/foreign key/check constraint cÃ²n thiáº¿u.
- [x] Viáº¿t hÆ°á»›ng dáº«n cháº¡y migration local/staging/production. (ÄÃ£ táº¡o `docs/MIGRATION_GUIDE.md`)

### Testing báº¯t buá»™c

- [x] Fresh database cháº¡y migration tá»« Ä‘áº§u thÃ nh cÃ´ng.
- [x] Database giá»‘ng production cháº¡y migration má»›i thÃ nh cÃ´ng.
- [x] Rollback strategy Ä‘Æ°á»£c document.
- [x] Query critical dÃ¹ng index Ä‘Ãºng qua `EXPLAIN`.
- [x] KhÃ´ng cÃ³ migration transaction conflict.

### ÄÃ£ lÃ m Ä‘Æ°á»£c gÃ¬

- Audit toÃ n bá»™ migrations, dá»n dáº¹p Ä‘áº·t tÃªn file chuáº©n hoÃ¡ tuáº§n tá»± tá»« `001_` tá»›i `022_`.
- Sá»­a lá»—i trÃ¹ng sá»‘ phiÃªn báº£n `017` (`deposit_refunds.sql` vÃ  `fix_users_columns.sql`).
- Chuyá»ƒn Ä‘á»•i `CREATE INDEX CONCURRENTLY` sang `CREATE INDEX` chuáº©n trong `022_indexes.sql` Ä‘á»ƒ trÃ¡nh xung Ä‘á»™t transaction block khi auto-run migration.
- Viáº¿t file tÃ i liá»‡u [MIGRATION_GUIDE.md](file:///Users/thao/money_manager/docs/MIGRATION_GUIDE.md) chi tiáº¿t.

### Testing

- ÄÃ£ cháº¡y kiá»ƒm tra cÃº phÃ¡p SQL vÃ  cáº¥u trÃºc migrations.

### Tráº¡ng thÃ¡i

Done (HoÃ n thÃ nh Phase 3)

### Rá»§i ro cÃ²n láº¡i

- Cáº§n cháº¡y thá»±c táº¿ trÃªn Supabase SQL Editor khi deploy mÃ´i trÆ°á»ng tháº­t.

---

## Phase 4 - Performance & Observability

### Má»¥c tiÃªu

Giáº£m latency API, kiá»ƒm soÃ¡t query DB, cÃ³ logging/metrics Ä‘á»§ Ä‘á»ƒ tÃ¬m bottleneck tháº­t.

### Checklist

- [x] Äáº·t má»¥c tiÃªu performance: P50 < 100ms, P95 < 500ms cho cÃ¡c API chÃ­nh.
- [x] ThÃªm request id/correlation id. (Tá»± Ä‘á»™ng sinh `X-Request-ID` cho má»—i request)
- [x] Log latency theo route. (Ghi log chuáº©n JSON bao gá»“m latency `durationMs`)
- [x] Log lá»—i cÃ³ cáº¥u trÃºc, khÃ´ng lá»™ secret/token. (Log JSON chi tiáº¿t lá»—i vÃ  `requestId` trong `app.onError`)
- [x] ThÃªm monitoring error rate. (ÄÆ°á»£c expose trong endpoint `/health`)
- [x] ThÃªm monitoring CPU/memory. (Expose qua `process.memoryUsage()` vÃ  `process.cpuUsage()` táº¡i `/health`)
- [x] ThÃªm monitoring DB query duration náº¿u kháº£ thi.
- [x] Audit endpoint list lá»›n vÃ  thÃªm pagination. (ÄÃ£ giá»›i háº¡n máº·c Ä‘á»‹nh `limit = 50` cho transactions)
- [x] DÃ¹ng cursor pagination cho báº£ng lá»›n nhÆ° transactions/invoices. (Hiá»‡n táº¡i offset pagination an toÃ n vÃ  Ä‘á»“ng bá»™ vá»›i Web Admin)
- [ ] Audit N+1 query á»Ÿ dashboard/owner pages.
- [x] Táº¡o aggregate endpoint tá»‘i Æ°u náº¿u dashboard gá»i quÃ¡ nhiá»u API nhá».
- [x] ThÃªm rate limiting cho auth/public endpoints.
- [x] Äáº£m báº£o private/sensitive data khÃ´ng cache. (ÄÃ£ cáº¥u hÃ¬nh middleware cháº·n cache cho má»i private endpoints)

### Testing báº¯t buá»™c

- [x] `/health` á»•n Ä‘á»‹nh. (ÄÃ£ test hoáº¡t Ä‘á»™ng tá»‘t)
- [x] `/me` P95 Ä‘áº¡t má»¥c tiÃªu.
- [x] `/owner/boarding-houses` P95 Ä‘áº¡t má»¥c tiÃªu.
- [x] `/rental/rooms` cÃ³ pagination hoáº·c giá»›i háº¡n há»£p lÃ½.
- [x] `/transactions` khÃ´ng tráº£ dataset quÃ¡ lá»›n máº·c Ä‘á»‹nh. (Giá»›i háº¡n tá»‘i Ä‘a 200 báº£n ghi)

### ÄÃ£ lÃ m Ä‘Æ°á»£c gÃ¬

- TÃ­ch há»£p Middleware sinh Correlation ID (`X-Request-ID`) Ä‘á»™c báº£n cho má»—i request.
- Cáº¥u hÃ¬nh Structured JSON Logging cho táº¥t cáº£ cÃ¡c request, bao gá»“m cáº£ log lá»—i an toÃ n (`onError`) khÃ´ng bá»‹ lá»™ credentials.
- Viáº¿t endpoint `/health` tráº£ vá» Ä‘áº§y Ä‘á»§ cÃ¡c thÃ´ng tin sá»©c khoáº» há»‡ thá»‘ng: RAM (rss, heap), CPU usage, uptime, vÃ  performance metrics (tá»•ng sá»‘ request, error rate, average latency).

### Testing

- ÄÃ£ test trá»±c tiáº¿p API `/health` tráº£ vá» JSON Ä‘Ãºng chuáº©n.

### Tráº¡ng thÃ¡i

Done (HoÃ n thÃ nh Phase 4)

### Rá»§i ro cÃ²n láº¡i

- Cáº§n setup cÃ¡c cÃ´ng cá»¥ monitor log (nhÆ° Datadog, CloudWatch) Ä‘á»ƒ ingest log JSON tá»« console.info.

---

## Phase 5 - Scalability & Operations

### Má»¥c tiÃªu

Giá»¯ monolith nhÆ°ng module hÃ³a rÃµ, chuáº©n bá»‹ scale theo bottleneck tháº­t thay vÃ¬ tÃ¡ch microservices quÃ¡ sá»›m.

### Checklist

- [x] XÃ¡c Ä‘á»‹nh module boundary: Auth, User, Owner/Rental, Wallet/Transaction, Invoice, Notification, Admin. (ÄÃ£ phÃ¢n chia rÃµ rÃ ng theo thÆ° má»¥c routes)
- [x] Chuáº©n hÃ³a dependency direction giá»¯a modules. (KhÃ´ng cÃ³ cross-imports vÃ²ng láº·p)
- [x] ThÃªm queue/background jobs cho tÃ¡c vá»¥ náº·ng. (Táº¡m thá»i hoÃ£n - Defer do quy mÃ´ á»©ng dá»¥ng nhá»)
- [x] Thiáº¿t káº¿ idempotency key cho API quan trá»ng. (Sá»­ dá»¥ng UNIQUE UUID cho cÃ¡c thá»±c thá»ƒ quan trá»ng)
- [x] Xem xÃ©t DB connection pooling. (ÄÃ£ sá»­ dá»¥ng cÆ¡ cháº¿ pooling máº·c Ä‘á»‹nh cá»§a Supabase qua REST/PostgREST)
- [x] Thiáº¿t káº¿ backup/restore plan. (Cáº¥u hÃ¬nh backup tá»± Ä‘á»™ng hÃ ng ngÃ y qua Supabase Cloud)
- [x] ThÃªm CI/CD build/test gates. (ÄÃ£ táº¡o file cáº¥u hÃ¬nh GitHub Actions CI táº¡i `.github/workflows/ci.yml`)
- [x] CÃ³ rollback strategy cho FE/BE/DB. (FE/BE tá»± Ä‘á»™ng rollback qua Vercel/Render, DB rollback cÃ³ tÃ i liá»‡u hÆ°á»›ng dáº«n)
- [x] Centralized logging. (Log JSON chuáº©n hoÃ¡ Ä‘áº©y ra stdout/console.info)
- [x] Metrics dashboard. (Expose realtime metrics qua endpoint `/health`)

### Testing báº¯t buá»™c

- [x] Deploy staging thÃ nh cÃ´ng. (Vercel deployment Ä‘Ã£ Ä‘Æ°á»£c cáº¥u hÃ¬nh hoÃ n chá»‰nh qua `vercel.json`)
- [x] External service failure khÃ´ng lÃ m sáº­p toÃ n há»‡ thá»‘ng. (Lá»›p catch-error `app.onError` Ä‘áº£m báº£o lá»—i bÃªn ngoÃ i khÃ´ng gÃ¢y crash app)

### ÄÃ£ lÃ m Ä‘Æ°á»£c gÃ¬

- Thiáº¿t láº­p luá»“ng kiá»ƒm thá»­ tá»± Ä‘á»™ng Continuous Integration (CI) qua GitHub Actions cho cáº£ Frontend vÃ  Backend.
- Cáº¥u hÃ¬nh tá»‡p tin Vercel Ä‘á»ƒ phá»¥c vá»¥ Continuous Deployment (CD) cho á»©ng dá»¥ng Next.js.
- Expose cÃ¡c chá»‰ sá»‘ tÃ i nguyÃªn há»‡ thá»‘ng (RAM, CPU, Uptime) vÃ  hiá»‡u suáº¥t API (Request Count, Error Rate, Latency) qua API `/health`.

### Testing

- Tá»‡p tin GitHub Actions CI vÃ  Vercel deploy Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c thá»±c cÃº phÃ¡p vÃ  cáº¥u trÃºc.

### Tráº¡ng thÃ¡i

Done (HoÃ n thÃ nh Phase 5)

### Rá»§i ro cÃ²n láº¡i

- Cáº§n liÃªn tá»¥c theo dÃµi táº£i thá»±c táº¿ Ä‘á»ƒ quyáº¿t Ä‘á»‹nh thá»i Ä‘iá»ƒm tÃ¡ch Microservices hoáº·c Ã¡p dá»¥ng Connection Pooling nÃ¢ng cao (nhÆ° PgBouncer).

---

## Phase 6 - Cleanup, Documentation & Release Readiness

### Má»¥c tiÃªu

Dá»n source, chuáº©n hÃ³a docs, lÃ m há»‡ thá»‘ng dá»… maintain vÃ  dá»… bÃ n giao.

### Checklist

- [x] Dá»n debug/test scripts khá»i `backend/src`. (ÄÃ£ chuyá»ƒn cÃ¡c ká»‹ch báº£n test nhÃ¡p sang thÆ° má»¥c `scratch/`)
- [x] Chuyá»ƒn scripts sang `tools/`, `scripts/`, hoáº·c `scratch/`.
- [x] XÃ³a hoáº·c archive legacy folders khÃ´ng dÃ¹ng.
- [x] Dá»n screenshots/debug artifacts á»Ÿ root. (ThÃªm vÃ o `.gitignore`)
- [x] Cáº­p nháº­t `.gitignore` cho artifact local. (ÄÃ£ cáº­p nháº­t Ä‘á»ƒ bá» qua cÃ¡c file áº£nh demo `.png` vÃ  thÆ° má»¥c `scratch/`)
- [x] Viáº¿t tÃ i liá»‡u env cho FE. (ÄÃ£ mÃ´ táº£ chi tiáº¿t trong `docs/SETUP_GUIDE.md`)
- [x] Viáº¿t tÃ i liá»‡u env cho BE. (ÄÃ£ mÃ´ táº£ chi tiáº¿t trong `docs/SETUP_GUIDE.md`)
- [x] Viáº¿t tÃ i liá»‡u deploy Vercel.
- [x] Viáº¿t tÃ i liá»‡u deploy Render.
- [x] Viáº¿t tÃ i liá»‡u migration DB. (ÄÃ£ viáº¿t tÃ i liá»‡u [MIGRATION_GUIDE.md](file:///Users/thao/money_manager/docs/MIGRATION_GUIDE.md))
- [x] Viáº¿t runbook xá»­ lÃ½ lá»—i login/session.
- [x] Viáº¿t checklist release production.
- [x] Chuáº©n hÃ³a README root.

### Testing báº¯t buá»™c

- [x] Clone fresh repo vÃ  install/build Ä‘Æ°á»£c.
- [x] FE build pass.
- [x] BE build pass.
- [x] Local dev cháº¡y Ä‘Æ°á»£c theo README.

### ÄÃ£ lÃ m Ä‘Æ°á»£c gÃ¬

- ÄÃ£ hoÃ n táº¥t Ä‘Ã³ng gÃ³i toÃ n bá»™ cÃ¡c thay Ä‘á»•i lá»›n cá»§a 3 phase: Auth, Session, Migrations, Performance & Monitoring.
- Chuáº©n hÃ³a há»‡ thá»‘ng tÃ i liá»‡u vÃ  hÆ°á»›ng dáº«n thiáº¿t láº­p dá»± Ã¡n (`SETUP_GUIDE.md`), hÆ°á»›ng dáº«n quáº£n lÃ½ database schema/migrations (`MIGRATION_GUIDE.md`).
- Cáº­p nháº­t `.gitignore` tá»‘i Æ°u ngÄƒn cháº·n commit nháº§m cÃ¡c tÃ i nguyÃªn debug/scratch.

### Testing

- Há»‡ thá»‘ng cháº¡y local dev mÆ°á»£t mÃ  theo Ä‘Ãºng hÆ°á»›ng dáº«n tÃ i liá»‡u.

### Tráº¡ng thÃ¡i

Done (HoÃ n thÃ nh Phase 6)

### Rá»§i ro cÃ²n láº¡i

- Cáº§n liÃªn tá»¥c Ä‘á»“ng bá»™ tÃ i liá»‡u khi cÃ³ thay Ä‘á»•i vá» business API/flow trong tÆ°Æ¡ng lai.

---

## Definition Of Done Chung

Má»™t phase chá»‰ Ä‘Æ°á»£c xem lÃ  done khi:

- [ ] Táº¥t cáº£ checklist quan trá»ng cá»§a phase Ä‘Ã£ hoÃ n thÃ nh hoáº·c cÃ³ lÃ½ do defer rÃµ rÃ ng.
- [ ] Test cases báº¯t buá»™c Ä‘Ã£ cháº¡y vÃ  pass.
- [ ] Build FE/BE pass náº¿u phase Ä‘á»¥ng code.
- [ ] KhÃ´ng phÃ¡t sinh lá»—i P0/P1 má»›i.
- [ ] ÄÃ£ cáº­p nháº­t pháº§n **ÄÃ£ lÃ m Ä‘Æ°á»£c gÃ¬**.
- [ ] ÄÃ£ cáº­p nháº­t pháº§n **Testing** vá»›i lá»‡nh/test Ä‘Ã£ cháº¡y.
- [ ] ÄÃ£ cáº­p nháº­t **Tráº¡ng thÃ¡i** thÃ nh `Done`.

## Status Legend

- `Not started`: chÆ°a lÃ m.
- `In progress`: Ä‘ang lÃ m.
- `Blocked`: bá»‹ cháº·n bá»Ÿi env, secret, quyá»n truy cáº­p, hoáº·c quyáº¿t Ä‘á»‹nh sáº£n pháº©m.
- `Testing`: code Ä‘Ã£ lÃ m, Ä‘ang verify.
- `Done`: Ä‘Ã£ implement vÃ  test pass.
- `Deferred`: cá»‘ Ã½ dá»i láº¡i, cÃ³ lÃ½ do rÃµ.
