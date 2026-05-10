-- Money Manager - Full Supabase Schema
-- Phase: 1 (Maintenance & Expansion)
-- Last Updated: 2026-05-01

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SHARED FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. CORE TABLES
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id text UNIQUE,
    email text UNIQUE NOT NULL,
    name text,
    avatar text,
    role text DEFAULT 'USER', -- USER, OWNER, ADMIN, SUPER_ADMIN
    status text DEFAULT 'ACTIVE',
    provider text DEFAULT 'GOOGLE',
    last_login_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallets (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('personal', 'rental', 'trading')),
    icon text,
    color text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    icon text,
    color text,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    wallet_id bigint NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    parent_id bigint REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    amount numeric(18,2) NOT NULL CHECK (amount >= 0),
    description text,
    category_id bigint REFERENCES public.categories(id) ON DELETE SET NULL,
    wallet_id bigint NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    image_uri text,
    date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. RENTAL TABLES
CREATE TABLE IF NOT EXISTS public.rooms (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    price numeric(18,2) NOT NULL CHECK (price >= 0),
    status text NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied')),
    has_ac boolean NOT NULL DEFAULT false,
    num_people integer NOT NULL DEFAULT 1 CHECK (num_people > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    id_card text,
    address text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    service_type text DEFAULT 'other', -- electricity, water, wifi, etc.
    calculation_type text DEFAULT 'fixed', -- fixed, metered, per_person
    unit_price numeric(18,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    unit_price_ac numeric(18,2) NOT NULL DEFAULT 0 CHECK (unit_price_ac >= 0),
    unit text NOT NULL DEFAULT 'thang',
    icon text,
    is_required boolean DEFAULT false,
    is_default_selected boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contracts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date,
    deposit numeric(18,2) NOT NULL DEFAULT 0 CHECK (deposit >= 0),
    occupant_count integer,
    initial_electric_reading numeric(18,2) DEFAULT 0,
    initial_water_reading numeric(18,2) DEFAULT 0,
    applied_services_snapshot jsonb, -- Array of service snapshots at contract start
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_services (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    -- Snapshots for historical auditing
    service_name text,
    service_type text,
    calculation_type text,
    unit_price numeric(18,2),
    unit_price_ac numeric(18,2),
    unit text,
    service_snapshot jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (contract_id, service_id)
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
    contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
    year integer NOT NULL CHECK (year >= 2000),
    room_fee numeric(18,2) NOT NULL DEFAULT 0 CHECK (room_fee >= 0),
    total_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    paid_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    previous_debt numeric(18,2) NOT NULL DEFAULT 0 CHECK (previous_debt >= 0),
    status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partially_paid', 'sent', 'draft')),
    elec_old numeric(18,2),
    elec_new numeric(18,2),
    water_old numeric(18,2),
    water_new numeric(18,2),
    transaction_id bigint REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, contract_id, month, year)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
    name text NOT NULL,
    detail text,
    amount numeric(18,2) NOT NULL CHECK (amount >= 0),
    -- Detailed billing metadata
    calculation_type text,
    unit_price numeric(18,2),
    quantity numeric(18,2),
    start_reading numeric(18,2),
    end_reading numeric(18,2),
    usage_value numeric(18,2),
    unit text,
    service_snapshot jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. OTHER TABLES
CREATE TABLE IF NOT EXISTS public.bank_config (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_id text NOT NULL,
    account_no text NOT NULL,
    account_name text NOT NULL,
    qr_uri text,
    user_avatar text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. SECURITY (RLS)
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY['users', 'wallets', 'categories', 'transactions', 'rooms', 'tenants', 'contracts', 'services', 'contract_services', 'invoices', 'invoice_items', 'bank_config'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I_owner_policy ON public.%I', t, t);
        EXECUTE format('CREATE POLICY %I_owner_policy ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t, t);
    END LOOP;
END $$;

-- 7. TRIGGERS
CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_contract_services_updated_at BEFORE UPDATE ON public.contract_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoice_items_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bank_config_updated_at BEFORE UPDATE ON public.bank_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_user ON public.rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_room_status ON public.contracts(user_id, room_id, status);
CREATE INDEX IF NOT EXISTS idx_services_user_active ON public.services(user_id, active);
CREATE INDEX IF NOT EXISTS idx_invoices_user_period ON public.invoices(user_id, year, month);
