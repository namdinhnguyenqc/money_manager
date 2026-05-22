# TroCare Admin Portal â€” Phase 1 API Verification

**Phase:** 1 â€” Chuáº©n hÃ³a Account Status + Lock/Unlock
**NgÃ y verify:** 2026-05-21
**Pháº¡m vi:** API local mock trÆ°á»›c UI
**Lá»‡nh test:** `npm run admin:test-api`
**Káº¿t quáº£:** Pass

## 1. API Ä‘Ã£ triá»ƒn khai

```text
GET  /admin/accounts
GET  /admin/accounts/summary
POST /admin/accounts/{id}/lock
POST /admin/accounts/{id}/unlock
GET  /admin/audit-logs
```

Ghi chÃº:

- ÄÃ¢y lÃ  local mock API Ä‘á»ƒ triá»ƒn khai Ä‘Ãºng thá»© tá»± Phase 1.
- ChÆ°a lÃ m UI.
- ChÆ°a lÃ m permission guard tháº­t vÃ¬ Phase 3 má»›i lÃ  Role & Permission.
- Lock/unlock Ä‘Ã£ cÃ³ placeholder audit log service ná»™i bá»™ Ä‘á»ƒ Phase 2 cÃ³ thá»ƒ nÃ¢ng cáº¥p.

## 2. Seed data expected

Nguá»“n seed: `apps/admin-api/data/seed.json`

Expected summary:

| Chá»‰ sá»‘ | Expected |
|---|---:|
| Tá»•ng account | 9 |
| Admin | 3 |
| Owner | 3 |
| Tenant | 3 |
| Active | 5 |
| Locked | 2 |
| Pending activation | 2 |
| Soft deleted | 0 |

Seed case Ä‘Ã£ cÃ³:

```text
Super Admin active
Operation Admin active
Read-only Admin active
Owner active
Owner locked
Owner pending_activation
Tenant active
Tenant locked
Tenant pending_activation
```

## 3. Test cases Ä‘Ã£ cháº¡y

### Summary

| Test | Expected | Káº¿t quáº£ |
|---|---|---|
| `GET /admin/accounts/summary` | HTTP 200 | Pass |
| Tá»•ng account | 9 | Pass |
| Admin count | 3 | Pass |
| Owner count | 3 | Pass |
| Tenant count | 3 | Pass |
| Active count | 5 | Pass |
| Locked count | 2 | Pass |
| Pending count | 2 | Pass |

### Account List

| Test | Expected | Káº¿t quáº£ |
|---|---|---|
| `GET /admin/accounts?page=1&limit=20` | HTTP 200 | Pass |
| Total list | 9 | Pass |
| `GET /admin/accounts?status=locked` | Chá»‰ tráº£ account locked | Pass |
| Locked total | 2 | Pass |
| `GET /admin/accounts?type=owner` | Chá»‰ tráº£ owner | Pass |
| Owner total | 3 | Pass |
| `GET /admin/accounts?keyword=owner.active` | Tráº£ `owner_active_001` | Pass |

### Lock Account

| Test | Expected | Káº¿t quáº£ |
|---|---|---|
| Lock thiáº¿u reason | HTTP 400 | Pass |
| Lock thiáº¿u reason code | `REASON_REQUIRED` | Pass |
| Lock cÃ³ reason | HTTP 200 | Pass |
| Status sau lock | `locked` | Pass |
| `locked_by` | `admin_super_001` | Pass |
| Audit action | `account.lock` | Pass |
| Audit before status | `active` | Pass |
| Audit after status | `locked` | Pass |

### Unlock Account

| Test | Expected | Káº¿t quáº£ |
|---|---|---|
| Unlock thiáº¿u reason | HTTP 400 | Pass |
| Unlock cÃ³ reason | HTTP 200 | Pass |
| Status sau unlock | `active` | Pass |
| Clear `locked_at` | `null` | Pass |
| Clear `locked_by` | `null` | Pass |
| Audit action | `account.unlock` | Pass |

### Audit Log

| Test | Expected | Káº¿t quáº£ |
|---|---|---|
| `GET /admin/audit-logs` | HTTP 200 | Pass |
| Total audit logs sau lock/unlock | 2 | Pass |
| Latest action | `account.unlock` | Pass |
| Previous action | `account.lock` | Pass |

## 4. Verify expected data

API response Ä‘Ã£ Ä‘Æ°á»£c so sÃ¡nh vá»›i seed/expected báº±ng script:

```text
apps/admin-api/test-api.mjs
```

CÃ¡c verify chÃ­nh:

```text
summary.total = users.length
summary.admin = count(user_type = admin)
summary.owner = count(user_type = owner)
summary.tenant = count(user_type = tenant)
summary.active = count(status = active)
summary.locked = count(status = locked)
summary.pending_activation = count(status = pending_activation)
filter status=locked chá»‰ tráº£ status locked
filter type=owner chá»‰ tráº£ user_type owner
lock yÃªu cáº§u reason
unlock yÃªu cáº§u reason
lock/unlock ghi audit log before/after
```

## 5. Done Criteria Phase 1 API

| Criteria | Káº¿t quáº£ |
|---|---|
| Account status chuáº©n | Äáº¡t |
| Seed/mock data Ä‘á»§ case account status | Äáº¡t |
| Account summary API cháº¡y Ä‘Æ°á»£c | Äáº¡t |
| Account list API cÃ³ search/filter/pagination | Äáº¡t |
| Lock account báº¯t buá»™c reason | Äáº¡t |
| Unlock account báº¯t buá»™c reason | Äáº¡t |
| Lock cáº­p nháº­t `status`, `locked_at`, `locked_by`, `locked_reason` | Äáº¡t |
| Unlock cáº­p nháº­t `status = active` vÃ  clear lock fields | Äáº¡t |
| Audit log placeholder cho lock/unlock | Äáº¡t |
| API test pass | Äáº¡t |
| UI Ä‘Ã£ lÃ m chÆ°a | ChÆ°a, Ä‘Ãºng rule |

## 6. Lá»‡nh sá»­ dá»¥ng

Cháº¡y API local:

```bash
npm run admin:api
```

Cháº¡y test API Phase 1:

```bash
npm run admin:test-api
```

## 7. Ghi chÃº trÆ°á»›c khi lÃ m UI

UI Phase 1 chá»‰ nÃªn báº¯t Ä‘áº§u sau report nÃ y. Khi lÃ m UI cáº§n bÃ¡m Ä‘Ãºng API Ä‘Ã£ pass:

```text
GET /admin/accounts
GET /admin/accounts/summary
POST /admin/accounts/{id}/lock
POST /admin/accounts/{id}/unlock
GET /admin/audit-logs
```

UI báº¯t buá»™c cÃ³:

```text
Status badge
Filter status
Filter type
Search tÃªn/email/phone/id
Pagination
Modal khÃ³a cÃ³ reason
Modal má»Ÿ khÃ³a cÃ³ reason
Loading state
Empty state
Error state
```
