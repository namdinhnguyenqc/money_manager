# TroCare Admin SQL Status

**Updated:** 2026-05-21

## Done in docs

| Area | File | Status |
|---|---|---|
| Phase 1-3 foundation | `docs/admin/phase-1-3-postgresql.sql` | Done: account status, roles, permissions, role permissions, audit logs, seed data |
| Phase 4-13 extension | `docs/admin/phase-4-13-postgresql.sql` | Drafted: owner, tenant, property, room, contract, invoice, dashboard, reports, config, notification, hardening support |
| Implementation plan | `docs/admin/trocare-admin-implementation-plan.md` | Done as roadmap |
| API verification docs | `docs/admin/phase-1-api-verification.md`, `phase-2-api-verification.md`, `phase-3-api-verification.md` | Done for local/mock admin API flow |
| UI verification docs | `docs/admin/phase-1-ui-verification.md`, `phase-2-ui-verification.md` | Done for prototype/admin UI flow |

## Current SQL scope

`phase-1-3-postgresql.sql` creates the admin foundation tables from scratch for a PostgreSQL target.

`phase-4-13-postgresql.sql` is an extension script for the existing Money Manager rental schema. It does not drop data. It adds:

- Missing admin permissions for Phase 4-13.
- Role permission mappings for Super Admin, Operation Admin, and Read-only Admin.
- Admin lock/note fields for users, tenants, boarding houses, rooms, contracts, and invoices.
- Admin views for owner, tenant, property, room, contract, invoice, dashboard, and reports.
- Admin system config table and seed config.
- Admin notification and notification delivery tables.
- Additional audit log compatibility fields and lookup indexes.

## Not yet verified

These SQL files are documentation-ready but still need to be run against a real/staging PostgreSQL database before marking production-ready:

- Verify against the latest actual schema in Supabase.
- Check duplicate active contracts before enabling `uq_admin_one_active_contract_per_room`.
- Confirm whether production uses `users.role` or `users.user_type` as the source of truth.
- Confirm whether Admin audit should use existing `audit_logs` only or split into a dedicated `admin_audit_logs`.
- Confirm RLS policies for Admin/service-role access before deployment.

## Recommended next step

Run the scripts in this order on a disposable/staging DB:

```text
1. Existing backend migrations/schema
2. docs/admin/phase-1-3-postgresql.sql if admin foundation is not present
3. docs/admin/phase-4-13-postgresql.sql
4. API smoke tests for admin accounts, roles, owner/tenant/property/contract/invoice list endpoints
5. Dashboard/report count comparison against direct SQL queries
```
