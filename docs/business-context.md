# Business Context

## Product Summary

The product is evolving from a personal money-management app into a room-rental operations platform for Vietnamese landlords. The current active web experience is a two-sided system:

- **Owner/Admin portal** for landlords and internal operators to manage facilities, rooms, tenants, contracts, invoices, payments, lead/booking requests, and operational settings.
- **Public guest portal** for prospective tenants to view public boarding houses, see rooms, submit leads, and submit booking/hold requests.

The current implementation is strongest for the owner operational workflow: create facility, create room, create contract, create invoice, collect payment, and view payment history.

## Current Scope

### In Scope

- Admin login and admin user management.
- Owner login via Google/demo Google button.
- Required owner profile completion before owner workspace access.
- Owner profile display and profile settings.
- Facilities/boarding houses and room management.
- Rental room, tenant, contract, service, invoice, wallet, transaction, and trading modules.
- Public boarding-house listing/detail, lead submission, and booking request in mock/local runtime.
- Owner lead, booking, message, notification, and audit-log read paths in mock/local runtime.

### Out of Scope for Phase 1

- Production-grade public room search with facets and map.
- Realtime chat/SSE/WebSocket.
- Production-grade booking lock/hold transaction flow.
- Tenant authenticated portal.
- Email/SMS/push notification dispatch.
- Full RLS/PostGIS/search-index deployment verification.
- Privacy/export/delete workflows.

## User Roles

| Role | Current Meaning | Main Entry |
|---|---|---|
| Guest | Public viewer who can browse public boarding houses and submit lead/booking request. | `/public/boarding-houses` |
| OWNER | Landlord/operator who manages room-rental operations. Must complete profile. | `/login/owner`, `/owner/dashboard` |
| ADMIN | Internal admin who can manage users and content. | `/login/admin`, `/admin/users` |
| SUPER_ADMIN | Highest internal role. Can access admin and owner flows in current guard logic. | `/login/admin`, `/super-admin/*`, `/owner/*` |
| USER | Legacy money-manager/mobile user role. Protected by profile guard for business routes. | Legacy/mobile flows |

## Primary Business Goals

1. Keep owner operations coherent: rooms, contracts, invoices, and payments must stay connected.
2. Prevent incomplete owner accounts from entering business modules.
3. Keep admin and owner login paths separate.
4. Preserve old working flows while improving the newer owner rental operations UI.
5. Validate tenant identity fields before creating contracts.
6. Keep field-level validation stable: failed API validation should not erase user-entered form data.

## Release Posture

Current local state is appropriate for internal QA and manual flow testing. It is not production-ready without verification of:

- Supabase schema/migrations in a real database.
- Auth/provider behavior outside mock mode.
- Production data authorization and RLS.
- Public marketplace scale/search requirements.
- Payment/audit/notification correctness beyond local mock data.

## Current Gaps From Product Vision

| Area | Current State | Gap |
|---|---|---|
| Public marketplace | Basic public boarding-house/room list, lead, booking request. | No faceted search, SEO room detail, map, ranking, or tenant auth. |
| Booking | Mock conflict checks and owner confirm/reject. | No DB transaction lock/hold-first engine wired to runtime APIs. |
| Data model | Existing `boarding_houses`/`rooms` plus legacy rental tables; future `rental_*` migration exists. | Runtime APIs are not fully migrated to `rental_*`. |
| Realtime | None in active runtime. | No SSE/WebSocket fan-out. |
| Notifications | Mock owner notifications. | No provider dispatch or read/write notification center. |
| Audit | Mock audit rows. | No comprehensive audit append on all sensitive actions. |
| Docs | Several old planning docs overlap and sometimes contradict code. | Canonical docs now live in `docs/README.md` and must be maintained. |

## Needs verification

- Whether production Supabase has all migrations applied successfully.
- Whether `010_users_auth_schema.sql`, `011_social_accounts.sql`, and `012_user_profiles.sql` are compatible with the current migration runner because they include `COMMIT;` statements while some migration notes say files are wrapped in transactions.
- Whether public booking production mode is fully compatible with `rental_rooms.current_status` enum values. Current code checks for `"AVAILABLE"` while older owner room statuses may use uppercase and legacy rental statuses use lowercase.
