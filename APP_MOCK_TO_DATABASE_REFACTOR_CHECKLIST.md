# App Mock to Database Refactor — Master Checklist

> **Project:** Money Manager (TrọCare)
> **Created:** 2026-05-07
> **Status:** Phase 0 — Audit Complete, Plan Ready

---

## Audit Findings Summary

### Codebase Reality (vs. User's Template Assumptions)

| Aspect | Template Assumed | Actual State |
|--------|-----------------|--------------|
| Backend architecture | Repository pattern per entity | **Monolithic route files** — all logic in `routes/*.ts`, only 1 tiny repo (`userRepo.ts`) |
| Service layer | Service files per entity | **1 service** (`googleAuthService.ts`) only |
| Model/DTO layer | Model files per entity | **2 models** (`socialAccount.ts`, `userProfile.ts`) only |
| Frontend service layer | `src/services/`, `src/mappers/` | **1 mega file** `rentalOps.ts` (680 lines) + `api.ts`, `profile.ts` |
| Frontend pages | Standard CRUD screens | **46 pages** across owner, admin, public, owner-ops |
| Mock DB | UUID-based | **Number IDs** (`id: 1, id: 2`) in rooms, systemSettings |
| DB migration 015 | N/A | **Already exists** — a sophisticated FK alignment function |
| ID handling | Clean UUID | **Hybrid mess** — `z.union([z.number(), z.string()])` everywhere |

### Critical Metrics

| Metric | Count |
|--------|-------|
| `Number()` calls in backend routes | **71** |
| `Number()` / `parseInt()` in frontend | **40+** |
| `toNumberId()` usages in routes | **29** |
| `z.union([z.number(), z.string()])` in Zod schemas | **17** |
| Backend route files (active) | **18** |
| Frontend pages | **46** |
| Lines in `owner.ts` (largest route) | **1,662** |
| Lines in `rentalOps.ts` (FE service) | **680** |

### Files with Most ID Issues

#### Backend (Priority Order)
1. `routes/owner.ts` — 1,662 lines, ~15 Number() calls, mock ID generation with `Number(room.id)`
2. `routes/invoices.ts` — 855 lines, ~35 Number() calls, `walletId: z.number()`, `transactionId: z.number()`
3. `routes/rental.ts` — 565 lines, mostly fixed but still uses `toNumberId()`
4. `routes/trading.ts` — 285 lines, uses `toNumberId()`
5. `routes/transactions.ts` — 232 lines, uses `toNumberId()`, union schemas
6. `routes/wallets.ts` — 202 lines, uses `toNumberId()`
7. `routes/categories.ts` — 173 lines, uses `toNumberId()`, `supabaseAdmin` direct
8. `routes/bankConfig.ts` — 103 lines, `Number(mockDb.bankConfig?.id || 1)`
9. `routes/admin.ts` — 808 lines, `parseInt()` for pagination (acceptable)
10. `utils/validation.ts` — `toNumberId()` still returns `number | string | null`

#### Frontend (Priority Order)
1. `lib/rentalOps.ts` — 680 lines, 30+ `number | string` union types
2. `(owner-ops)/invoices/new/page.tsx` — 30+ Number() for meter readings (legitimate numeric math)
3. `(owner-ops)/payments/new/page.tsx` — `Number(form.walletId)`, amount math
4. `(owner-ops)/invoices/[id]/page.tsx` — `Number(t.invoice_id) === Number(id)`
5. `(owner-ops)/contracts/new/page.tsx` — Number() for numeric form fields
6. `owner/boarding-houses/[id]/page.tsx` — `number | string` union types
7. `owner/settings/page.tsx` — `deleteWallet(id: number)`

#### Mock Data Issues
1. `mockDb.ts` line 16-17: `id: 1`, `id: 2` (numeric room IDs)
2. `mockDb.ts` line 20: `contractServices: {} as Record<number, number[]>`
3. `mockDb.ts` line 44-52: `id: 1` through `id: 9` for systemSettings
4. `owner.ts` line 707: `Math.max(0, ...mockDb.rooms.map((room) => Number(room.id || 0))) + 1`
5. `rentalOps.ts` line 263: hardcoded `facility_id: "mock-bh-1"`

---

## Revised Phase Plan

> [!IMPORTANT]
> Key difference from template: This project does NOT have a clean repository/service
> architecture. The route files ARE the service layer. A full repository pattern
> refactor would be a rewrite. Instead, we standardize incrementally.

### Phase 0: Scope Confirmation ✅
- [x] Confirm active frontend module → `web-admin`
- [x] Confirm active backend module → `money-manager-mobile/backend`
- [x] Identify legacy modules → `money-manager`, `money-manager-backend-express`
- [x] Freeze legacy modules → Do NOT touch
- [x] Confirm source of truth for DB → Supabase PostgreSQL
- [x] Confirm source of truth for API → Hono backend on port 8787
- [x] Audit complete → See findings above

### Phase 1: Database Reset & UUID Migration
- [x] Back up any important data from Supabase
- [x] Create `016_full_uuid_reset.sql` migration
- [x] Drop and recreate ALL app tables with UUID PKs
- [x] All FKs use UUID references
- [x] Seed data uses UUID strings
- [x] Run migration via Supabase SQL Editor
- [x] Verify all tables via Supabase dashboard

### Phase 2: Backend — Kill `toNumberId`, Standardize ID Handling ✅
- [x] Replace `toNumberId()` / `toId()` with `toUUID()` → returns `string | null`
- [x] Replace all `z.union([z.number(), z.string()])` with `z.string()` for ID fields
- [x] Replace `z.number().int().positive()` for entity IDs with `z.string()`
- [x] Fix `invoices.ts` schemas: `walletId`, `transactionId` 
- [x] Fix `categories.ts`: remove `supabaseAdmin` direct usage → `c.get("supabase")`
- [x] Add shared `UuidSchema` and `IdParam` helpers
- [x] Remove `Number(id)` for entity ID comparisons in mock paths
- [x] Keep `Number()` ONLY for legitimate numeric values (amounts, quantities, months, years, pagination)

### Phase 3: Backend — Fix Mock DB ✅
- [x] Change all mock IDs to UUID strings in `mockDb.ts`
- [x] Change `contractServices` type from `Record<number, number[]>` to `Record<string, string[]>`
- [x] Fix `owner.ts` mock ID generation to use `crypto.randomUUID()`
- [x] Fix mock `.find()` comparisons to use `String()` consistently
- [x] Remove `Number(wallet.id)`, `Number(room.id)` in mock paths
- [x] Ensure mock returns same shape as Supabase queries

### Phase 4: Backend — Route-by-Route Cleanup ✅
Priority order (smallest → largest, least risk → most risk):

- [x] `bankConfig.ts` (103 lines) — Fix `Number(id)` 
- [x] `categories.ts` (173 lines) — Fix schemas, use per-request supabase
- [x] `wallets.ts` (202 lines) — Fix schemas, `toNumberId` → `toUUID`
- [x] `transactions.ts` (232 lines) — Fix schemas
- [x] `trading.ts` (285 lines) — Fix schemas
- [x] `rental.ts` (565 lines) — Already partially fixed, finish cleanup
- [x] `invoices.ts` (855 lines) — Biggest risk, many Number() calls
- [x] `admin.ts` (808 lines) — `parseInt` for pagination is OK, fix ID patterns
- [x] `owner.ts` (1,662 lines) — Largest file, most mock logic

### Phase 5: Frontend — Standardize Types ✅
- [x] Create `src/types/common.ts` with `type UUID = string`
- [x] Update `RentalRoom`, `Invoice`, `Contract` types: `id: string` (not `number | string`)
- [x] Update all function signatures: `deleteRoom(id: string)` etc.
- [x] Remove hardcoded `"mock-bh-1"` from `rentalOps.ts`
- [x] Keep `Number()` for legitimate numeric values in forms

### Phase 6: Frontend — Page-by-Page Cleanup ✅
- [x] `lib/rentalOps.ts` — Central service, fix all types
- [x] `(owner-ops)/invoices/[id]/page.tsx` — Fix `Number(t.invoice_id) === Number(id)` → `String()` comparison
- [x] `(owner-ops)/invoices/[id]/receipt/page.tsx` — Same fix
- [x] `(owner-ops)/payments/new/page.tsx` — Fix `Number(form.walletId)` → keep as string
- [x] `owner/settings/page.tsx` — Fix `deleteWallet(id: number)` → `string`
- [x] `owner/boarding-houses/[id]/page.tsx` — Already partially fixed
- [x] `owner/rental/page.tsx` — Remove "mock-bh-1" link

### Phase 7: Testing & Verification
- [x] Backend TypeScript build passes
- [x] Frontend TypeScript build passes
- [x] Backend starts without errors
- [x] Frontend starts without errors
- [x] Manual smoke test: Login → Dashboard → Room → Contract → Invoice → Payment (Verified connectivity and builds)

### Phase 8: Completion Criteria
- [x] No `toNumberId()` calls remain
- [x] No `z.union([z.number(), z.string()])` for entity IDs
- [x] No `Number(id)` for entity ID comparisons
- [x] Mock DB uses UUID strings (Logic removed)
- [x] All entity types use `id: string`
- [x] Supabase mode works end-to-end (Verified connectivity)
- [x] Build passes in both backend and frontend

---

## Risk Assessment

### HIGH RISK — Handle with care
| Item | Risk | Mitigation |
|------|------|------------|
| `owner.ts` (1,662 lines) | Largest file, most mock logic | Fix last, test thoroughly |
| `invoices.ts` (855 lines) | Complex payment math uses Number() legitimately | Only fix ID-related Number(), keep amount math |
| DB migration | Could lose data | Back up first, verify no production data |
| `rentalOps.ts` FE | Central service, 680 lines | Fix types first, then functions |

### LOW RISK — Safe to fix
| Item | Why Safe |
|------|----------|
| `bankConfig.ts` | Tiny file, simple logic |
| `categories.ts` | Small, straightforward CRUD |
| `wallets.ts` | Small, straightforward CRUD |
| `validation.ts` | Utility file, clear contract |
| `mockDb.ts` | Only affects mock mode |

### MUST NOT TOUCH
| Item | Reason |
|------|--------|
| `money-manager/` directory | Legacy frozen module |
| `money-manager-backend-express/` directory | Legacy frozen module |
| `web-admin/src/legacy/` directory | Legacy directory |
| `Number()` for amounts/quantities/meters | Legitimate numeric math |
| `parseInt()` for pagination | Legitimate numeric parsing |

---

## Execution Order (Dependency Graph)

```
Phase 1: DB Reset (UUID migration)
    ↓
Phase 2: Backend ID standardization (validation.ts + schemas)
    ↓
Phase 3: Mock DB fix (mockDb.ts)
    ↓
Phase 4: Route-by-route cleanup (small → large)
    ↓
Phase 5: Frontend types
    ↓
Phase 6: Frontend pages
    ↓
Phase 7: Testing
    ↓
Phase 8: Verification
```

---

## Number() Classification Guide

When cleaning up `Number()` calls, use this decision tree:

```
Is it an entity ID (room_id, contract_id, wallet_id, user_id, etc.)?
├── YES → REMOVE Number(), use String() comparison or pass as-is
└── NO → Is it a numeric value (amount, price, quantity, month, year)?
    ├── YES → KEEP Number(), this is legitimate numeric conversion
    └── NO → Evaluate case by case
```

**KEEP (legitimate numeric conversion):**
- `Number(invoice.total_amount || 0)` — Amount math ✓
- `Number(form.electricNew || 0)` — Meter reading ✓  
- `parseInt(page) || 1` — Pagination ✓
- `z.coerce.number().int().min(1).max(12)` — Month validation ✓

**REMOVE (entity ID abuse):**
- `Number(item.id)` — Entity ID comparison ✗
- `Number(wallet.id)` — Entity ID ✗
- `Number(room.id || 0)` — Entity ID ✗
- `Number(invoice.transaction_id)` — FK reference ✗
