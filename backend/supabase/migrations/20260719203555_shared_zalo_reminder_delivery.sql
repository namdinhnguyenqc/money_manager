-- Additive delivery queue for automated Zalo payment reminders. Existing
-- invoice Zalo sends remain compatible because every new column is nullable or
-- has a safe default.
ALTER TABLE public.invoice_zalo_notifications
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS external_key text,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoice_zalo_notifications_external_key
  ON public.invoice_zalo_notifications (external_key)
  WHERE external_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_zalo_notifications_retry_queue
  ON public.invoice_zalo_notifications (next_retry_at, retry_count)
  WHERE send_status = 'FAILED' AND next_retry_at IS NOT NULL;

ALTER TABLE public.invoice_zalo_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_zalo_notifications_select_own ON public.invoice_zalo_notifications;
CREATE POLICY invoice_zalo_notifications_select_own
  ON public.invoice_zalo_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_zalo_notifications.invoice_id
        AND i.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.invoice_zalo_notifications TO authenticated;
GRANT ALL ON public.invoice_zalo_notifications TO service_role;

NOTIFY pgrst, 'reload schema';
