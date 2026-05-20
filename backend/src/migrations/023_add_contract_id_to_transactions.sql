-- Migration 023: Add contract_id and image_uri to transactions table
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_uri TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_contract ON public.transactions(contract_id);
