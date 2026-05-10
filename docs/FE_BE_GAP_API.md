# FE_BE_GAP_API (MVP v1) – API/Contract Gap Analysis

Overview: API surface alignment between FE MVP and BE contracts; statuses indicate readiness and potential changes.

1) Public (Guest) Endpoints
- GET /public/boarding-houses – BE contract available; FE uses to render BH list – Status: Done
- GET /public/rooms?bhId={bhId} – FE uses for Rooms KPI; BE contract available – Status: Done
- POST /public/leads – FE LeadForm payload targets this; Status: Done
- Data shapes expected: { data: [...] } or direct array; FE has mapping tolerant to both shapes – Status: OK

2) Owner Endpoints
- GET /owner/boarding-houses/{bhId} – FE BH detail, mapping data shape tolerant – Status: Done
- PATCH /owner/boarding-houses/{bhId} – FE sends payload { name, address, description, latitude, longitude, is_public } – BE contract assumed; Status: Done
- GET /owner/boarding-houses/{bhId}/rooms – FE uses for KPI; Status: Done
- PATCH /owner/boarding-houses/{bhId}/rooms/{roomId} – FE room edit payload; Status: Done
- GET /owner/boarding-houses/{bhId}/leads – FE loads; Status: Done
- KPI aggregation for Owner Dashboard: BE returns per BH data or FE computes from Rooms; Status: In-Progress/OK (BE provides support; FE consumes)

3) Super Admin (UI-API) – Skeleton
- User management endpoints: to be added (Phase 2)
- Reports endpoints: to be added (Phase 2)
- Status: Skeleton ready, not blocking MVP

4) Not Authorized & RBAC
- FE RBACGuard relies on localStorage role; BE middleware exists; contracts align – Status: Done

5) KPI Core
- computeRoomsKpi (FE) – Status: Done; used for BH detail & dashboard
- KPI Cards – Status: Done

6) Data contracts and naming conventions
- Ensure consistent naming: isPublic vs is_public in payloads; unify across FE/BE
- Ensure consistent episode data shapes across /data vs /data.data – FE tolerant approach implemented
 
7) Gaps/Notes
- In Phase 2, align on DB migrations for KPI extended metrics and multi-tenant support. 
- Audit Logging and Notifications: not part of MVP; planned for Phase 2
# Status Note

This document is superseded by `docs/API_INVENTORY_CURRENT.md` for current API readiness. The public guest endpoints now exist for `boarding-houses`, detail, rooms-by-BH, and lead submission in mock/existing-table mode; full `rental_*` marketplace mapping is still pending.
