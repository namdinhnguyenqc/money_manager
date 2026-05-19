-- =======================================================
-- MONEY MANAGER - Chỉ thêm cột thiếu vào bảng ĐÃ CÓ
-- KHÔNG tạo bảng mới (boarding_houses, rental_*, leads,
-- system_settings đã tồn tại với schema riêng)
-- Chạy 1 lần trong Supabase SQL Editor
-- =======================================================

-- 1. services: thêm type và unit
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS type text DEFAULT 'fixed';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS unit text DEFAULT 'thang';

-- 2. contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS rent_amount              numeric(18,2) DEFAULT 0;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS billing_day              integer DEFAULT 5;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS electric_start           numeric(18,2) DEFAULT 0;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS water_start              numeric(18,2) DEFAULT 0;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS note                     text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS applied_services_snapshot jsonb;

-- 3. tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email text;

-- 4. transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS invoice_id uuid;

-- 5. rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS has_ac      boolean NOT NULL DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS num_people  integer NOT NULL DEFAULT 1;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS area        numeric(10,2) DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS max_people  integer DEFAULT 1;

-- 6. invoices: cho phép thêm status 'overdue'
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('unpaid', 'paid', 'partially_paid', 'sent', 'draft', 'overdue'));

-- 7. Đồng bộ dữ liệu cũ
UPDATE public.contracts
  SET electric_start = COALESCE(initial_electric_reading, 0),
      water_start    = COALESCE(initial_water_reading, 0)
  WHERE electric_start IS NULL OR water_start IS NULL;

-- 8. Index
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON public.transactions(invoice_id);

-- =======================================================
-- XONG! Chỉ thêm cột, không tạo/xóa bảng nào.
-- =======================================================
