# Legacy Docs Inventory

This file maps older planning/status documents to the canonical documentation set. Do not delete historical files unless a maintainer explicitly asks for cleanup; they still preserve useful conversation and sprint context.

## Replacement Map

| Historical File | Current Use | Canonical Replacement |
|---|---|---|
| `docs/API_INVENTORY_CURRENT.md` | Older API inventory and smoke-test notes. | `api-service-map.md`, `architecture-data-flow.md` |
| `docs/REGISTER_PROFILE_PROFILE_SETTING_PLAN.md` | Original auth/profile plan. | `user-flows.md`, `domain-model.md`, `architecture-data-flow.md` |
| `docs/auth/register-profile.md` | Auth/profile notes. | `user-flows.md`, `ai-agent-playbook.md` |
| `docs/FE_BE_STATUS_MATRIX_v1.md` | Older FE/BE readiness matrix. | `business-context.md`, `api-service-map.md` |
| `docs/FE_BE_GAP_API.md` | API gap analysis. | `api-service-map.md`, `business-context.md` |
| `docs/FE_BE_GAP_DB.md` | DB gap analysis. | `domain-model.md`, `architecture-data-flow.md` |
| `docs/FE_BE_GAP_UI.md` | UI gap analysis. | `user-flows.md`, `codebase-development-guide.md` |
| `docs/FE_BE_MAPPING_v1.md` | Older mapping notes. | `api-service-map.md` |
| `docs/PHASE1_ROOM_RENTAL_SCHEMA.md` | Schema design notes. | `domain-model.md` |
| `docs/STATUS_MVP_v1.md` | MVP status snapshot. | `business-context.md` |
| `docs/manual_testing.md` | Manual QA steps. | `docs-maintenance-checklist.md` |
| `docs/workflow_prd_v1.md` | Product/workflow draft. | `business-context.md`, `user-flows.md` |
| `docs/flow/ADMIN_USER_FULL_FLOW.md` | Admin/user canary flow. | `user-flows.md`, `api-service-map.md` |
| `docs/marketplace/PRD_BOARDING_HOUSE_MARKETPLACE.md` | Long-form future marketplace PRD. | `business-context.md`, `domain-model.md`; keep as future vision reference. |
| `docs/marketplace/PRD_MVP_FLOW_V2.md` | Older MVP flow draft. | `user-flows.md` |
| `docs/sprints/Sprint1_AdminUser*.md` | Sprint planning/backlog. | Use as backlog history; canonical behavior lives in current docs. |
| `money-manager-mobile/*.md` | Earlier QA/runbook artifacts. | `codebase-development-guide.md`, `docs-maintenance-checklist.md` |
| `money-manager-mobile/backend/README.md` | Backend-specific historical README. | `architecture-data-flow.md`, `api-service-map.md` |

## Agent Rule

If a historical doc and a canonical doc disagree:

1. Check active source code.
2. Prefer active source code and canonical docs.
3. If the historical doc describes a missing requirement that is still desired, create a backlog item instead of silently implementing it.

## Needs verification

- Some historical docs describe features that are not fully wired in current runtime, such as realtime, full marketplace search, RLS, PostGIS, outbox workers, and production-grade hold locking.
- Some test result markdown files under `web-admin/playwright-report` and `web-admin/test-results` are generated artifacts. Do not treat them as requirements.
