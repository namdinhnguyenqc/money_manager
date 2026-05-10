# Workflow Spec – MVP v1 (Senior BA / PO perspective)

This document encodes the MVP product workflow for the project, focusing on core roles, features, and the end-to-end user experience. The MVP prioritizes Guest search, Owner content management, and Super Admin governance, with Phase 2/3 expanding to more complex roles and features.

## 1. MVP Scope
- Guest: search rooms, submit lead/contact to inquire about rooms.
- Owner: manage boarding houses and rooms; publish/unpublish listings.
- Super Admin: manage users, listings, and access/audit reporting.
- Excluded from MVP (Phase 1): booking holds, deposits, contracts, utilities management, real-time chat, staff permissions, complex payment flows.

## 2. Roles
- Guest: public consumer with limited interaction (lead submission).
- Owner: content creator/manager with permissions to publish/unpublish and edit boarding house data and rooms.
- Super Admin: governance role with oversight and broad permissions.

## 3. Sitemap (high-level)
- Public portal: guest search and lead submission (guest flow).
- Owner portal: 
  - /owner/boarding-houses
  - /owner/boarding-houses/[id]
  - /owner/boarding-houses/[id]/rooms
  - /owner/boarding-houses/[id]/leads
  - /owner/dashboard
- Super Admin portal:
  - /super-admin/users
  - /super-admin/reports
- Shared: /not-authorized, /login

## 4. Core Entities
- BoardingHouse (BH): id, name, address, description, latitude, longitude, status, isPublic, ownerId, createdAt, updatedAt
- Room: id, number, name, status, price, capacity, boardingHouseId
- Lead/Contact: id, guestName, guestPhone, message, status, createdAt, source
- User: id, name, email, role (Guest, Owner, Super Admin), status, createdAt
- AuditLog: id, action, actorId, targetId, timestamp, metadata

## 5. Room Lifecycle
- Create room: Owner UI to add room under a BH.
- Update room: edit room data (name, number, price, capacity, status).
- Publish/Unpublish room: controlled via BH publish/unpublish (visibility toggle).
- Soft-delete vs. archive (not in MVP; consider later).

## 6. Publish/Unpublish Workflow
- BH listing: Owner can publish or unpublish BH; this toggles visibility in public search.
- Rooms inherit BH publish state; individual room status should reflect BH visibility.

## 7. Guest Search Workflow (Public facing)
- Guest visits public BH/Room listing, filters by location, price, and status.
- Guest selects BH/Room → clicks to show details.
- Guest submits a Lead (guest contact) to inquire; system assigns status to lead.

## 8. Room Detail Workflow
- Guest/Owner can view room details (when BH is published).
- Host can edit room details (if Owner).
- KPI/metrics available to Owner about rooms under BH (total, available, occupied, maintenance).

## 9. Lead/Contact Workflow
- Guest submits a lead/contact from public pages.
- Owner views leads on BH via /owner/boarding-houses/[id]/leads and can update status.
- Lead has statuses like NEW, CONTACTED, BOOKED, CANCELLED (as edge states for Phase 1).

## 10. Owner Dashboard Workflow
- Dashboard shows BH-level and room-level KPI, with safe fallbacks if API not yet seeded.
- KPIs include total BH, total Rooms, available, occupied, maintenance, and occupancy rate.

## 11. Building Management
- CRUD for BH and related buildings (basic fields in MVP).
- Basic association BH <-> Owner.

## 12. Room Management
- Create/Edit/Publish/Unpublish rooms under a BH.
- Quick editing modal to adjust room attributes (number, name, status, price, capacity).

## 13. Super Admin Workflow
- User management: create/update/delete users and assign roles.
- Listing management: approve/dismiss BH and leads in public search.
- Generate reports and export (CSV/JSON) for governance.

## 14. Permission Matrix (high-level)
- Guest: read public BH/rooms; submit leads.
- Owner: full CRUD on BH and Rooms; publish/unpublish; view leads; limited dashboard.
- Super Admin: all privileges including user/role management, higher-level reporting.

## 15. UI States
- loading: skeletons and progress bars
- empty: no results (e.g., no BH/Rooms/Leads)
- error: show actionable error and retry
- no permission: route guard with Not Authorized
- conflict: data conflict (optimistic update with rollback)

## 16. Audit Log
- Record key actions: create/update BH, create/edit Rooms, lead submissions, publish/unpublish, user role changes.

## 17. Notification
- In-app toasts for success/failure on create/update operations; minimal email/Push in Phase 2+.

## 18. Non-Functional Requirements (NFR)
- Performance: paginate long lists; limit payloads; caching where possible.
- Accessibility: aria labels, keyboard navigation, high-contrast tokens.
- Security: proper RBAC guards; audit logs; CSRF protection for write endpoints.
- Internationalization: text tokens for future i18n.

## 19. Epic List
- Epic 1: Public Guest Portal (search, leads)
- Epic 2: Owner Portal (BH, Rooms, Leads, Dashboard)
- Epic 3: Super Admin Portal (user/role/reports)

## 20. User Stories + Acceptance Criteria (high level)
- US1 (Guest): Inquire about a room; can submit a lead; acceptance: lead created with status NEW.
- US2 (Owner): Publish/unpublish BH; acceptance: BH status toggled and public search updated.
- US3 (Owner): CRUDRoom; acceptance: room created/edited; KPI updates reflect changes.
- US4 (Super Admin): Manage Users/Reports; acceptance: user can be created and role assigned; reports export exists.

## 21. Phase 2 / Phase 3
- Phase 2: Booking flow, deposits, contracts, chat, richer permissions.
- Phase 3: Advanced analytics, multi-tenant features, performance urgency.

---
Notes:
- Document MVP scope and future phases; implement with a PRD-driven approach per sprint.
- This doc should be linked to the current codebase (web-admin) and any public portal components to be designed separately.
