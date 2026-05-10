# Codebase and Development Guide

## Repository Map

| Path | Current Role |
|---|---|
| `web-admin/` | Active Next.js admin/owner/public web app. |
| `web-admin/src/app/(owner-ops)/` | Owner operations pages with clean URLs: `/facilities`, `/contracts`, `/invoices`, `/payments`, `/settings`. |
| `web-admin/src/app/owner/` | Owner shell routes, dashboard, profile, legacy owner module pages, bookings, messages, notifications, trading. |
| `web-admin/src/app/admin/` | Admin user management. |
| `web-admin/src/app/public/` | Public boarding-house pages. |
| `web-admin/src/components/owner/OwnerWorkspaceShell.tsx` | Owner sidebar, auth/profile guard, workspace layout. |
| `web-admin/src/components/profile/ProfileFormCard.tsx` | Shared complete-profile/settings form. |
| `web-admin/src/lib/rentalOps.ts` | Main FE service/domain helper for owner rental operations. |
| `web-admin/src/utils/apiClient.ts` | Main FE API helper. |
| `money-manager-mobile/backend/src/index.ts` | Active Hono backend entrypoint. |
| `money-manager-mobile/backend/src/routes/` | Active Hono route modules plus some legacy Express-style route files. |
| `money-manager-mobile/backend/src/migrations/` | SQL migrations. |
| `money-manager/` | Legacy Vite React app. Reference only unless task targets legacy. |
| `money-manager-backend-express/` | Legacy Express backend. Reference only unless task targets legacy. |

## Local Setup

From repository root:

```bash
npm run local
```

This starts:

- Backend: `npm --prefix money-manager-mobile/backend run dev`
- Frontend: `npm --prefix web-admin run dev`

Run frontend tests:

```bash
cd web-admin
npm test
npm run build
```

Run backend tests:

```bash
cd money-manager-mobile/backend
npm test
```

```

## Implementation Rules

1. **Preserve context IDs in URLs.**
   - Contract create requires `room_id` and `facility_id`.
   - Invoice create requires `contract_id`.
   - Payment create requires `invoice_id`.
   - Do not ask users to type these ids manually.

2. **Do not bypass profile completion.**
   - Owner/user business routes must remain guarded in FE and BE.
   - On `PROFILE_REQUIRED`, redirect to `/complete-profile`.

3. **Keep field-level errors local.**
   - Server field errors should render under fields and preserve all other form values.
   - Profile duplicate phone errors use `details.fieldErrors.phone`.

4. **Validate before API call when UX needs immediate feedback.**
   - Tenant phone/CCCD validation exists in `rentalOps.ts`.
   - Backend still validates with Zod.

5. **Use UUID strings for all entity IDs.**
   - All ids are strings.
   - Do not use `Number(id)` for ID comparisons.

6. **Do not silently switch payment flow.**
   - Current FE: create transaction, then mark invoice paid.
   - Backend combined endpoint exists but is not current FE behavior.

7. **Migration 016 is the source of truth for the schema.**
   - It defines the UUID-based schema for all active tables.

## Common Extension Points

### Add a New Owner Operations Page

1. Add page under `web-admin/src/app/(owner-ops)/...` if it should have a top-level URL.
2. Ensure route is covered by `web-admin/middleware.ts` if protected.
3. Add sidebar entry in `OwnerWorkspaceShell` if it is a primary module.
4. Add service functions to `web-admin/src/lib/rentalOps.ts` or a focused new lib file.
5. Add backend route to `money-manager-mobile/backend/src/routes/*` and mount in `src/index.ts` if needed.
6. Add unit test for service/validation and E2E smoke for the main happy path.
7. Update canonical docs.

### Add a New API Field

1. Add backend validation schema.
2. Map snake_case/camelCase consistently in route response.
3. Update FE TypeScript type.
4. Update service payload.
5. Update UI form/table/display.
6. Add test for validation and response mapping.
7. Update `api-service-map.md` and `domain-model.md`.

### Add a New Domain Status

1. Update backend enum/schema.
2. Update `StatusBadge` mapping if visible.
3. Update normalizer helpers in `rentalOps.ts`.
4. Update filters/tabs where applicable.
5. Add regression test.
6. Update `domain-model.md`.

### Migrate Runtime to `rental_*`

This is a larger cross-cutting task. Minimum steps:

1. Create a migration plan that maps current `boarding_houses`/`rooms` and legacy rental tables into `rental_buildings`/`rental_rooms`.
2. Decide whether FE APIs keep the same endpoint contracts.
3. Update backend route modules one aggregate at a time.
4. Add compatibility or data backfill tests.
5. Verify Supabase migration execution.
6. Update `domain-model.md`, `architecture-data-flow.md`, and `api-service-map.md`.

## Testing Guide

### Unit/Integration

- `web-admin/__tests__/ProfileFormCard.test.tsx`: profile form server-field error preservation.
- `web-admin/__tests__/rentalOps.validation.test.tsx`: tenant validation helpers.
- `money-manager-mobile/backend/test/*`: backend auth/profile tests. Some test files target legacy Express-style routes and should be treated carefully.

### E2E

Useful Playwright specs:

- `owner-profile-onboarding.spec.ts`
- `owner-rental-billing-flow.spec.ts`
- `owner-full-flow.spec.ts`
- `owner-legacy-modules.spec.ts`

Before E2E, start backend/frontend local servers and reset mock state.

## Known Code Quality Risks

- There are duplicate/legacy route files under `money-manager-mobile/backend/src/routes/*Routes.ts` and active Hono route files. Check `src/index.ts` to know what is mounted.
- There are duplicate frontend app families: current `web-admin`, legacy `money-manager`, and `web-admin/src/legacy`.
- Some generated `.next`, `playwright-report`, and `test-results` files are present in the working tree; do not use them as source of truth.
- Some docs and migrations are historical or forward-looking; prefer current route/page/service code when in doubt.
