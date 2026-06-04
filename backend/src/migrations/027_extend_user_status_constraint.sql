-- Drop the old check constraint on users.status if it exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;

-- Add updated check constraint to support the approval lifecycle
ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (
  status IN ('ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'BLOCKED', 'DELETED')
);

COMMENT ON CONSTRAINT users_status_check ON public.users IS 'Restricts user account status to valid lifecycle states.';
