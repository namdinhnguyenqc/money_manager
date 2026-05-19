-- Migration: Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'contract_created', 'contract_terminated', 'deposit_refunded', 'deposit_updated'
  resource_type VARCHAR(50) NOT NULL, -- 'contract', 'room', 'deposit'
  resource_id UUID,
  details JSONB, -- Store old values, new values, etc.
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster searching
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_resource ON public.audit_logs(user_id, resource_type, resource_id);
