-- Enforce idempotency for auto-reconciled payments (e.g. SePay webhooks) at the
-- database level: a given external reference can only be recorded once per user.
-- This is the DB-level backstop for the application guard in applyInvoicePayment,
-- protecting against webhook retries AND concurrent race conditions.

-- Drop the previous non-unique index; the unique index below covers the same lookups.
DROP INDEX IF EXISTS public.idx_transactions_external_ref;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_user_external_ref
  ON public.transactions(user_id, external_ref)
  WHERE external_ref IS NOT NULL;
