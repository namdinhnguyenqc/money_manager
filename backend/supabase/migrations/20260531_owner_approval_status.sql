ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'BLOCKED', 'DELETED'));

CREATE INDEX IF NOT EXISTS idx_users_owner_approval
  ON public.users(role, status, created_at DESC);
