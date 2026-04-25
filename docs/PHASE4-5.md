Phase 4 & Phase 5 Overview

Phase 4: Web Admin (Next.js)
- Goals
  - Build a full admin UI: Dashboard, User List (search/filter/pagination), User Detail (with login logs), and admin actions (block/unblock, change role, soft delete).
  - Enforce RBAC: ADMIN/SUPER_ADMIN, with server-side guards and client-side checks.
  - Ensure data isolation: all UI/API calls respect user_id and wallet context; admin actions operate only on target accounts and do not leak other users' data.
  - Integrate with backend DB-backed API (Phase 2).
- Deliverables
  - Admin login flow (optional Google Sign-In on web, can fallback to existing login flow).
  - Pages: /admin/users, /admin/users/[id], plus components for lists, modals, and notifications.
  - Confirm dialogs for dangerous actions.
  - Documentation on how to test RBAC and data isolation from the UI.

Phase 5: Rollout & Monitor
- Canary rollout
  - Use feature flags to enable cloud mode for a small cohort for testing.
  - Monitor login latency, admin actions, and data integrity.
- Pilot rollout
  - Expand to larger user groups as metrics meet targets.
- Production rollout
  - Full deployment with rollback plan and monitoring dashboards.

- Data isolation & RBAC notes
  - All admin actions must be permitted by RBAC checks.
  - Ensure auditability for admin actions.

Key Risks
- Data leakage risk if data isolation is not properly enforced in all data access layers.
- RBAC gaps leading to privilege escalation on admin actions.
- Rollback complexity if data migration introduces mismatches.

Recommended next steps
- Finalize Phase 4 UI with complete admin actions and web Google Login integration (if required).
- Prepare CI pipeline to run Phase 2–5 in a single flow and publish logs.
