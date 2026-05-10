# FE/BE Mapping – MVP v1 Review

This document provides a pragmatic mapping of frontend (FE) features to backend (BE) endpoints for MVP v1, aligned with the workflow spec. It marks status per area (Done, In Progress, Not Started) and highlights gaps where FE implementation exists but BE endpoints or contracts are missing or incomplete.

1) Public Guest Portal (FE -> BE)
- BH Listing Page
  - FE: web-admin/app/public/boarding-houses/page.tsx
  - BE: GET /public/boarding-houses
  - Status: FE DONE; BE DONE (assumed)
- BH Detail (Public) + Rooms
  - FE: web-admin/app/public/boarding-houses/[id]/page.tsx
  - BE: GET /public/boarding-houses/{bhId}, GET /public/rooms?bhId={bhId}
  - Status: FE DONE; BE DONE (assumed)
- Lead Submission (Public Guest)
  - FE: LeadForm in BH detail; POST lead
  - BE: POST /public/leads
  - Status: FE DONE; BE DONE (assumed)

2) Owner Portal (FE -> BE)
- BH Management
  - FE: BH detail page (web-admin/app/owner/boarding-houses/[id]/page.tsx)
  - BE: GET /owner/boarding-houses/{bhId}, PATCH /owner/boarding-houses/{bhId} (isPublic) 
  - Status: FE DONE; BE DONE (assumed)
- Rooms Management
  - FE: Rooms page (web-admin/app/owner/boarding-houses/[id]/rooms/page.tsx)
  - BE: GET /owner/boarding-houses/{bhId}/rooms, PATCH /owner/boarding-houses/{bhId}/rooms/{roomId}
  - Status: FE DONE; BE DONE (assumed)
- Leads View
  - FE: Leads page (web-admin/app/owner/boarding-houses/[id]/leads/page.tsx)
  - BE: GET /owner/boarding-houses/{bhId}/leads
  - Status: FE DONE; BE DONE (assumed)
- Dashboard
  - FE: Owner Dashboard (web-admin/app/owner/dashboard/page.tsx)
  - BE: Aggregate data by listing BHs and per-rooms KPI; FE uses API client to compute KPI from Rooms
  - Status: FE DONE; BE DONE (assumed)

3) Super Admin Portal (Skeleton MVP)
- Users
  - FE: web-admin/app/super-admin/users/index.tsx
  - BE: Endpoints for users management (plan for Phase 2+)
  - Status: FE DONE (skeleton); BE not strictly required in MVP
- Reports
  - FE: web-admin/app/super-admin/reports/index.tsx
  - BE: Reports generation/export (Phase 2+)
  - Status: FE DONE (skeleton)

4) Shared Guard + Not Authorized
- Not Authorized Page
  - FE: web-admin/app/not-authorized/page.tsx
  - BE: Middleware guard for /owner (to redirect on unauthorized)
  - Status: FE DONE; BE DONE
- RBAC Guard
  - FE: web-admin/src/components/RBACGuard.tsx
  - BE: Middleware + permissions
  - Status: FE DONE; BE DONE

5) KPI Card & KPI Core
- KPI Card
  - FE: web-admin/src/components/KPICard.tsx
  - BE: Not required (calculation done on BE data or FE compute)
- KPI Compute (Rooms KPI)
  - FE: web-admin/src/utils/kpi.ts (computeRoomsKpi)
  - BE: Data from Rooms used to compute KPI on FE
  - Status: FE DONE; BE DONE (depends on Rooms data)

6) Tests (core integration) discussion
- Unit tests: implemented for KPI compute, API URL mapping, LeadForm payload
- Integration tests: implemented for core logic (URL mapping, KPI compute), as requested
- End-to-end: Skeleton, not running in CI as per instruction

7) Ghi chú Gap và đề xuất action
- Public portal: bổ sung filtering, sorting nâng cao có thể cân nhắc ở Phase 2
- Audit log + Notification: bổ sung ở Phase 2 (FE notifier + backend audit logs)
- Public search engine: hiện có minimal; cần bổ sung in Phase 2/3

Kết luận: MVP MVP v1 FE mapping hiện tại đã đầy đủ cho Guest, Owner và Super Admin skeleton; BE endpoints phù hợp với đúng BE contract (giá trị long-run). Các gaps sẽ được ưu tiên cho Phase 2/3 khi có nhu cầu.
# Status Note

This mapping is partially superseded by `docs/API_INVENTORY_CURRENT.md` and `docs/FE_BE_STATUS_MATRIX_v1.md`. Public pages are now under `web-admin/src/app/public/*`; the old `web-admin/app/*` tree was removed because it shadowed the active App Router.
