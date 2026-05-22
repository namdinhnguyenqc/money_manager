# TroCare Admin Portal â€” Implementation Plan theo tá»«ng Phase

**PhiÃªn báº£n:** 1.0
**Vai trÃ² tÃ i liá»‡u:** Senior BA / PM / Delivery Plan
**Pháº¡m vi:** LÃªn káº¿ hoáº¡ch triá»ƒn khai Admin Portal TroCare theo tá»«ng phase, tá»« DB â†’ API â†’ Test â†’ Verify Data â†’ UI â†’ UAT
**Hiá»‡n tráº¡ng Ä‘Ã£ cÃ³:** Admin Ä‘Ã£ login báº±ng tÃ i khoáº£n, xem Ä‘Æ°á»£c danh sÃ¡ch/sá»‘ lÆ°á»£ng tÃ i khoáº£n, khÃ³a/active tÃ i khoáº£n cÆ¡ báº£n.

---

## 0. Má»¥c tiÃªu tÃ i liá»‡u

TÃ i liá»‡u nÃ y dÃ¹ng Ä‘á»ƒ hÆ°á»›ng dáº«n team triá»ƒn khai Admin Portal theo thá»© tá»± Ä‘Ãºng, trÃ¡nh lÃ m UI trÆ°á»›c rá»“i phÃ¡t hiá»‡n thiáº¿u DB/API/permission/audit.

Má»—i phase pháº£i Ä‘i theo nguyÃªn táº¯c:

```text
1. Chá»‘t nghiá»‡p vá»¥
2. Chá»‘t DB schema
3. Viáº¿t migration
4. Seed/mock data
5. Viáº¿t API
6. Test API
7. So sÃ¡nh dá»¯ liá»‡u API vá»›i DB/expected
8. Viáº¿t UI
9. Connect UI vá»›i API
10. Test UI
11. Test permission
12. Test audit log
13. UAT
14. Fix bug
15. Merge/deploy
```

---

## 1. NguyÃªn táº¯c triá»ƒn khai chung

### 1.1 KhÃ´ng lÃ m UI trÆ°á»›c khi API vÃ  dá»¯ liá»‡u chÆ°a Ä‘Ãºng

Admin Portal phá»¥ thuá»™c ráº¥t nhiá»u vÃ o:

- Tráº¡ng thÃ¡i tÃ i khoáº£n.
- Quyá»n Admin.
- Dá»¯ liá»‡u liÃªn káº¿t Owner â†’ CÆ¡ sá»Ÿ â†’ PhÃ²ng â†’ KhÃ¡ch thuÃª â†’ Há»£p Ä‘á»“ng â†’ HÃ³a Ä‘Æ¡n.
- Audit log.
- Filter, count, aggregate.

VÃ¬ váº­y má»—i module pháº£i Ä‘i theo flow:

```mermaid
flowchart LR
    A[Business Rule] --> B[DB Schema]
    B --> C[Migration]
    C --> D[Seed Data]
    D --> E[API]
    E --> F[Test API]
    F --> G[Verify Expected Data]
    G --> H[UI]
    H --> I[UI Test]
    I --> J[UAT]
    J --> K[Merge/Deploy]
```

### 1.2 Checklist báº¯t buá»™c trÆ°á»›c khi qua phase tiáº¿p theo

Má»™t phase chá»‰ Ä‘Æ°á»£c xem lÃ  xong khi pass checklist:

```text
- DB migration cháº¡y thÃ nh cÃ´ng
- Seed/mock data Ä‘á»§ case
- API cháº¡y Ä‘Æ°á»£c
- API cÃ³ permission guard náº¿u cáº§n
- API test báº±ng Postman/Swagger pass
- Response API so sÃ¡nh vá»›i DB Ä‘Ãºng
- Action nguy hiá»ƒm cÃ³ modal/reason náº¿u cÃ³ UI
- Audit log ghi Ä‘Ãºng náº¿u action quan trá»ng
- UI connect API tháº­t
- UI cÃ³ loading/empty/error state
- QA test case pass
- KhÃ´ng cÃ²n bug blocker
```

### 1.3 Definition of Done cho tá»«ng module

Má»™t module Admin Ä‘Æ°á»£c xem lÃ  hoÃ n thÃ nh khi cÃ³ Ä‘á»§:

```text
- List screen
- Detail screen náº¿u module cáº§n detail
- Search/filter/sort/pagination
- Create/update/action theo quyá»n
- Permission guard á»Ÿ backend
- Permission rendering á»Ÿ frontend
- Modal xÃ¡c nháº­n cho action nguy hiá»ƒm
- Audit log cho action quan trá»ng
- Validation dá»¯ liá»‡u
- API test pass
- UI test pass
- UAT pass
```

---

## 2. Roadmap tá»•ng thá»ƒ

```text
Phase 0: Audit hiá»‡n tráº¡ng Admin hiá»‡n táº¡i
Phase 1: Chuáº©n hÃ³a Account Status + Lock/Unlock
Phase 2: Audit Log ná»n táº£ng
Phase 3: Role & Permission
Phase 4: Owner Management
Phase 5: Tenant Management
Phase 6: Property & Room Management
Phase 7: Contract Management
Phase 8: Invoice / Payment Management
Phase 9: Dashboard nÃ¢ng cáº¥p
Phase 10: Reports váº­n hÃ nh
Phase 11: System Config
Phase 12: System Notification
Phase 13: Hardening, QA Regression, Deploy
```

---

## Security Gate Truoc UI Admin

Truoc khi mo rong UI Admin, team phai bam theo checklist trong `admin-access-security-research.md`.
Permission key va API/UI mapping dung contract trong `admin-permission-contract.md`.

```text
- URL /admin khong phai lop bao mat chinh
- UI an route/nut khong thay the backend authorization
- Moi Admin API moi phai co auth + admin guard
- Action nhay cam can permission, reason va audit log khi format permission da chot
- Production can chot MFA cho tai khoan dac quyen va lop truy cap rieng cho Admin Portal
```

# Phase 0 â€” Audit hiá»‡n tráº¡ng Admin hiá»‡n táº¡i

## 0.1 Má»¥c tiÃªu

XÃ¡c Ä‘á»‹nh há»‡ thá»‘ng hiá»‡n táº¡i cÃ³ gÃ¬, thiáº¿u gÃ¬, reuse Ä‘Æ°á»£c gÃ¬.

Hiá»‡n táº¡i Ä‘Ã£ cÃ³:

```text
- Admin login báº±ng tÃ i khoáº£n
- Xem sá»‘ lÆ°á»£ng tÃ i khoáº£n
- Xem danh sÃ¡ch tÃ i khoáº£n
- KhÃ³a / active tÃ i khoáº£n
```

Phase nÃ y khÃ´ng code tÃ­nh nÄƒng má»›i lá»›n, chá»‰ review vÃ  ghi nháº­n hiá»‡n tráº¡ng.

---

## 0.2 Viá»‡c cáº§n lÃ m

### A. Review DB hiá»‡n táº¡i

Kiá»ƒm tra cÃ¡c báº£ng hiá»‡n cÃ³:

```text
users
accounts
admins
roles
permissions
owners
tenants
sessions
```

Cáº§n tráº£ lá»i:

```text
- Admin vÃ  Owner dÃ¹ng chung báº£ng users khÃ´ng?
- CÃ³ user_type khÃ´ng?
- CÃ³ status khÃ´ng?
- KhÃ³a tÃ i khoáº£n Ä‘ang dÃ¹ng field gÃ¬?
- Active tÃ i khoáº£n Ä‘ang dÃ¹ng field gÃ¬?
- CÃ³ last_login_at chÆ°a?
- CÃ³ locked_at, locked_by, locked_reason chÆ°a?
- CÃ³ audit_logs chÆ°a?
- CÃ³ role/permission chÆ°a?
```

### B. Review API hiá»‡n táº¡i

Liá»‡t kÃª API Ä‘ang cÃ³:

```text
POST /login
GET /admin/accounts
GET /admin/accounts/summary
POST /admin/accounts/{id}/lock
POST /admin/accounts/{id}/active
```

Cáº§n kiá»ƒm tra:

```text
- API cÃ³ kiá»ƒm tra role Admin chÆ°a?
- API cÃ³ phÃ¢n biá»‡t Owner/Tenant/Admin chÆ°a?
- API lock cÃ³ yÃªu cáº§u reason khÃ´ng?
- API active cÃ³ audit log khÃ´ng?
- API list account cÃ³ filter khÃ´ng?
- API cÃ³ pagination khÃ´ng?
```

### C. Review UI hiá»‡n táº¡i

Kiá»ƒm tra mÃ n hÃ¬nh:

```text
- Login Admin
- Account List
- Account Summary
- Button khÃ³a/active
```

Cáº§n kiá»ƒm tra:

```text
- CÃ³ filter/search chÆ°a?
- CÃ³ status badge chÆ°a?
- CÃ³ modal reason chÆ°a?
- CÃ³ loading/empty/error chÆ°a?
- CÃ³ phÃ¢n quyá»n button chÆ°a?
```

---

## 0.3 Output cáº§n cÃ³

Táº¡o tÃ i liá»‡u review ná»™i bá»™:

```text
admin-current-state.md
```

Ná»™i dung:

```text
1. DB hiá»‡n táº¡i
2. API hiá»‡n táº¡i
3. UI hiá»‡n táº¡i
4. TÃ­nh nÄƒng reuse Ä‘Æ°á»£c
5. TÃ­nh nÄƒng cáº§n refactor
6. Rá»§i ro hiá»‡n táº¡i
7. Äá» xuáº¥t nÃ¢ng cáº¥p
```

---

## 0.4 Done Criteria

```text
- Biáº¿t rÃµ account hiá»‡n táº¡i lÆ°u á»Ÿ báº£ng nÃ o
- Biáº¿t lock/active hiá»‡n táº¡i xá»­ lÃ½ báº±ng field nÃ o
- Biáº¿t cÃ³ cáº§n migrate status khÃ´ng
- Biáº¿t API hiá»‡n táº¡i reuse Ä‘Æ°á»£c bao nhiÃªu %
- Biáº¿t UI cáº§n chá»‰nh gÃ¬
- CÃ³ file admin-current-state.md
```

---

# Phase 1 â€” Chuáº©n hÃ³a Account Status + Lock/Unlock

## 1.1 Má»¥c tiÃªu

Chuáº©n hÃ³a pháº§n Admin hiá»‡n táº¡i Ä‘Ã£ cÃ³: login, list account, khÃ³a/active tÃ i khoáº£n.

KhÃ´ng má»Ÿ rá»™ng Owner/Tenant ngay. LÃ m cháº¯c account status trÆ°á»›c.

---

## 1.2 Business Rules

### Status chuáº©n

DÃ¹ng má»™t field chÃ­nh:

```text
status
```

GiÃ¡ trá»‹:

```text
pending_activation
active
locked
soft_deleted
```

KhÃ´ng dÃ¹ng láº«n lá»™n nhiá»u field nhÆ°:

```text
is_active
is_locked
status
```

### Login rule

```text
status = active             â†’ Ä‘Æ°á»£c login
status = pending_activation â†’ chÆ°a Ä‘Æ°á»£c login hoáº·c cáº§n kÃ­ch hoáº¡t
status = locked             â†’ khÃ´ng Ä‘Æ°á»£c login
status = soft_deleted       â†’ khÃ´ng Ä‘Æ°á»£c login
```

### Lock rule

```text
- Admin pháº£i cÃ³ quyá»n lock account
- Báº¯t buá»™c nháº­p lÃ½ do
- status chuyá»ƒn sang locked
- LÆ°u locked_at
- LÆ°u locked_by
- LÆ°u locked_reason
- Revoke session hiá»‡n táº¡i cá»§a user náº¿u Ä‘ang login
- Ghi audit log
```

### Unlock rule

```text
- Admin pháº£i cÃ³ quyá»n unlock account
- Báº¯t buá»™c nháº­p lÃ½ do
- status chuyá»ƒn sang active
- CÃ³ thá»ƒ lÆ°u unlocked_at/unlocked_by/unlocked_reason náº¿u cáº§n
- Ghi audit log
```

---

## 1.3 DB cáº§n lÃ m

Náº¿u Ä‘ang dÃ¹ng báº£ng `users`, thÃªm/chá»‰nh:

```sql
status varchar(30) not null default 'active';
last_login_at timestamp null;
locked_at timestamp null;
locked_by uuid null;
locked_reason text null;
deleted_at timestamp null;
created_at timestamp not null;
updated_at timestamp not null;
```

Index cáº§n cÃ³:

```sql
index users_status_idx(status);
index users_user_type_idx(user_type);
index users_created_at_idx(created_at);
index users_last_login_at_idx(last_login_at);
```

Náº¿u Ä‘Ã£ cÃ³ `is_active`, `is_locked`, migration cáº§n backfill:

```text
is_locked = true                            â†’ status = locked
is_active = true and is_locked = false      â†’ status = active
is_active = false and is_locked = false     â†’ status = pending_activation hoáº·c soft_deleted tÃ¹y dá»¯ liá»‡u
```

---

## 1.4 Migration

Táº¡o migration:

```text
YYYYMMDDHHMM_update_user_status_fields
```

Migration gá»“m:

```text
- Add status náº¿u chÆ°a cÃ³
- Add last_login_at
- Add locked_at
- Add locked_by
- Add locked_reason
- Add deleted_at náº¿u chÆ°a cÃ³
- Backfill dá»¯ liá»‡u cÅ©
- Add indexes
```

---

## 1.5 Seed data

Táº¡o seed Ä‘á»§ case:

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

---

## 1.6 API cáº§n cÃ³

```text
POST /admin/auth/login
POST /admin/auth/logout
GET  /admin/accounts
GET  /admin/accounts/summary
POST /admin/accounts/{id}/lock
POST /admin/accounts/{id}/unlock
```

### Query cho GET /admin/accounts

```text
keyword
type = admin | owner | tenant
status = pending_activation | active | locked | soft_deleted
created_from
created_to
last_login_from
last_login_to
page
limit
sort_by
sort_order
```

### Body lock

```json
{
  "reason": "TÃ i khoáº£n vi pháº¡m quy Ä‘á»‹nh sá»­ dá»¥ng"
}
```

### Body unlock

```json
{
  "reason": "ÄÃ£ kiá»ƒm tra vÃ  cho phÃ©p sá»­ dá»¥ng láº¡i"
}
```

---

## 1.7 Test API

Test báº±ng Postman/Swagger.

### Login

```text
1. Admin active login â†’ success
2. Admin locked login â†’ fail
3. Owner locked login â†’ fail
4. Tenant locked login â†’ fail
5. Login thÃ nh cÃ´ng cáº­p nháº­t last_login_at
```

### Account List

```text
1. GET accounts khÃ´ng filter â†’ tráº£ Ä‘Ãºng total
2. Filter status=locked â†’ chá»‰ locked
3. Filter type=owner â†’ chá»‰ owner
4. Search email â†’ Ä‘Ãºng record
5. Pagination page/limit Ä‘Ãºng
```

### Lock/Unlock

```text
1. Lock account khÃ´ng reason â†’ fail
2. Lock account cÃ³ reason â†’ success
3. Sau lock, status = locked
4. User bá»‹ locked login láº¡i â†’ fail
5. Unlock khÃ´ng reason â†’ fail
6. Unlock cÃ³ reason â†’ success
7. Sau unlock, status = active
```

---

## 1.8 Verify dá»¯ liá»‡u expected

Sau lock, check DB:

```text
status = locked
locked_reason cÃ³ dá»¯ liá»‡u
locked_by = admin_id
locked_at != null
```

Sau unlock:

```text
status = active
```

Náº¿u Ä‘Ã£ cÃ³ audit log phase 2 thÃ¬ check:

```text
action = account.lock / account.unlock
object_id = account_id
reason Ä‘Ãºng
before/after Ä‘Ãºng
```

Náº¿u phase 2 chÆ°a lÃ m audit log, táº¡o placeholder service Ä‘á»ƒ phase 2 gáº¯n vÃ o.

---

## 1.9 UI cáº§n lÃ m

Cáº­p nháº­t mÃ n hÃ¬nh account hiá»‡n táº¡i:

```text
- Status badge
- Filter status
- Filter type
- Search tÃªn/email/phone
- Pagination
- Modal khÃ³a cÃ³ reason
- Modal má»Ÿ khÃ³a cÃ³ reason
- Loading state
- Empty state
- Error state
```

---

## 1.10 Done Criteria

```text
- Login respect status
- Account list filter Ä‘Ãºng
- Lock/unlock báº¯t buá»™c reason
- DB update Ä‘Ãºng
- API test pass
- UI thao tÃ¡c Ä‘Ãºng
- KhÃ´ng phÃ¡t sinh bug blocker
```

---

# Phase 2 â€” Audit Log ná»n táº£ng

## 2.1 Má»¥c tiÃªu

Ghi nháº­n má»i hÃ nh Ä‘á»™ng quan trá»ng. Phase nÃ y nÃªn lÃ m sá»›m vÃ¬ cÃ¡c phase sau cÃ ng nhiá»u action nguy hiá»ƒm.

---

## 2.2 Business Rules

Audit Log pháº£i tráº£ lá»i Ä‘Æ°á»£c:

```text
Ai lÃ m?
LÃ m hÃ nh Ä‘á»™ng gÃ¬?
LÃ m trÃªn module nÃ o?
TÃ¡c Ä‘á»™ng object nÃ o?
GiÃ¡ trá»‹ trÆ°á»›c/sau lÃ  gÃ¬?
LÃ½ do lÃ  gÃ¬?
IP/user agent nÃ o?
Thá»i Ä‘iá»ƒm nÃ o?
```

Audit log khÃ´ng Ä‘Æ°á»£c sá»­a/xÃ³a tá»« UI.

---

## 2.3 DB

Táº¡o báº£ng:

```text
audit_logs
```

Fields:

```text
id
actor_id
actor_name
actor_role
module
action
object_type
object_id
before_value json
after_value json
reason text
risk_level
ip_address
user_agent
created_at
```

Index:

```text
actor_id
module
action
object_type
object_id
risk_level
created_at
```

---

## 2.4 Migration

```text
YYYYMMDDHHMM_create_audit_logs_table
```

---

## 2.5 Service

Táº¡o service dÃ¹ng chung:

```text
AuditLogService.create({
  actor,
  module,
  action,
  objectType,
  objectId,
  beforeValue,
  afterValue,
  reason,
  riskLevel,
  requestMeta
})
```

KhÃ´ng ghi audit log ráº£i rÃ¡c trong tá»«ng controller. Controller gá»i service.

---

## 2.6 Gáº¯n audit vÃ o action hiá»‡n táº¡i

Gáº¯n cho:

```text
admin.login.success
admin.login.failed
admin.logout
account.lock
account.unlock
account.update
```

Risk level:

```text
login.success = low
login.failed = medium
account.update = medium
account.lock = high
account.unlock = high
```

---

## 2.7 API

```text
GET /admin/audit-logs
GET /admin/audit-logs/{id}
```

Query:

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

---

## 2.8 Test API

```text
1. Lock account â†’ táº¡o audit log account.lock
2. Unlock account â†’ táº¡o audit log account.unlock
3. Login failed â†’ táº¡o audit log admin.login.failed
4. GET audit logs filter module=account â†’ Ä‘Ãºng
5. GET audit log detail â†’ cÃ³ before/after/reason
6. Audit log khÃ´ng cÃ³ API update/delete
```

---

## 2.9 Verify expected

VÃ­ dá»¥ lock account pháº£i cÃ³ log:

```json
{
  "module": "account",
  "action": "account.lock",
  "object_type": "user",
  "object_id": "USER_ID",
  "before_value": {
    "status": "active"
  },
  "after_value": {
    "status": "locked"
  },
  "reason": "TÃ i khoáº£n vi pháº¡m quy Ä‘á»‹nh",
  "risk_level": "high"
}
```

---

## 2.10 UI

MÃ n hÃ¬nh Audit Log:

```text
- Table logs
- Filter actor/module/action/risk/time
- Detail drawer/modal
- Hiá»ƒn thá»‹ before/after JSON
- KhÃ´ng cÃ³ edit/delete action
```

---

## 2.11 Done Criteria

```text
- Audit log table cÃ³ dá»¯ liá»‡u Ä‘Ãºng
- Lock/unlock/login ghi log
- API audit tráº£ Ä‘Ãºng
- UI xem Ä‘Æ°á»£c log
- Log khÃ´ng sá»­a/xÃ³a Ä‘Æ°á»£c tá»« UI
```

---

# Phase 3 â€” Role & Permission

## 3.1 Má»¥c tiÃªu

KhÃ´ng Ä‘á»ƒ táº¥t cáº£ Admin cÃ³ toÃ n quyá»n. Kiá»ƒm soÃ¡t menu, button vÃ  API theo permission.

---

## 3.2 Role MVP

```text
Super Admin
Operation Admin
Read-only Admin
```

Role má»Ÿ rá»™ng sau:

```text
Finance Admin
Support Admin
```

---

## 3.3 Permission MVP

```text
account.view
account.lock
account.unlock

owner.view
owner.update
owner.lock
owner.unlock

tenant.view
tenant.update
tenant.lock
tenant.unlock
tenant.view_sensitive

audit_log.view

admin_user.view
admin_user.create
admin_user.update
admin_user.lock

role.view
role.update
role.assign
```

Sau nÃ y má»Ÿ rá»™ng:

```text
property.view/update/lock/unlock
room.view/update
contract.view/update/cancel/download_file
invoice.view/update/mark_paid/cancel
report.view/export
system_config.view/update
notification.view/create/send/cancel
```

---

## 3.4 DB

Báº£ng:

```text
roles
permissions
role_permissions
```

Náº¿u Admin Ä‘ang náº±m trong users:

```text
users.role_id
```

Náº¿u cÃ³ báº£ng riÃªng:

```text
admin_users.role_id
```

MVP khuyáº¿n nghá»‹:

```text
1 Admin = 1 role
```

---

## 3.5 Migration

```text
create_roles_table
create_permissions_table
create_role_permissions_table
add_role_id_to_admin_users_or_users
```

---

## 3.6 Seed

Seed roles:

```text
Super Admin
Operation Admin
Read-only Admin
```

Seed permissions vÃ  map:

```text
Super Admin = all permissions
Operation Admin = account.view, owner.view, owner.update, tenant.view...
Read-only Admin = *.view only
```

---

## 3.7 API

```text
GET /admin/me/permissions

GET /admin/admin-users
POST /admin/admin-users
PATCH /admin/admin-users/{id}
POST /admin/admin-users/{id}/lock
POST /admin/admin-users/{id}/unlock

GET /admin/roles
GET /admin/roles/{id}
PATCH /admin/roles/{id}/permissions
POST /admin/admin-users/{id}/assign-role
```

---

## 3.8 Backend Guard

Má»—i API cáº§n permission guard.

VÃ­ dá»¥:

```text
POST /admin/accounts/{id}/lock requires account.lock
GET /admin/audit-logs requires audit_log.view
PATCH /admin/roles/{id}/permissions requires role.update
```

KhÃ´ng chá»‰ áº©n button á»Ÿ UI.

---

## 3.9 Test API

```text
1. Super Admin gá»i lock account â†’ success
2. Read-only Admin gá»i lock account â†’ 403
3. Operation Admin xem account list â†’ success
4. User khÃ´ng pháº£i Admin gá»i admin API â†’ 403
5. Sá»­a role permission â†’ ghi audit log critical
6. KhÃ´ng cho khÃ³a/xÃ³a Super Admin cuá»‘i cÃ¹ng
```

---

## 3.10 UI

```text
- Menu render theo permission
- Button action render theo permission
- Admin User List
- Create Admin
- Assign Role
- Role List
- Role Detail
- Permission Matrix
```

---

## 3.11 Done Criteria

```text
- API guard hoáº¡t Ä‘á»™ng
- UI menu/action theo quyá»n
- Role matrix sá»­a Ä‘Æ°á»£c
- KhÃ´ng lÃ m máº¥t Super Admin cuá»‘i cÃ¹ng
- Audit log ghi khi sá»­a role
```

---

# Phase 4 â€” Owner Management

## 4.1 Má»¥c tiÃªu

TÃ¡ch Owner khá»i mÃ n hÃ¬nh account chung. Owner lÃ  trung tÃ¢m nghiá»‡p vá»¥.

---

## 4.2 DB Review

Cáº§n xÃ¡c Ä‘á»‹nh mÃ´ hÃ¬nh:

### CÃ¡ch A â€” khuyáº¿n nghá»‹

```text
users: login/account
owners: owner profile/business data
owners.user_id â†’ users.id
```

### CÃ¡ch B

```text
users.user_type = owner
```

Náº¿u há»‡ thá»‘ng sáº½ lá»›n, nÃªn dÃ¹ng CÃ¡ch A.

---

## 4.3 API Owner List

```text
GET /admin/owners
```

Query:

```text
keyword
status
created_from
created_to
last_login_from
last_login_to
page
limit
sort_by
sort_order
```

Response cáº§n cÃ³ aggregate:

```text
property_count
room_count
tenant_count
active_contract_count
unpaid_invoice_count
```

---

## 4.4 API Owner Detail

```text
GET /admin/owners/{id}
GET /admin/owners/{id}/properties
GET /admin/owners/{id}/rooms
GET /admin/owners/{id}/tenants
GET /admin/owners/{id}/contracts
GET /admin/owners/{id}/invoices
GET /admin/owners/{id}/audit-logs
POST /admin/owners/{id}/notes
```

---

## 4.5 API Lock/Unlock Owner

CÃ³ thá»ƒ dÃ¹ng account lock chung, nhÆ°ng nÃªn expose rÃµ:

```text
POST /admin/owners/{id}/lock
POST /admin/owners/{id}/unlock
```

Body:

```json
{
  "reason": "Owner vi pháº¡m quy Ä‘á»‹nh sá»­ dá»¥ng"
}
```

---

## 4.6 Test API

```text
1. Owner list total Ä‘Ãºng
2. Filter owner status active/locked Ä‘Ãºng
3. Search email/phone Ä‘Ãºng
4. property_count Ä‘Ãºng
5. room_count Ä‘Ãºng
6. tenant_count Ä‘Ãºng
7. Owner detail tráº£ Ä‘Ãºng thÃ´ng tin
8. Owner tabs tráº£ Ä‘Ãºng dá»¯ liá»‡u liÃªn quan
9. Lock/unlock Owner ghi audit log
```

---

## 4.7 Verify expected báº±ng DB

VÃ­ dá»¥ kiá»ƒm tra aggregate:

```sql
select count(*) from properties where owner_id = 'OWNER_ID';
select count(*) from rooms where owner_id = 'OWNER_ID';
select count(*) from tenants where owner_id = 'OWNER_ID';
```

So vá»›i response:

```json
{
  "property_count": 3,
  "room_count": 45,
  "tenant_count": 38
}
```

Pháº£i khá»›p.

---

## 4.8 UI

MÃ n hÃ¬nh:

```text
Owner List
Owner Detail
Owner Detail Tabs
Lock/Unlock Owner Modal
Internal Notes
```

Owner Detail tabs:

```text
Tá»•ng quan
Há»“ sÆ¡
CÆ¡ sá»Ÿ
PhÃ²ng
KhÃ¡ch thuÃª
Há»£p Ä‘á»“ng
HÃ³a Ä‘Æ¡n
Ghi chÃº ná»™i bá»™
Nháº­t kÃ½ hoáº¡t Ä‘á»™ng
```

---

## 4.9 Done Criteria

```text
- Owner list Ä‘Ãºng data
- Owner detail Ä‘á»§ tabs
- Aggregate count so vá»›i DB khá»›p
- Lock/unlock Owner dÃ¹ng flow chuáº©n
- Audit log hoáº¡t Ä‘á»™ng
- UI filter/search/pagination Ä‘áº§y Ä‘á»§
```

---

# Phase 5 â€” Tenant Management

## 5.1 Má»¥c tiÃªu

Admin quáº£n lÃ½ khÃ¡ch thuÃª cáº¥p há»‡ thá»‘ng.

---

## 5.2 DB Review

Cáº§n xÃ¡c Ä‘á»‹nh:

```text
tenants cÃ³ owner_id khÃ´ng?
tenants cÃ³ user_id khÃ´ng náº¿u tenant login app?
tenants cÃ³ current_room_id khÃ´ng?
contracts liÃªn káº¿t tenant_id tháº¿ nÃ o?
invoices liÃªn káº¿t tenant_id tháº¿ nÃ o?
CÃ´ng ná»£ tenant tÃ­nh tá»« Ä‘Ã¢u?
```

---

## 5.3 API

```text
GET /admin/tenants
GET /admin/tenants/{id}
GET /admin/tenants/{id}/contracts
GET /admin/tenants/{id}/invoices
GET /admin/tenants/{id}/rental-history
POST /admin/tenants/{id}/lock
POST /admin/tenants/{id}/unlock
GET /admin/tenants/{id}/sensitive
```

Query list:

```text
keyword
owner_id
property_id
room_id
rental_status
account_status
has_debt
page
limit
sort_by
sort_order
```

---

## 5.4 Test API

```text
1. List tenant filter owner_id Ä‘Ãºng
2. List tenant filter room_id Ä‘Ãºng
3. Detail tenant tráº£ current room Ä‘Ãºng
4. Debt amount Ä‘Ãºng vá»›i unpaid invoices
5. Admin khÃ´ng cÃ³ tenant.view_sensitive gá»i sensitive API â†’ 403
6. Admin cÃ³ tenant.view_sensitive gá»i sensitive API â†’ success
7. Gá»i sensitive API ghi audit log High
8. Lock/unlock tenant báº¯t buá»™c reason
```

---

## 5.5 Verify expected

Debt expected:

```text
debt_amount = sum(total_amount - paid_amount)
              where invoice.status in unpaid, partial_paid, overdue
              and tenant_id = current tenant
```

So sÃ¡nh API vá»›i DB/calculation.

---

## 5.6 UI

```text
Tenant List
Tenant Detail
Sensitive Data Masking
Lock/Unlock Tenant Modal
```

Tenant Detail tabs:

```text
Tá»•ng quan
Há»“ sÆ¡
Lá»‹ch sá»­ thuÃª
Há»£p Ä‘á»“ng
HÃ³a Ä‘Æ¡n
CÃ´ng ná»£
Nháº­t kÃ½ hoáº¡t Ä‘á»™ng
```

---

## 5.7 Done Criteria

```text
- Tenant list/detail Ä‘Ãºng dá»¯ liá»‡u
- Filter theo Owner/cÆ¡ sá»Ÿ/phÃ²ng Ä‘Ãºng
- Debt calculation Ä‘Ãºng
- Sensitive permission Ä‘Ãºng
- Sensitive access ghi audit log
- Lock/unlock tenant Ä‘Ãºng
```

---

# Phase 6 â€” Property & Room Management

## 6.1 Má»¥c tiÃªu

Admin xem vÃ  kiá»ƒm soÃ¡t cÆ¡ sá»Ÿ/phÃ²ng toÃ n há»‡ thá»‘ng.

---

## 6.2 API Property

```text
GET /admin/properties
GET /admin/properties/{id}
GET /admin/properties/{id}/rooms
GET /admin/properties/{id}/tenants
GET /admin/properties/{id}/contracts
GET /admin/properties/{id}/invoices
POST /admin/properties/{id}/lock
POST /admin/properties/{id}/unlock
```

Query:

```text
keyword
owner_id
province
district
status
page
limit
sort_by
sort_order
```

---

## 6.3 API Room

```text
GET /admin/rooms
GET /admin/rooms/{id}
GET /admin/rooms/{id}/rental-history
GET /admin/rooms/{id}/invoices
PATCH /admin/rooms/{id}
```

Query:

```text
keyword
owner_id
property_id
status
price_from
price_to
page
limit
sort_by
sort_order
```

---

## 6.4 Business Rules

### KhÃ³a cÆ¡ sá»Ÿ

```text
- Cáº§n property.lock
- Báº¯t buá»™c reason
- Owner khÃ´ng Ä‘Æ°á»£c thao tÃ¡c má»›i trÃªn cÆ¡ sá»Ÿ bá»‹ khÃ³a
- Dá»¯ liá»‡u cÅ© giá»¯ nguyÃªn
- Ghi audit log High
```

### Update tráº¡ng thÃ¡i phÃ²ng

```text
- Cáº§n room.update
- Náº¿u phÃ²ng cÃ³ há»£p Ä‘á»“ng active, khÃ´ng cho Ä‘á»•i sang vacant trá»±c tiáº¿p
- Má»i thay Ä‘á»•i tráº¡ng thÃ¡i ghi audit log
```

---

## 6.5 Test API

```text
1. Property room_count Ä‘Ãºng
2. Property occupied/vacant count Ä‘Ãºng
3. Property lock/unlock báº¯t buá»™c reason
4. Room current tenant Ä‘Ãºng
5. Room current contract Ä‘Ãºng
6. KhÃ´ng cho Ä‘á»•i occupied â†’ vacant náº¿u contract active
7. Room update ghi audit log
```

---

## 6.6 Verify expected

```sql
select count(*) from rooms where property_id = 'PROPERTY_ID';
select count(*) from rooms where property_id = 'PROPERTY_ID' and status = 'occupied';
select count(*) from rooms where property_id = 'PROPERTY_ID' and status = 'vacant';
```

So sÃ¡nh vá»›i API.

---

## 6.7 UI

```text
Property List
Property Detail
Room List
Room Detail
Property Lock/Unlock Modal
Room Status Update
```

---

## 6.8 Done Criteria

```text
- Property/Room API Ä‘Ãºng
- Aggregate count Ä‘Ãºng
- Lock property Ä‘Ãºng rule
- Room status khÃ´ng gÃ¢y mÃ¢u thuáº«n
- UI hoáº¡t Ä‘á»™ng Ä‘Ãºng
- Audit log Ä‘áº§y Ä‘á»§
```

---

# Phase 7 â€” Contract Management

## 7.1 Má»¥c tiÃªu

Admin xem, kiá»ƒm tra vÃ  há»— trá»£ xá»­ lÃ½ há»£p Ä‘á»“ng.

---

## 7.2 API

```text
GET /admin/contracts
GET /admin/contracts/{id}
PATCH /admin/contracts/{id}
POST /admin/contracts/{id}/cancel
GET /admin/contracts/{id}/file
GET /admin/contracts/{id}/history
```

Query:

```text
keyword
owner_id
property_id
room_id
tenant_id
status
start_from
start_to
end_from
end_to
near_expiry
page
limit
sort_by
sort_order
```

---

## 7.3 Business Rules

### Near expiry

```text
near_expiry = active contract where end_date <= today + config.contract_expiry_warning_days
```

### Sá»­a há»£p Ä‘á»“ng

```text
- Cáº§n contract.update
- Báº¯t buá»™c reason
- LÆ°u before/after
- KhÃ´ng cho Ä‘á»•i room/tenant gÃ¢y trÃ¹ng active contract
- Ghi audit log High
```

### Há»§y há»£p Ä‘á»“ng

```text
- Cáº§n contract.cancel
- Báº¯t buá»™c reason
- KhÃ´ng xÃ³a invoice liÃªn quan
- Status = cancelled
- Ghi audit log High/Critical
```

---

## 7.4 Test API

```text
1. Filter contract near_expiry Ä‘Ãºng
2. Filter expired Ä‘Ãºng
3. Detail contract Ä‘Ãºng owner/tenant/room
4. Cancel contract khÃ´ng reason â†’ fail
5. Cancel contract cÃ³ reason â†’ success
6. Cancel khÃ´ng xÃ³a invoice liÃªn quan
7. Update contract ghi before/after audit log
8. KhÃ´ng cho update táº¡o trÃ¹ng active contract
```

---

## 7.5 Verify expected

Near expiry check:

```text
end_date <= today + warning_days
and status = active
```

So sÃ¡nh API vá»›i query DB.

---

## 7.6 UI

```text
Contract List
Contract Detail
Edit Contract Modal/Page
Cancel Contract Modal
Contract History
Download File
```

---

## 7.7 Done Criteria

```text
- Contract list/filter Ä‘Ãºng
- Near expiry Ä‘Ãºng
- Detail Ä‘Ãºng data
- Cancel/edit Ä‘Ãºng rule
- Audit log before/after Ä‘Ãºng
- UI Ä‘á»§ state
```

---

# Phase 8 â€” Invoice / Payment Management

## 8.1 Má»¥c tiÃªu

Admin kiá»ƒm soÃ¡t hÃ³a Ä‘Æ¡n vÃ  thanh toÃ¡n do Owner táº¡o.

---

## 8.2 API

```text
GET /admin/invoices
GET /admin/invoices/{id}
PATCH /admin/invoices/{id}
POST /admin/invoices/{id}/mark-paid
POST /admin/invoices/{id}/cancel
GET /admin/invoices/{id}/history
```

Query:

```text
keyword
owner_id
property_id
room_id
tenant_id
status
billing_period
created_from
created_to
paid_from
paid_to
overdue
page
limit
sort_by
sort_order
```

---

## 8.3 Business Rules

### Total amount

```text
total_amount = room_amount
             + electricity_amount
             + water_amount
             + service_amount
             + surcharge_amount
             - discount_amount
```

### Mark paid

```text
- Cáº§n invoice.mark_paid
- Báº¯t buá»™c amount
- Báº¯t buá»™c paid_at
- Báº¯t buá»™c reason náº¿u Admin thao tÃ¡c
- paid_amount < total_amount â†’ partial_paid
- paid_amount >= total_amount â†’ paid
- Ghi audit log High
```

### Sá»­a invoice

```text
- Cáº§n invoice.update
- KhÃ´ng sá»­a paid invoice náº¿u config khÃ´ng cho phÃ©p
- Sá»­a tiá»n báº¯t buá»™c reason
- LÆ°u before/after
- Ghi audit log High
```

### Há»§y invoice

```text
- Cáº§n invoice.cancel
- Báº¯t buá»™c reason
- KhÃ´ng hard delete
- Status = cancelled
- Ghi audit log High
```

---

## 8.4 Test API

```text
1. Filter unpaid Ä‘Ãºng
2. Filter overdue Ä‘Ãºng
3. Invoice total tÃ­nh Ä‘Ãºng
4. Mark paid full â†’ status paid
5. Mark paid partial â†’ status partial_paid
6. Cancel invoice â†’ status cancelled
7. Cancel khÃ´ng xÃ³a record
8. Sá»­a tiá»n ghi before/after audit log
9. KhÃ´ng cho sá»­a paid invoice náº¿u config false
```

---

## 8.5 Verify expected

TÃ­nh total tá»« DB rá»“i so vá»›i response.

```text
expected_total = room + electricity + water + service + surcharge - discount
```

Debt tenant:

```text
sum(total_amount - paid_amount)
where status in unpaid, partial_paid, overdue
```

---

## 8.6 UI

```text
Invoice List
Invoice Detail
Edit Invoice Modal
Mark Paid Modal
Cancel Invoice Modal
Invoice History
Payment History
```

---

## 8.7 Done Criteria

```text
- Invoice API Ä‘Ãºng
- Total/debt calculation Ä‘Ãºng
- Mark paid Ä‘Ãºng tráº¡ng thÃ¡i
- Cancel khÃ´ng hard delete
- Audit log Ä‘áº§y Ä‘á»§
- UI hoáº¡t Ä‘á»™ng Ä‘Ãºng
```

---

# Phase 9 â€” Dashboard nÃ¢ng cáº¥p

## 9.1 Má»¥c tiÃªu

NÃ¢ng Dashboard tá»« Ä‘áº¿m tÃ i khoáº£n thÃ nh dashboard váº­n hÃ nh toÃ n há»‡ thá»‘ng.

Chá»‰ lÃ m phase nÃ y sau khi Owner/Tenant/Property/Room/Contract/Invoice API á»•n.

---

## 9.2 API

```text
GET /admin/dashboard/summary
GET /admin/dashboard/charts
GET /admin/dashboard/alerts
```

---

## 9.3 Summary cáº§n cÃ³

```text
total_owners
active_owners
locked_owners
total_tenants
total_properties
total_rooms
occupied_rooms
vacant_rooms
near_expiry_contracts
unpaid_invoices
overdue_invoices
total_debt_amount
```

---

## 9.4 Charts

```text
Owner má»›i theo thÃ¡ng
Tráº¡ng thÃ¡i phÃ²ng
Tráº¡ng thÃ¡i hÃ³a Ä‘Æ¡n
```

---

## 9.5 Alerts

```text
Há»£p Ä‘á»“ng sáº¯p háº¿t háº¡n
HÃ³a Ä‘Æ¡n quÃ¡ háº¡n
Owner khÃ´ng Ä‘Äƒng nháº­p 30 ngÃ y
PhÃ²ng trá»‘ng lÃ¢u ngÃ y náº¿u cÃ³ dá»¯ liá»‡u
```

---

## 9.6 Test API

```text
1. Tá»•ng Owner Ä‘Ãºng
2. Owner active/locked Ä‘Ãºng
3. Tá»•ng phÃ²ng Ä‘Ãºng
4. PhÃ²ng occupied/vacant Ä‘Ãºng
5. Há»£p Ä‘á»“ng sáº¯p háº¿t háº¡n Ä‘Ãºng
6. HÃ³a Ä‘Æ¡n overdue Ä‘Ãºng
7. Tá»•ng cÃ´ng ná»£ Ä‘Ãºng
8. Click dashboard card filter sang list Ä‘Ãºng
```

---

## 9.7 Verify expected

So sÃ¡nh tá»«ng chá»‰ sá»‘ vá»›i SQL/query DB.

VÃ­ dá»¥:

```sql
select count(*) from users where user_type = 'owner';
select count(*) from rooms where status = 'occupied';
select count(*) from invoices where status = 'overdue';
```

---

## 9.8 UI

```text
Summary Cards
Charts
Alert Lists
Drill-down tá»« card sang list
Time filter
Owner/property filter náº¿u cáº§n
```

---

## 9.9 Done Criteria

```text
- Dashboard summary Ä‘Ãºng
- Chart Ä‘Ãºng
- Alert Ä‘Ãºng
- Drill-down Ä‘Ãºng filter
- UI Ä‘áº¹p, rÃµ, khÃ´ng gá»i tiá»n hÃ³a Ä‘Æ¡n lÃ  doanh thu ná»n táº£ng
```

---

# Phase 10 â€” Reports váº­n hÃ nh

## 10.1 Má»¥c tiÃªu

Táº¡o bÃ¡o cÃ¡o váº­n hÃ nh cÆ¡ báº£n cho Admin.

---

## 10.2 API

```text
GET /admin/reports/owners
GET /admin/reports/tenants
GET /admin/reports/rooms
GET /admin/reports/contracts
GET /admin/reports/invoices
GET /admin/reports/system-activities
```

Query chung:

```text
from_date
to_date
owner_id
property_id
group_by = day | week | month
page
limit
```

---

## 10.3 Reports cáº§n cÃ³

### Owner

```text
Owner má»›i theo ngÃ y/thÃ¡ng
Owner active
Owner khÃ´ng hoáº¡t Ä‘á»™ng 30 ngÃ y
Owner nhiá»u phÃ²ng nháº¥t
Owner nhiá»u hÃ³a Ä‘Æ¡n quÃ¡ háº¡n nháº¥t
```

### Tenant

```text
Tenant má»›i
Tenant Ä‘ang thuÃª
Tenant Ä‘Ã£ rá»i Ä‘i
Tenant cÃ³ cÃ´ng ná»£
```

### Room

```text
Tá»•ng phÃ²ng
PhÃ²ng Ä‘ang thuÃª
PhÃ²ng trá»‘ng
Tá»· lá»‡ láº¥p Ä‘áº§y
PhÃ²ng trá»‘ng lÃ¢u ngÃ y
```

### Contract

```text
Há»£p Ä‘á»“ng active
Há»£p Ä‘á»“ng sáº¯p háº¿t háº¡n
Há»£p Ä‘á»“ng expired
Há»£p Ä‘á»“ng cancelled
```

### Invoice

```text
Tá»•ng hÃ³a Ä‘Æ¡n
Tá»•ng tiá»n hÃ³a Ä‘Æ¡n
Tá»•ng Ä‘Ã£ thanh toÃ¡n
Tá»•ng chÆ°a thanh toÃ¡n
Tá»•ng cÃ´ng ná»£
Tá»· lá»‡ thanh toÃ¡n Ä‘Ãºng háº¡n
```

---

## 10.4 Test API

```text
1. Filter date Ä‘Ãºng
2. Filter owner Ä‘Ãºng
3. Filter property Ä‘Ãºng
4. Group by month Ä‘Ãºng
5. Tá»•ng tiá»n invoice Ä‘Ãºng
6. Export chá»‰ cho user cÃ³ report.export
```

---

## 10.5 UI

```text
Report List/Pages
Filter bar
Stat cards
Chart
Table detail
Export button theo quyá»n
```

---

## 10.6 Done Criteria

```text
- Reports Ä‘Ãºng sá»‘ liá»‡u
- Filter Ä‘Ãºng
- Export theo quyá»n
- UI readable
- Sá»‘ tiá»n gá»i lÃ  hÃ³a Ä‘Æ¡n/cÃ´ng ná»£ Owner, khÃ´ng pháº£i doanh thu TroCare
```

---

# Phase 11 â€” System Config

## 11.1 Má»¥c tiÃªu

Cho Super Admin cáº¥u hÃ¬nh rule váº­n hÃ nh chung.

---

## 11.2 API

```text
GET /admin/system-config
PATCH /admin/system-config
```

---

## 11.3 Config MVP

```text
google_login_enabled
email_login_enabled
admin_session_timeout_minutes
invoice_code_prefix
invoice_code_format
contract_code_prefix
contract_code_format
contract_expiry_warning_days
allow_edit_paid_invoice
require_reason_when_update_invoice_amount
require_reason_when_view_sensitive_data
max_upload_file_size_mb
allowed_upload_file_types
```

---

## 11.4 Business Rules

```text
- Cáº§n system_config.view Ä‘á»ƒ xem
- Cáº§n system_config.update Ä‘á»ƒ sá»­a
- Sá»­a config pháº£i nháº­p reason
- Sá»­a config ghi audit log Critical
- Config pháº£i validate cháº·t
```

---

## 11.5 Test API

```text
1. KhÃ´ng cÃ³ quyá»n view â†’ 403
2. KhÃ´ng cÃ³ quyá»n update â†’ 403
3. Update config há»£p lá»‡ â†’ success
4. Update config invalid â†’ fail
5. Update config ghi audit log Critical
6. Config má»›i áº£nh hÆ°á»Ÿng Ä‘Ãºng rule liÃªn quan
```

---

## 11.6 UI

```text
System Config Page
Grouped config sections
Save confirmation modal
Reason field
Validation errors
```

---

## 11.7 Done Criteria

```text
- Config Ä‘á»c/sá»­a Ä‘Ãºng quyá»n
- Config validate Ä‘Ãºng
- Audit log Critical khi sá»­a
- Config áº£nh hÆ°á»Ÿng Ä‘Ãºng business rule
```

---

# Phase 12 â€” System Notification

## 12.1 Má»¥c tiÃªu

Admin gá»­i thÃ´ng bÃ¡o há»‡ thá»‘ng tá»« TroCare cho Owner/Tenant.

KhÃ´ng dÃ¹ng Ä‘á»ƒ nháº¯c tiá»n phÃ²ng thay Owner.

---

## 12.2 API

```text
GET /admin/notifications
POST /admin/notifications
GET /admin/notifications/{id}
POST /admin/notifications/{id}/send
POST /admin/notifications/{id}/cancel
```

---

## 12.3 Notification types

```text
maintenance
feature_update
policy_update
account_status
data_warning
```

Target:

```text
all_owners
selected_owners
one_owner
all_tenants
one_tenant
```

Channel:

```text
in_app
email
```

Status:

```text
draft
scheduled
sent
cancelled
failed
```

---

## 12.4 Test API

```text
1. Táº¡o draft notification
2. Gá»­i ngay
3. LÃªn lá»‹ch gá»­i
4. Há»§y scheduled
5. KhÃ´ng cho há»§y sent
6. Send ghi audit log
7. User nháº­n Ä‘Ãºng target
```

---

## 12.5 UI

```text
Notification List
Create Notification
Target Selector
Schedule/Gá»­i ngay
Send status
Cancel scheduled
```

---

## 12.6 Done Criteria

```text
- Táº¡o/gá»­i/há»§y notification Ä‘Ãºng
- Target Ä‘Ãºng
- Audit log Ä‘Ãºng
- KhÃ´ng dÃ¹ng nháº¯c tiá»n phÃ²ng thay Owner
```

---

# Phase 13 â€” Hardening, QA Regression, Deploy

## 13.1 Má»¥c tiÃªu

Kiá»ƒm tra toÃ n há»‡ thá»‘ng Admin trÆ°á»›c khi release.

---

## 13.2 Security checklist

```text
- Admin API khÃ´ng truy cáº­p Ä‘Æ°á»£c bá»Ÿi Owner/Tenant
- Táº¥t cáº£ API cÃ³ permission guard
- Sensitive data bá»‹ che náº¿u khÃ´ng cÃ³ quyá»n
- Export ghi audit log
- Role/permission khÃ´ng lÃ m máº¥t Super Admin cuá»‘i cÃ¹ng
- Locked user khÃ´ng login Ä‘Æ°á»£c
- Token/session revoke khi lock account
```

---

## 13.3 Data checklist

```text
- Count dashboard khá»›p DB
- Aggregate Owner khá»›p DB
- Tenant debt khá»›p invoice
- Room status khÃ´ng mÃ¢u thuáº«n contract
- Contract near expiry Ä‘Ãºng config
- Invoice total Ä‘Ãºng cÃ´ng thá»©c
- Overdue Ä‘Ãºng due_date
```

---

## 13.4 UI checklist

```text
- Loading state
- Empty state
- Error state
- Pagination
- Filter reset
- Sort
- Responsive cÆ¡ báº£n
- Confirm modal cho action nguy hiá»ƒm
- Reason field báº¯t buá»™c
- Permission hide/disable button
```

---

## 13.5 Regression test

Cháº¡y full flow:

```text
1. Super Admin login
2. Táº¡o Operation Admin
3. GÃ¡n role
4. Operation Admin login
5. Operation Admin xem Owner
6. Operation Admin khÃ´ng sá»­a role Ä‘Æ°á»£c
7. Super Admin khÃ³a Owner
8. Owner login fail
9. Super Admin má»Ÿ Owner
10. Owner login success
11. Finance/Admin mark paid invoice
12. Audit log cÃ³ Ä‘á»§ log
```

---

## 13.6 Deploy checklist

```text
- Migration Ä‘Ã£ cháº¡y trÃªn staging
- Seed role/permission Ä‘Ã£ cÃ³
- Super Admin account Ä‘Ã£ tá»“n táº¡i
- Env variables Ä‘áº§y Ä‘á»§
- Backup DB trÆ°á»›c deploy
- Smoke test sau deploy
- Rollback plan
```

---

# 14. Tá»•ng timeline Ä‘á» xuáº¥t

## Sprint 1 â€” Audit hiá»‡n tráº¡ng + Account Status

```text
- Phase 0
- Phase 1 DB/migration/API/UI
```

## Sprint 2 â€” Audit Log

```text
- Phase 2 DB/API/UI
- Gáº¯n log cho action hiá»‡n táº¡i
```

## Sprint 3 â€” Role & Permission

```text
- Phase 3 DB/API/UI
- Permission guard backend/frontend
```

## Sprint 4 â€” Owner Management

```text
- Phase 4 API/UI
- Owner List/Detail/Tabs
```

## Sprint 5 â€” Tenant Management

```text
- Phase 5 API/UI
- Sensitive data permission
```

## Sprint 6 â€” Property & Room

```text
- Phase 6 API/UI
```

## Sprint 7 â€” Contract

```text
- Phase 7 API/UI
```

## Sprint 8 â€” Invoice / Payment

```text
- Phase 8 API/UI
```

## Sprint 9 â€” Dashboard

```text
- Phase 9 API/UI
```

## Sprint 10 â€” Reports

```text
- Phase 10 API/UI
```

## Sprint 11 â€” Config + Notification

```text
- Phase 11
- Phase 12
```

## Sprint 12 â€” Hardening + Release

```text
- Phase 13
- Regression
- Deploy
```

---

# 15. Æ¯u tiÃªn báº¯t buá»™c lÃ m trÆ°á»›c

Vá»›i hiá»‡n tráº¡ng hiá»‡n táº¡i, 4 viá»‡c báº¯t buá»™c lÃ m trÆ°á»›c lÃ :

```text
1. Chuáº©n hÃ³a account status + lock/unlock cÃ³ reason
2. Audit log ná»n táº£ng
3. Role/Permission
4. Owner Management riÃªng
```

LÃ½ do:

```text
- Account status lÃ  ná»n cá»§a login/lock.
- Audit log Ä‘áº£m báº£o truy váº¿t.
- Role/Permission Ä‘áº£m báº£o an toÃ n Admin.
- Owner lÃ  trung tÃ¢m nghiá»‡p vá»¥ cá»§a toÃ n bá»™ há»‡ thá»‘ng.
```

Sau 4 pháº§n nÃ y má»›i nÃªn má»Ÿ rá»™ng Tenant, Property, Room, Contract, Invoice.

---

# 16. Rá»§i ro náº¿u lÃ m sai thá»© tá»±

| LÃ m sai | Rá»§i ro |
|---|---|
| LÃ m UI trÆ°á»›c API | UI Ä‘áº¹p nhÆ°ng data sai, pháº£i sá»­a nhiá»u |
| LÃ m Owner trÆ°á»›c status | Lock/login dá»… mÃ¢u thuáº«n |
| LÃ m nhiá»u module trÆ°á»›c audit | KhÃ´ng truy váº¿t Ä‘Æ°á»£c ai sá»­a gÃ¬ |
| KhÃ´ng cÃ³ permission guard backend | áº¨n button nhÆ°ng váº«n gá»i API Ä‘Æ°á»£c |
| Dashboard lÃ m quÃ¡ sá»›m | Sá»‘ liá»‡u fake/sai, pháº£i refactor |
| Invoice lÃ m trÆ°á»›c contract/room rÃµ rÃ ng | Dá»… sai cÃ´ng ná»£, sai tráº¡ng thÃ¡i |
| Config lÃ m quÃ¡ sá»›m | ChÆ°a cÃ³ nghiá»‡p vá»¥ Ä‘á»ƒ validate tÃ¡c Ä‘á»™ng |

---

# 17. Káº¿t luáº­n

Admin Portal nÃªn triá»ƒn khai theo hÆ°á»›ng:

```text
Foundation trÆ°á»›c â†’ Account/Audit/Permission cháº¯c â†’ Owner â†’ Tenant â†’ Property/Room â†’ Contract â†’ Invoice â†’ Dashboard â†’ Reports â†’ Config/Notification â†’ Hardening
```

KhÃ´ng cháº¡y theo UI trÆ°á»›c. Má»—i phase pháº£i cÃ³ DB, migration, seed, API, test API, verify expected data, UI, UAT rá»“i má»›i Ä‘i tiáº¿p.
