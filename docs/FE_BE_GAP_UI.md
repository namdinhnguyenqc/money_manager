# FE_BE_GAP_UI (MVP v1) – UI Layer Gap Analysis

Overview: UI-focused gaps between FE MVP and BE contracts for MVP v1. Statuses indicate readiness for current MVP scope.

1) Public Guest Portal (UI)
- BH Listing (FE) – Status: Done
- BH Detail (Public) + Rooms (FE) – Status: Done
- LeadForm (Guest) – Status: Done
- Public UI polish (filters, sorts, pagination) – Status: Not Started (Phase 2)

2) Owner Portal (UI)
- BH List & Detail (FE) – Status: Done
- Rooms List & RoomEditModal (FE) – Status: Done
- Leads List (FE) – Status: Done
- Dashboard (FE) – Status: Done
- Publish/Unpublish UI entry for BH (is_public) – Status: Done

3) Super Admin Portal (UI) – Skeleton
- Users (FE) – Status: Done (skeleton)
- Reports (FE) – Status: Done (skeleton)

4) Not Authorized + RBAC (UI)
- Not Authorized page (UI) – Status: Done
- RBAC Guard (UI) – Status: Done

5) KPI Card UI (UI layer)
- KPICard component – Status: Done
- Reuse across BH detail and Dashboard – Status: Done

6) Global UI/UX/Toasts (UI)
- Toastr/Notification placeholders – Status: Not Started (Phase 2)
- AuditLog UI – Status: Not Started (Phase 2)

7) End-to-End UI Flows (UI perspective)
- Owner journey screens implemented; refine with design tokens and accessibility
- Public guest flows implemented; refine with accessibility tokens

8) Gaps/Notes
- Some FE UI polish tasks (spacing, typography, tokens) remain to align with design system.
- NotAuthorized guards consistent across FE with server guard; add more UX copy as needed.
