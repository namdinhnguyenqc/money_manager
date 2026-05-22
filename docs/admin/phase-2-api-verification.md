# TroCare Admin Portal â€” Phase 2 API Verification

**Phase:** 2 â€” Audit Log ná»n táº£ng
**NgÃ y verify:** 2026-05-21
**Pháº¡m vi:** API audit log trÆ°á»›c UI
**Lá»‡nh test:** `npm run admin:test-api`
**Káº¿t quáº£:** Pass

## 1. API Ä‘Ã£ triá»ƒn khai

```text
GET /admin/audit-logs
GET /admin/audit-logs/{id}
```

Audit log hiá»‡n Ä‘Æ°á»£c táº¡o bá»Ÿi cÃ¡c action Phase 1:

```text
POST /admin/accounts/{id}/lock
POST /admin/accounts/{id}/unlock
```

## 2. Fields audit log hiá»‡n cÃ³

```text
id
actor_id
actor_name
actor_role
module
action
object_type
object_id
before_value
after_value
reason
risk_level
ip_address
user_agent
created_at
```

## 3. Query filter Ä‘Ã£ há»— trá»£

```text
actor_id
module
action
risk_level
object_type
object_id
created_from
created_to
page
limit
```

## 4. Test cases Ä‘Ã£ cháº¡y

Test file:

```text
apps/admin-api/test-api.mjs
```

CÃ¡c case Phase 2 Ä‘Ã£ verify:

| Test | Expected | Káº¿t quáº£ |
|---|---|---|
| Lock account | Táº¡o `account.lock` audit log | Pass |
| Unlock account | Táº¡o `account.unlock` audit log | Pass |
| List audit logs | HTTP 200 | Pass |
| Total audit logs sau lock/unlock | 2 | Pass |
| Latest audit action | `account.unlock` | Pass |
| Previous audit action | `account.lock` | Pass |
| Filter `module=account` | 2 logs | Pass |
| Filter `action=account.lock` | 1 log | Pass |
| Filter `risk_level=high` | 2 logs | Pass |
| Filter `object_type=user&object_id=owner_active_001` | 2 logs | Pass |
| Detail audit log theo id | HTTP 200 | Pass |
| Detail cÃ³ `before_value` | CÃ³ | Pass |
| Detail cÃ³ `after_value` | CÃ³ | Pass |
| Detail id khÃ´ng tá»“n táº¡i | HTTP 404 | Pass |

## 5. Verify expected data

VÃ­ dá»¥ log lock pháº£i cÃ³:

```json
{
  "module": "account",
  "action": "account.lock",
  "object_type": "user",
  "object_id": "owner_active_001",
  "before_value": {
    "status": "active"
  },
  "after_value": {
    "status": "locked"
  },
  "reason": "Kiá»ƒm thá»­ khÃ³a tÃ i khoáº£n Phase 1",
  "risk_level": "high"
}
```

VÃ­ dá»¥ log unlock pháº£i cÃ³:

```json
{
  "module": "account",
  "action": "account.unlock",
  "object_type": "user",
  "object_id": "owner_active_001",
  "before_value": {
    "status": "locked"
  },
  "after_value": {
    "status": "active"
  },
  "reason": "Kiá»ƒm thá»­ má»Ÿ khÃ³a tÃ i khoáº£n Phase 1",
  "risk_level": "high"
}
```

## 6. Done Criteria Phase 2 API

| Criteria | Káº¿t quáº£ |
|---|---|
| Audit log table/schema draft cÃ³ Ä‘á»§ fields | Äáº¡t |
| Lock/unlock ghi audit log | Äáº¡t |
| Log cÃ³ actor/module/action/object/before/after/reason/risk | Äáº¡t |
| API list audit logs cháº¡y Ä‘Æ°á»£c | Äáº¡t |
| API detail audit log cháº¡y Ä‘Æ°á»£c | Äáº¡t |
| API filter theo module/action/risk/object cháº¡y Ä‘Æ°á»£c | Äáº¡t |
| KhÃ´ng cÃ³ API update/delete audit log | Äáº¡t |
| API test pass | Äáº¡t |
| UI Audit Log Ä‘Ã£ lÃ m chÆ°a | ChÆ°a, Ä‘Ãºng flow |

## 7. Ghi chÃº

ÄÃ¢y váº«n lÃ  local mock API vÃ¬ workspace hiá»‡n chÆ°a cÃ³ DB tháº­t/ORM/migration runner. Khi cÃ³ backend tháº­t, cáº§n chuyá»ƒn schema draft sang migration tháº­t vÃ  giá»¯ nguyÃªn test expectations á»Ÿ tÃ i liá»‡u nÃ y.
