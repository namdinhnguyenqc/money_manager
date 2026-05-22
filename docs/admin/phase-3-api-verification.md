# TroCare Admin Portal â€” Phase 3 API Verification

**Phase:** 3 â€” Role & Permission
**NgÃ y verify:** 2026-05-21
**Pháº¡m vi:** API role/permission vÃ  backend guard trÆ°á»›c UI
**Lá»‡nh test:** `npm run admin:test-api`
**Káº¿t quáº£:** Pass

## 1. Seed Ä‘Ã£ thÃªm

Role MVP:

```text
Super Admin
Operation Admin
Read-only Admin
```

Permission MVP:

```text
account.view
account.lock
account.unlock
audit_log.view
admin_user.view
admin_user.create
admin_user.update
admin_user.lock
role.view
role.update
role.assign
owner.view
owner.update
owner.lock
owner.unlock
tenant.view
tenant.update
tenant.lock
tenant.unlock
tenant.view_sensitive
```

## 2. API Ä‘Ã£ triá»ƒn khai

```text
GET   /admin/me/permissions
GET   /admin/admin-users
GET   /admin/roles
GET   /admin/roles/{id}
PATCH /admin/roles/{id}/permissions
```

CÃ¡c API cÅ© Ä‘Ã£ Ä‘Æ°á»£c gáº¯n backend guard:

```text
GET  /admin/accounts                 requires account.view
GET  /admin/accounts/summary         requires account.view
POST /admin/accounts/{id}/lock       requires account.lock
POST /admin/accounts/{id}/unlock     requires account.unlock
GET  /admin/audit-logs               requires audit_log.view
GET  /admin/audit-logs/{id}          requires audit_log.view
GET  /admin/admin-users              requires admin_user.view
GET  /admin/roles                    requires role.view
GET  /admin/roles/{id}               requires role.view
PATCH /admin/roles/{id}/permissions  requires role.update
```

## 3. Test cases Ä‘Ã£ cháº¡y

Test file:

```text
apps/admin-api/test-api.mjs
```

CÃ¡c case Phase 3:

| Test | Expected | Káº¿t quáº£ |
|---|---|---|
| Super Admin gá»i `/admin/me/permissions` | CÃ³ `role.update` | Pass |
| Read-only Admin gá»i `/admin/me/permissions` | KhÃ´ng cÃ³ `account.lock` | Pass |
| Read-only Admin lock account | HTTP 403 | Pass |
| Lock bá»‹ cháº·n tráº£ required permission | `account.lock` | Pass |
| List roles | 3 roles | Pass |
| Role detail Operation Admin | CÃ³ permissions ban Ä‘áº§u | Pass |
| Update role thiáº¿u reason | HTTP 400 | Pass |
| Update role thiáº¿u reason code | `REASON_REQUIRED` | Pass |
| Read-only Admin update role | HTTP 403 | Pass |
| Role update bá»‹ cháº·n tráº£ required permission | `role.update` | Pass |
| Super Admin update role cÃ³ reason | HTTP 200 | Pass |
| Role update lÆ°u permission má»›i | ÄÃºng | Pass |
| Role update ghi audit log | `role.update` | Pass |
| Role update audit risk | `critical` | Pass |
| Filter audit `module=role&action=role.update` | 1 log | Pass |
| List admin users | 3 admins | Pass |

Regression cÃ¡c Phase trÆ°á»›c váº«n pass:

```text
Phase 1 account API
Phase 2 audit log API
```

## 4. Verify expected

Read-only Admin khÃ´ng Ä‘Æ°á»£c khÃ³a account:

```json
{
  "code": "FORBIDDEN",
  "required_permission": "account.lock"
}
```

Read-only Admin khÃ´ng Ä‘Æ°á»£c sá»­a role:

```json
{
  "code": "FORBIDDEN",
  "required_permission": "role.update"
}
```

Role update thÃ nh cÃ´ng pháº£i ghi audit log:

```json
{
  "module": "role",
  "action": "role.update",
  "object_type": "role",
  "risk_level": "critical"
}
```

## 5. Done Criteria Phase 3 API

| Criteria | Káº¿t quáº£ |
|---|---|
| Seed roles MVP | Äáº¡t |
| Seed permissions MVP | Äáº¡t |
| API `/admin/me/permissions` | Äáº¡t |
| API admin users list | Äáº¡t |
| API roles list/detail | Äáº¡t |
| API update role permissions | Äáº¡t |
| Backend guard cho account/audit/role APIs | Äáº¡t |
| Read-only bá»‹ cháº·n action nguy hiá»ƒm | Äáº¡t |
| Role update báº¯t buá»™c reason | Äáº¡t |
| Role update ghi audit critical | Äáº¡t |
| API test pass | Äáº¡t |
| UI Role & Permission Ä‘Ã£ lÃ m chÆ°a | ChÆ°a, Ä‘Ãºng flow |

## 6. Ghi chÃº

Phase 3 hiá»‡n váº«n lÃ  local mock API. Header `x-admin-role` Ä‘Æ°á»£c dÃ¹ng trong test Ä‘á»ƒ mÃ´ phá»ng role hiá»‡n táº¡i:

```text
x-admin-role: Read-only Admin
```

Khi cÃ³ auth tháº­t, pháº§n nÃ y cáº§n thay báº±ng session/JWT actor tháº­t.
