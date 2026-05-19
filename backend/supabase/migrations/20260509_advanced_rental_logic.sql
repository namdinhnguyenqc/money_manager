-- Migration: Advanced Deposit & Rent Calculation System

-- 1. Update Room Status check constraint
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check 
  CHECK (status IN ('vacant', 'reserved', 'occupied', 'maintenance', 'inactive'));

-- 2. Create modern deposits table
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  tenant_name VARCHAR(255) NOT NULL,
  tenant_phone VARCHAR(50),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  type VARCHAR(50) NOT NULL, -- 'reservation', 'contract'
  status VARCHAR(50) NOT NULL, -- 'active' (giữ chỗ), 'transferred' (đã vào HĐ), 'refunded' (đã trả), 'cancelled' (đã hủy)
  payment_method VARCHAR(50) DEFAULT 'cash',
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL, -- Link to contract if transferred
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup in the "Tiền cọc" tab
CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON public.deposits(user_id, status);

-- 3. Add settlement_status to contracts to track move-out payment
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(50) DEFAULT 'none'; -- 'none', 'pending', 'paid'
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS settlement_amount NUMERIC(14,2) DEFAULT 0;
