-- =============================================================================
-- Migration 016: Full UUID Reset — Clean schema for all app tables
-- =============================================================================
-- This migration creates ALL application tables from scratch with UUID PKs.
-- It does NOT touch Supabase Auth schema (auth.users).
-- All entity IDs are uuid. All FKs are uuid.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. AUTH & USERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'OWNER', 'ADMIN', 'SUPER_ADMIN')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'DELETED')),
  provider VARCHAR(20) NOT NULL DEFAULT 'GOOGLE',
  google_id VARCHAR(255) UNIQUE,
  is_profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_step VARCHAR(50) NOT NULL DEFAULT 'COMPLETE_PROFILE',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  province_code TEXT,
  province_name TEXT,
  district_code TEXT,
  district_name TEXT,
  address_line TEXT,
  full_address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  avatar TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON public.refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'GOOGLE',
  ip_address VARCHAR(50),
  device_info TEXT,
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL,
  fail_reason VARCHAR(100)
);

-- =============================================================================
-- 2. FINANCE: WALLETS, CATEGORIES, TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'rental', 'trading')),
  icon VARCHAR(50),
  color VARCHAR(20),
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_wallet ON public.categories(wallet_id);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  invoice_id UUID, -- FK added after invoices table creation
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);

-- =============================================================================
-- 3. TRADING
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trading_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trading_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.trading_categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  buy_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(14,2),
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'sold', 'cancelled')),
  buy_date DATE,
  sell_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trading_items_user ON public.trading_items(user_id);

-- =============================================================================
-- 4. RENTAL: BOARDING HOUSES, ROOMS, TENANTS, CONTRACTS, SERVICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.boarding_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boarding_houses_owner ON public.boarding_houses(owner_id);

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  boarding_house_id UUID REFERENCES public.boarding_houses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  area NUMERIC(10,2) DEFAULT 0,
  max_people INTEGER DEFAULT 1,
  num_people INTEGER DEFAULT 1,
  has_ac BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_user ON public.rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_boarding_house ON public.rooms(boarding_house_id);

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email TEXT,
  id_card VARCHAR(20),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_user ON public.tenants(user_id);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  unit VARCHAR(50),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_price_ac NUMERIC(14,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_user ON public.services(user_id);

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  deposit NUMERIC(14,2) NOT NULL DEFAULT 0,
  rent_amount NUMERIC(14,2),
  billing_day INTEGER DEFAULT 5,
  electric_start NUMERIC(14,2) DEFAULT 0,
  water_start NUMERIC(14,2) DEFAULT 0,
  occupant_count INTEGER DEFAULT 1,
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
  applied_services_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_user ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_room ON public.contracts(room_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

CREATE TABLE IF NOT EXISTS public.contract_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  UNIQUE(contract_id, service_id)
);

-- =============================================================================
-- 5. INVOICES & METER READINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  room_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  previous_debt NUMERIC(14,2) NOT NULL DEFAULT 0,
  elec_old NUMERIC(14,2),
  elec_new NUMERIC(14,2),
  water_old NUMERIC(14,2),
  water_new NUMERIC(14,2),
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  note TEXT,
  transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_room ON public.invoices(room_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON public.invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON public.invoices(year, month);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(14,2),
  quantity NUMERIC(14,3),
  start_reading NUMERIC(14,3),
  end_reading NUMERIC(14,3),
  usage_value NUMERIC(14,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS public.meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  reading_value NUMERIC(14,3) NOT NULL,
  reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meter_readings_room ON public.meter_readings(room_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_contract ON public.meter_readings(contract_id);

-- =============================================================================
-- 6. BANK CONFIG & SYSTEM SETTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bank_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  account_name VARCHAR(255),
  branch VARCHAR(255),
  qr_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'string',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, key)
);

-- =============================================================================
-- 7. ADD FK from transactions.invoice_id → invoices.id
-- =============================================================================

ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_invoice
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- =============================================================================
-- 8. TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with updated_at column
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
    AND table_name NOT LIKE 'rental_%'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I; CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END;
$$;
