-- file: money-manager-mobile/backend/supabase/migrations/20260501_phase1_updates.sql

-- 1. FIX TRIGGER UPDATED_AT (IDEMPOTENT)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper để add column nếu chưa tồn tại
CREATE OR REPLACE FUNCTION add_column_if_not_exists(t_name text, c_name text, c_type text) 
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = c_name) THEN
        EXECUTE 'ALTER TABLE public.' || t_name || ' ADD COLUMN ' || c_name || ' ' || c_type;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. MỞ RỘNG BẢNG SERVICES (LOẠI DỊCH VỤ & CÁCH TÍNH)
SELECT add_column_if_not_exists('services', 'service_type', 'text DEFAULT ''other''');
SELECT add_column_if_not_exists('services', 'calculation_type', 'text');
SELECT add_column_if_not_exists('services', 'is_required', 'boolean DEFAULT false');
SELECT add_column_if_not_exists('services', 'is_default_selected', 'boolean DEFAULT true');
SELECT add_column_if_not_exists('services', 'metadata', 'jsonb DEFAULT ''{}''::jsonb');

-- Mapping dữ liệu cũ: type -> calculation_type
UPDATE public.services SET calculation_type = type WHERE calculation_type IS NULL;

-- Mapping thông minh service_type từ tên
UPDATE public.services 
SET service_type = CASE 
    WHEN name ILIKE '%điện%' OR name ILIKE '%dien%' THEN 'electricity'
    WHEN name ILIKE '%nước%' OR name ILIKE '%nuoc%' THEN 'water'
    WHEN name ILIKE '%wifi%' OR name ILIKE '%mạng%' THEN 'wifi'
    WHEN name ILIKE '%rác%' OR name ILIKE '%rac%' THEN 'trash'
    WHEN name ILIKE '%xe%' THEN 'parking'
    ELSE 'other'
END
WHERE service_type = 'other';

-- 3. CHỈ SỐ BAN ĐẦU TRONG CONTRACTS
SELECT add_column_if_not_exists('contracts', 'initial_electric_reading', 'numeric(18,2) CHECK (initial_electric_reading >= 0)');
SELECT add_column_if_not_exists('contracts', 'initial_water_reading', 'numeric(18,2) CHECK (initial_water_reading >= 0)');

-- 4. SNAPSHOT TRONG CONTRACT_SERVICES
SELECT add_column_if_not_exists('contract_services', 'service_snapshot', 'jsonb');
SELECT add_column_if_not_exists('contract_services', 'service_name', 'text');
SELECT add_column_if_not_exists('contract_services', 'service_type', 'text');
SELECT add_column_if_not_exists('contract_services', 'calculation_type', 'text');
SELECT add_column_if_not_exists('contract_services', 'unit_price', 'numeric(18,2)');
SELECT add_column_if_not_exists('contract_services', 'unit_price_ac', 'numeric(18,2)');
SELECT add_column_if_not_exists('contract_services', 'unit', 'text');

-- 5. CHI TIẾT CÁCH TÍNH TRONG INVOICE_ITEMS
SELECT add_column_if_not_exists('invoice_items', 'calculation_type', 'text');
SELECT add_column_if_not_exists('invoice_items', 'unit_price', 'numeric(18,2)');
SELECT add_column_if_not_exists('invoice_items', 'quantity', 'numeric(18,2)');
SELECT add_column_if_not_exists('invoice_items', 'start_reading', 'numeric(18,2)');
SELECT add_column_if_not_exists('invoice_items', 'end_reading', 'numeric(18,2)');
SELECT add_column_if_not_exists('invoice_items', 'usage_value', 'numeric(18,2)');
SELECT add_column_if_not_exists('invoice_items', 'unit', 'text');
SELECT add_column_if_not_exists('invoice_items', 'service_snapshot', 'jsonb');

-- 6. CẬP NHẬT RLS POLICIES AN TOÀN
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY['wallets', 'categories', 'transactions', 'rooms', 'tenants', 'contracts', 'services', 'contract_services', 'invoices', 'invoice_items', 'bank_config', 'trading_categories', 'trading_items', 'meter_readings'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Chỉ ENABLE RLS nếu chưa enable
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- Tạo Policy (Idempotent: Drop trước khi tạo)
        EXECUTE format('DROP POLICY IF EXISTS %I_owner_policy ON public.%I', t, t);
        EXECUTE format('CREATE POLICY %I_owner_policy ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t, t);
    END LOOP;
END $$;
