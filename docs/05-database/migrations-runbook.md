# Database Migrations Runbook

This document details the database migrations architecture, naming rules, environment configurations, and deployment strategies for the TrọCare platform.

---

## 1. Migration Source of Truth

All database migrations are maintained as standalone raw SQL script files under the following canonical folder:
👉 **`backend/src/migrations/`**

### Naming Conventions
Migration files must use the prefixing sequence format:
`XXX_description.sql`

#### Examples
- `016_full_uuid_reset.sql`
- `017_deposit_refunds.sql`
- `021_room_contract_fields.sql`
- `022_indexes.sql`

---

## 2. Canonical Migration Ledger

Below is the verified audit list of current schema migrations. Any modification to scripts `001` through `016` is strictly forbidden to preserve database integrity.

| Migration Script | Scope / Target | Action Details |
|---|---|---|
| `016_full_uuid_reset.sql` | Core Identity & Schema Baseline | Re-initializes schema, resetting all tables to utilize UUID primary/foreign keys (`users`, `rooms`, `contracts`, `refresh_tokens`). |
| `017_deposit_refunds.sql` | Lease Terminations | Spawns `deposit_refunds` table to trace transaction settlements when contracts end. |
| `018_fix_users_columns.sql` | Landlord Onboarding | Appends registration details to `users` (full name, phone, CCCD fields). |
| `019_align_trading_items_mobile_contract.sql` | Sync and Ledger alignment | Enforces data shape alignment between local ledger tools and mobile contracts. |
| `020_add_room_types.sql` | Inventory Categorization | Adds `room_types` taxonomy. |
| `021_room_contract_fields.sql` | Operational Room Parameters | Appends square meter area, maximum capacity, and base utility fees directly onto room configurations. |
| `022_indexes.sql` | SQL Query Optimizations | Introduces critical indexes supporting full-text search, owner dashboards, and public listings. Uses standard index creation (no `CONCURRENTLY`). |
| `023_add_contract_id_to_transactions.sql` | Transaction-Contract Linking | Adds `contract_id` (UUID FK → contracts) and `image_uri` (TEXT) columns to `transactions` table. Adds `idx_transactions_contract` index. |

---

## 3. Migration Deployment Runbook

### Environment A: Local Development (Dockerized Supabase)

To execute a migration script on your local Postgres container:

1. **Supabase CLI Integration**:
   If local CLI is active, place scripts inside `supabase/migrations/` and execute:
   ```bash
   supabase db reset
   ```
2. **Raw Node Execution**:
   Alternatively, you can trigger specific custom files using the programmatic runner script:
   ```bash
   cd backend
   npx tsx src/run_migration_017.ts
   ```

### Environment B: Staging & Production (Supabase Cloud Console)

Production deployments use automated migration tasks or manual safety checks via the Supabase Cloud SQL Editor.

1. **Step 1**: Access the Supabase Cloud dashboard and choose the production project.
2. **Step 2**: Open the **SQL Editor** from the primary menu sidebar.
3. **Step 3**: Click **New Query** to spawn an empty transaction block editor.
4. **Step 4**: Open the target SQL migration script (e.g., `backend/src/migrations/022_indexes.sql`) and paste its content.
5. **Step 5**: Review the SQL query carefully. Click **Run** to execute the migration.
6. **Step 6**: Validate schema alignment by exploring the database schema navigator.

---

## 4. Engineering Rules & Design Invariants

Developers MUST adhere to the following rules when authoring database migrations:

> [!WARNING]
> **No Manual Transaction Modifiers**
> - Do NOT include explicit `COMMIT;`, `ROLLBACK;`, or `BEGIN;` statements in migration scripts. Supabase and script runners wrap scripts in transactions automatically; manually declaring them causes runtime compilation errors.

> [!IMPORTANT]
> **No Concurrently Declared Indexes**
> - PostgreSQL prohibits `CREATE INDEX CONCURRENTLY` inside standard transaction blocks.
> - When generating migration scripts, standard `CREATE INDEX` must be used. Production concurrent index creations must be run out-of-band outside migrations.

> [!CAUTION]
> **Schema Lock Integrity**
> - Script sequences `001` to `016` serve as the absolute baseline. Editing these historical files is prohibited.
> - To make schema adjustments, developers must append a new sequential file (e.g., `023_add_new_feature_table.sql`).
