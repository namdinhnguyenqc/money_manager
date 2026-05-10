-- Migration: 017_deposit_refunds
-- Purpose: Store deposit refund information when a contract ends.

CREATE TABLE IF NOT EXISTS public.deposit_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  original_deposit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  deduction_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  refund_date DATE NOT NULL DEFAULT CURRENT_DATE,
  refund_method VARCHAR(50),
  note TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id) -- One refund per contract
);

CREATE INDEX IF NOT EXISTS idx_deposit_refunds_contract ON public.deposit_refunds(contract_id);
CREATE INDEX IF NOT EXISTS idx_deposit_refunds_user ON public.deposit_refunds(user_id);
