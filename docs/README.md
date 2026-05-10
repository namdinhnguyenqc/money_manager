# Documentation Index

Last reviewed against code: 2026-04-30.

This is the canonical documentation set for AI coding agents and developers. It consolidates the older planning, QA, API inventory, and sprint files into a smaller set of documents that describe what the project currently does, how the code is organized, and how to extend it safely.

## Canonical Docs

| File | Purpose |
|---|---|
| [`business-context.md`](business-context.md) | Product context, users, scope, release posture, and current gaps. |
| [`user-flows.md`](user-flows.md) | Step-by-step user flows and sequence diagrams for auth, owner ops, invoices, payments, public lead/booking, and admin. |
| [`domain-model.md`](domain-model.md) | Domain entities, statuses, invariants, and current vs future data model. |
| [`architecture-data-flow.md`](architecture-data-flow.md) | Runtime architecture, auth/profile guard, data flow, mock vs Supabase behavior, and reliability notes. |
| [`api-service-map.md`](api-service-map.md) | Backend API map and frontend service interactions observed in source. |
| [`codebase-development-guide.md`](codebase-development-guide.md) | Codebase map, local setup, tests, implementation rules, and extension points. |
| [`ai-agent-playbook.md`](ai-agent-playbook.md) | Agent roles, decision flow, primary AI coding prompt, and task execution rules. |
| [`docs-maintenance-checklist.md`](docs-maintenance-checklist.md) | Checklist to keep docs synchronized with code changes. |
| [`legacy-docs-inventory.md`](legacy-docs-inventory.md) | Map of older docs to the canonical docs that now replace or summarize them. |

## Historical Docs

The repository still contains older documents such as `API_INVENTORY_CURRENT.md`, `REGISTER_PROFILE_PROFILE_SETTING_PLAN.md`, `FE_BE_STATUS_MATRIX_v1.md`, sprint files, and marketplace PRDs. Treat them as historical context unless a task explicitly references them. See [`legacy-docs-inventory.md`](legacy-docs-inventory.md) for the replacement map. When historical docs conflict with the canonical docs above, prefer the canonical docs and the current source code.

## Active Implementation Summary

Current primary stack:

- Frontend: Next.js 14 App Router, TypeScript, Tailwind, React Query in `web-admin/`.
- Backend: Hono on Node via `@hono/node-server`, TypeScript, Zod, JWT via `jose`, Supabase-only architecture in `money-manager-mobile/backend/`.
- Local backend URL: `http://localhost:8787`.
- Local frontend URL: `http://localhost:3001`.

Current product focus:

- Owner/admin web portal for room-rental operations.
- Required owner profile onboarding.
- Facilities/boarding houses and rooms.
- Contracts, invoices, and payment collection.
- Public boarding-house listing, lead submission, and booking request.
- Admin user management.

## Known Documentation Rules

- Mark uncertain or not fully verified statements with `Assumption` or `Needs verification`.
- Update docs in the same PR when changing routes, business state machines, entity shapes, or major UI flows.
- Do not require future agents to read all source before starting. Add high-signal code references to the canonical docs instead.
