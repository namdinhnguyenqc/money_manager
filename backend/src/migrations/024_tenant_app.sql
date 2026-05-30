-- =============================================================================
-- Migration 024: TrọCare Tenant App — Tables & schema changes for tenant mobile app
-- =============================================================================
-- This migration adds all tables and columns required by the tenant-facing
-- mobile application, including:
--   • TENANT role for users
--   • tenant_accounts (link users ↔ tenants)
--   • fcm_tokens (push notification device tokens)
--   • notifications (notification history)
--   • tenant_categories & tenant_transactions (personal finance)
--   • Invite code & password columns on tenants
--   • Phone column on users
-- =============================================================================

-- =============================================================================
-- 1. ADD 'TENANT' TO user_role CHECK CONSTRAINT
-- =============================================================================
-- The role column on public.users uses a VARCHAR(20) with an inline CHECK
-- constraint (see migration 016). We must drop and recreate the constraint
-- to include the new TENANT value.
-- Constraint name follows Postgres's default naming: users_role_check

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('USER', 'OWNER', 'ADMIN', 'SUPER_ADMIN', 'TENANT'));

-- =============================================================================
-- 2. ADD `phone` COLUMN TO users TABLE
-- =============================================================================
-- Used for tenant phone-based login. Unique so no two users share a phone.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add unique constraint only if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_phone_key' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_phone_key UNIQUE (phone);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- =============================================================================
-- 3. ADD COLUMNS TO `tenants` TABLE
-- =============================================================================
-- invite_code: 8-char code owner generates so tenant can link their account
-- invite_code_expires_at: expiry timestamp for the invite code
-- invite_status: tracks lifecycle of the invitation
-- password_hash: bcrypt hash for tenant password login

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS invite_code VARCHAR(8),
  ADD COLUMN IF NOT EXISTS invite_code_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add unique constraint on invite_code only if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_invite_code_key' AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_invite_code_key UNIQUE (invite_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_invite_code ON public.tenants(invite_code)
  WHERE invite_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_invite_status ON public.tenants(invite_status);

-- =============================================================================
-- 4. `tenant_accounts` — Links a user (role=TENANT) to a tenant record
-- =============================================================================
-- Each user can be linked to at most one tenant (UNIQUE user_id).
-- Each tenant can be linked to at most one user account (UNIQUE tenant_id).

CREATE TABLE IF NOT EXISTS public.tenant_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  linked_by UUID REFERENCES public.users(id),   -- Owner who invited/linked
  linked_at TIMESTAMPTZ DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'active'   -- active, suspended, unlinked
    CHECK (status IN ('active', 'suspended', 'unlinked'))
);

-- Each user maps to exactly one tenant account and vice-versa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_accounts_user_id_key'
      AND conrelid = 'public.tenant_accounts'::regclass
  ) THEN
    ALTER TABLE public.tenant_accounts ADD CONSTRAINT tenant_accounts_user_id_key UNIQUE (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_accounts_tenant_id_key'
      AND conrelid = 'public.tenant_accounts'::regclass
  ) THEN
    ALTER TABLE public.tenant_accounts ADD CONSTRAINT tenant_accounts_tenant_id_key UNIQUE (tenant_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_accounts_user ON public.tenant_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_accounts_tenant ON public.tenant_accounts(tenant_id);

-- =============================================================================
-- 5. `fcm_tokens` — Firebase Cloud Messaging device tokens
-- =============================================================================
-- Stores device tokens for push notifications. A user may have multiple
-- devices/tokens. Partial index on active tokens speeds up send queries.

CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type VARCHAR(20) NOT NULL               -- ios, android, web
    CHECK (device_type IN ('ios', 'android', 'web')),
  device_name VARCHAR(100),
  app_type VARCHAR(20) NOT NULL DEFAULT 'tenant'  -- tenant, owner
    CHECK (app_type IN ('tenant', 'owner')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A user should not register the same token twice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fcm_tokens_user_token_key'
      AND conrelid = 'public.fcm_tokens'::regclass
  ) THEN
    ALTER TABLE public.fcm_tokens
      ADD CONSTRAINT fcm_tokens_user_token_key UNIQUE (user_id, token);
  END IF;
END $$;

-- Fast lookup: all active tokens for a user
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_active
  ON public.fcm_tokens(user_id, is_active)
  WHERE is_active = true;

-- =============================================================================
-- 6. `notifications` — Notification history / inbox
-- =============================================================================
-- Stores every notification sent to a user for in-app display and history.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  type VARCHAR(50) NOT NULL                       -- invoice_created, payment_success, contract_update, system, ...
    CHECK (type IN ('invoice_created', 'payment_success', 'payment_reminder',
                    'contract_update', 'contract_expiring', 'announcement', 'system')),
  data JSONB NOT NULL DEFAULT '{}',               -- {invoice_id, contract_id, room_id, ...}
  channel VARCHAR(20) NOT NULL DEFAULT 'push'     -- push, in_app, both
    CHECK (channel IN ('push', 'in_app', 'both')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary query: fetch user's notifications newest-first
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- Unread badge count / unread list
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id)
  WHERE is_read = false;

-- =============================================================================
-- 7. `tenant_categories` — Personal finance categories for tenants
-- =============================================================================
-- Tenant users can track personal income/expense with their own category set.
-- is_system = true for default seeded categories.

CREATE TABLE IF NOT EXISTS public.tenant_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  icon VARCHAR(50),
  color VARCHAR(7),                               -- hex color, e.g. #FF5733
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_categories_user
  ON public.tenant_categories(user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_categories_user_type
  ON public.tenant_categories(user_id, type);

-- =============================================================================
-- 8. `tenant_transactions` — Personal finance transactions for tenants
-- =============================================================================
-- Each transaction belongs to a user and optionally a category.
-- source = 'auto_invoice' when the system auto-creates an expense from an invoice.
-- reference_id points to the invoice in that case.

CREATE TABLE IF NOT EXISTS public.tenant_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.tenant_categories(id) ON DELETE SET NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source VARCHAR(30) NOT NULL DEFAULT 'manual'    -- manual, auto_invoice
    CHECK (source IN ('manual', 'auto_invoice')),
  reference_id UUID,                               -- e.g. invoice_id when source = auto_invoice
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary query: user's transactions by date descending
CREATE INDEX IF NOT EXISTS idx_tenant_transactions_user_date
  ON public.tenant_transactions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_transactions_category
  ON public.tenant_transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_tenant_transactions_source
  ON public.tenant_transactions(user_id, source)
  WHERE source = 'auto_invoice';

-- =============================================================================
-- 9. TRIGGERS — auto-update updated_at on new tables
-- =============================================================================
-- Reuses the existing update_updated_at_column() function from migration 016.

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'tenant_accounts',
      'fcm_tokens',
      'tenant_transactions'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
       CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.update_updated_at_column();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- =============================================================================
-- Done. Summary of changes:
-- =============================================================================
-- ✅ users.role CHECK now includes 'TENANT'
-- ✅ users.phone column added (VARCHAR(20), UNIQUE)
-- ✅ tenants table: invite_code, invite_code_expires_at, invite_status, password_hash
-- ✅ tenant_accounts table created
-- ✅ fcm_tokens table created
-- ✅ notifications table created
-- ✅ tenant_categories table created
-- ✅ tenant_transactions table created
-- ✅ updated_at triggers applied to new tables
