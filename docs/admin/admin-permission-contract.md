# TroCare Admin Permission Contract

**Ngay chot:** 2026-05-22
**Format:** `module.action`
**Nguon su that:** Backend phai enforce permission. Frontend chi dung permission de render dung UX.

## 1. Rule

- Permission key viet thuong, tach `module` va `action` bang dau cham.
- Action nhieu tu dung snake case, vi du `mark_paid`, `view_sensitive`.
- `SUPER_ADMIN` duoc coi nhu wildcard `*`.
- Admin khong co permission ro rang bi tu choi theo default deny.
- API bi tu choi tra `403`, `code = ADMIN_PERMISSION_REQUIRED` va `required_permission`.

## 2. Module Keys

| Module | View | Mutations / sensitive actions |
|---|---|---|
| Account | `account.view` | `account.lock`, `account.unlock` |
| Audit log | `audit_log.view` | - |
| Admin user | `admin_user.view` | `admin_user.create`, `admin_user.update`, `admin_user.lock` |
| Role | `role.view` | `role.update`, `role.assign` |
| Owner | `owner.view` | `owner.update`, `owner.lock`, `owner.unlock`, `owner.view_sensitive`, `owner.export` |
| Tenant | `tenant.view` | `tenant.update`, `tenant.lock`, `tenant.unlock`, `tenant.view_sensitive`, `tenant.export` |
| Property | `property.view` | `property.update`, `property.lock`, `property.unlock` |
| Room | `room.view` | `room.update`, `room.lock`, `room.unlock` |
| Contract | `contract.view` | `contract.update`, `contract.cancel`, `contract.download_file` |
| Invoice | `invoice.view` | `invoice.update`, `invoice.mark_paid`, `invoice.cancel` |
| Dashboard | `dashboard.view` | - |
| Report | `report.view` | `report.export` |
| System config | `system_config.view` | `system_config.update` |
| Notification | `notification.view` | `notification.create`, `notification.send`, `notification.cancel` |

## 3. API Mapping Da Enforce

| API group | Permission |
|---|---|
| `GET /admin/accounts`, `GET /admin/accounts/summary` | `account.view` |
| Account lock/unlock | `account.lock`, `account.unlock` |
| `GET /admin/audit-logs*` | `audit_log.view` |
| `GET /admin/admin-users` | `admin_user.view` |
| `GET /admin/roles*` | `role.view` |
| `PATCH /admin/roles/{id}/permissions` | `role.update` |
| `GET /admin/owners*` | `owner.view` |
| Owner lock/unlock | `owner.lock`, `owner.unlock` |
| `GET /admin/tenants*` | `tenant.view` |
| Tenant lock/unlock | `tenant.lock`, `tenant.unlock` |
| `GET /admin/properties*` | `property.view` |
| Property lock/unlock | `property.lock`, `property.unlock` |
| `GET /admin/rooms*` | `room.view` |
| Room create/update/delete in legacy admin route | `room.update` |
| `GET /admin/contracts*` | `contract.view` |
| Contract cancel | `contract.cancel` |
| `GET /admin/invoices*` | `invoice.view` |
| Invoice mark paid/cancel | `invoice.mark_paid`, `invoice.cancel` |
| `GET /admin/dashboard/*` | `dashboard.view` |
| `GET /admin/reports/*` | `report.view` |
| System config view/update | `system_config.view`, `system_config.update` |
| Notification view/create/send/cancel | `notification.view`, `notification.create`, `notification.send`, `notification.cancel` |

## 4. UI Mapping

UI phai lay `GET /admin/me/permissions` sau khi da xac thuc Admin:

- Sidebar module check `*.view` tuong ung.
- Button mutation check permission action tuong ung.
- Field nhay cam check `*.view_sensitive`, va API cung phai khong tra field neu user khong co quyen.
- Khong tu suy ra quyen tu role name tren frontend, tru `*` do backend tra cho Super Admin.

## 5. Viec Con Lai

Mot so route legacy o dau file `backend/src/routes/admin.ts` van dung role guard vi UI cu dang goi truc tiep:

- `GET/PATCH/DELETE /admin/users*`
- `GET/POST/PATCH/DELETE /admin/boarding-houses*`
- `GET /admin/stats`

Khi UI moi chuyen sang phase APIs va permission map tren, can map tiep cac route legacy nay hoac loai bo de tranh song song hai contract.
