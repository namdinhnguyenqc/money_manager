# MVP v1 Status Tracker (Senior BA/PO perspective)

Purpose: Provide a single source of truth to track BE vs FE work, progress, and gaps for the MVP1 scope as defined in the Workflow Spec v1. This helps the team, QA, and stakeholders quickly understand what is done, what is in progress, and what remains to be done before Phase 2.

Legend:
- BE Done: Backend endpoints, data contracts, migrations, and seeds ready; API surface is used by FE.
- FE Done: Frontend feature implemented and wired to BE; UI/UX approved; tests may be present but CI tests are not required here.
- FE In Progress: Frontend feature implemented partially or in progress; additional polish or integration needed.
- Not Started: No work yet.
- Blocked: Waits for BE or dependencies.

> Note: The MVP here is MVP v1 focusing on: Guest search/lead submission; Owner BH/Rooms management; Super Admin governance. Not all features from phase 2/3 are included.

Status Matrix

- Guest Public Portal
  - BE Endpoints: /public/boarding-houses, /public/rooms, /public/leads
  - FE Mapping: Public listing page, BH detail with Rooms, Lead submission form
  - BE: DONE
  - FE: DONE
- Guest Lead Submission (LeadForm)
  - BE: POST /public/leads
  - FE: LeadForm component wired; payload shape tested integration-like
  - BE: DONE
  - FE: DONE
- Owner BH Management (BH listing, BH detail, isPublic)
  - BE Endpoints: GET /owner/boarding-houses, GET /owner/boarding-houses/{id}, PATCH /owner/boarding-houses/{id} (is_public)
  - FE: BH listing, BH detail, edit form, publish/unpublish
  - BE: DONE
  - FE: DONE
- Rooms (Owner)
  - BE: GET /owner/boarding-houses/{bhId}/rooms, PATCH /owner/boarding-houses/{bhId}/rooms/{roomId}
  - FE: Rooms list, RoomEditModal for editing
  - BE: DONE
  - FE: DONE
- Leads (Owner)
  - BE: GET /owner/boarding-houses/{bhId}/leads
  - FE: Leads list
  - BE: DONE
  - FE: DONE
- Owner Dashboard
  - BE: Provide data via BH + per-room aggregation; KPI data aggregation endpoint(s) may be used by FE
  - FE: KPI cards rendered; safe fallbacks
  - BE: DONE (skeleton provided for KPI aggregation)
  - FE: DONE
- Public CTA/Not Authorized RBAC (front-end guards)
  - Not Authorized UI: web-admin/app/not-authorized/page.tsx
  - RBAC Guards (client-side): web-admin/src/components/RBACGuard.tsx
  - Middleware (server-side): web-admin/middleware.ts
  - BE: DONE (Authorization flow defined)
  - FE: DONE
- Super Admin (Skeleton MVP)
  - Users List UI: web-admin/app/super-admin/users/index.tsx
  - Reports UI: web-admin/app/super-admin/reports/index.tsx
  - BE: Skeleton; expected to be extended in Phase 2/3
  - FE: DONE (skeleton)
- KPI Core (computeRoomsKpi)
  - FE: computeRoomsKpi implemented; used by BH detail & dashboard
  - BE: N/A for KPI compute (backend may provide room data); integration tested via FE
  - FE: DONE
- Public/Guest portal skeleton
  - UI for public listing, BH detail with room listing, and lead submission
  - FE: DONE; BE: DONE (endpoints exposed)
- Audit Log / Notification (Phase 2)
  - BE/FE: Not in MVP; planned for Phase 2
  - BE: Not Started
  - FE: Not Started

Overall status summary
- BE Done: Public Endpoints, Owner BH/Rooms/Leads APIs, Super Admin skeletons, Not Authorized flow (server & client guards)
- FE Done: Public Portal (BH listing, BH detail public, Rooms), Owner Portal (BH listing/detail, Rooms listing/edit, Leads, Dashboard), Not Authorized flow on FE, KPI Card reusable; LeadForm UI integrated; Public Lead submit path wired. Public Guest portal skeleton ready for Phase 2 enhancements.
- BE Done: All MVP BE endpoints mapped for Public and Owner flows as listed; Super Admin skeleton present; RBAC middleware in place.
- End-to-end tests: Skeletons present but not required to run in CI; black-box tests are manual-style integration tests
- Not Started or Blocked: Phase 2/3 features (booking, contracts, chat, deposits, advanced permissions, etc.)

Next steps (recommendations)
- If needed, populate a GitHub PRD to track work items aligned with the MVP spec and ensure single source of truth.
- Implement not-authorized flow integration tests (manual checks or integration test stubs) to guarantee policy enforcement.
- For FE in-progress items, finalize mapping and polish UI semantics (MVP look-and-feel).
- Prepare a handover doc for devs with a checklist mapping to PRD items and BE contracts.
# Status Note

This document is superseded by `docs/FE_BE_STATUS_MATRIX_v1.md` and `docs/API_INVENTORY_CURRENT.md` for current readiness. It was written before the latest verification pass, public route fixes, and App Router shadowing fix.
