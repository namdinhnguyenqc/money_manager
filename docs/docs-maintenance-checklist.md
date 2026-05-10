# Documentation Maintenance Checklist

Use this checklist whenever code changes affect business logic, APIs, data models, or workflows.

## Before Coding

- [ ] Read `docs/README.md`.
- [ ] Identify which canonical docs cover the touched module.
- [ ] Check active source paths in `codebase-development-guide.md`.
- [ ] Confirm whether the change targets active code or legacy/reference code.
- [ ] Identify whether Supabase/real DB behavior needs verification.

## During Coding

- [ ] Preserve route/query context ids (`facility_id`, `room_id`, `contract_id`, `invoice_id`).
- [ ] Preserve owner profile completion guard.
- [ ] Preserve admin vs owner login separation.
- [ ] Preserve email readonly behavior in profile flows.
- [ ] Preserve field-level server error behavior.
- [ ] Preserve tenant identity validation.
- [ ] Add or update tests for the behavior being changed.

## Docs to Update by Change Type

| Change Type | Required Docs |
|---|---|
| New/changed user flow | `user-flows.md` |
| New/changed entity or status | `domain-model.md` |
| New/changed route/API payload | `api-service-map.md` |
| New/changed auth/guard/data flow | `architecture-data-flow.md` |
| New/changed folder, script, test command | `codebase-development-guide.md` |
| New agent behavior or project rule | `ai-agent-playbook.md` |
| Changed canonical docs structure | `docs/README.md` |

## Verification Checklist

- [ ] Run frontend unit tests: `cd web-admin && npm test`.
- [ ] Run backend tests if backend changed: `cd money-manager-mobile/backend && npm test`.
- [ ] Run frontend build for route/type/component changes: `cd web-admin && npm run build`.
- [ ] Run relevant Playwright E2E if a happy path changed.
- [ ] If tests are skipped, document why and list exact manual steps.

## Manual QA Checklist for Critical Flows

### Owner Onboarding

- [ ] `/login/owner` demo owner can enter dashboard when profile complete.
- [ ] New owner demo redirects to `/complete-profile`.
- [ ] Email is disabled on complete profile.
- [ ] Missing phone shows field error.
- [ ] Duplicate phone shows only phone field error and keeps other typed fields.
- [ ] Successful complete profile redirects to owner workspace.
- [ ] Profile page displays submitted info.
- [ ] Profile settings can update phone/address and keeps email readonly.

### Facilities, Rooms, Contracts

- [ ] `/facilities` lists facility cards.
- [ ] Create facility works.
- [ ] Facility detail keeps tab context.
- [ ] Create room from facility works.
- [ ] Vacant room shows "Tạo hợp đồng".
- [ ] Contract form URL includes `room_id` and `facility_id`.
- [ ] Invalid tenant phone/CCCD is blocked.
- [ ] Valid contract creates tenant/contract and marks room occupied.

### Invoices and Payments

- [ ] Contract detail links to invoice creation.
- [ ] Invoice creation URL includes `contract_id`.
- [ ] Meter readings calculate amount.
- [ ] Duplicate invoice period is rejected.
- [ ] Invoice detail links to `/payments/new?invoice_id=:id`.
- [ ] Payment page requires wallet and valid amount.
- [ ] Bank transfer/e-wallet requires transaction code/note.
- [ ] Successful payment redirects to invoice detail and shows paid state.
- [ ] `/payments` history includes the new payment.

### Public and Admin

- [ ] Public boarding-house list loads.
- [ ] Public detail loads rooms.
- [ ] Public lead creates owner-visible lead/conversation.
- [ ] Public booking creates owner-visible booking.
- [ ] Admin login works with local credentials.
- [ ] Admin users list/detail/status/role/delete still work.

## Documentation Quality Bar

- [ ] A new developer can find the active code path without reading every file.
- [ ] An AI agent can identify required APIs and expected states from docs.
- [ ] Assumptions and unverified production behavior are labeled.
- [ ] Old/historical docs do not contradict the canonical docs without being labeled historical.
