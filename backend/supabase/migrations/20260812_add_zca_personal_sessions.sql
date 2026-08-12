CREATE TABLE IF NOT EXISTS public.invoice_zalo_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number varchar(50) NOT NULL,
  template_id varchar(100) NOT NULL,
  message_payload jsonb NOT NULL,
  send_status varchar(50) NOT NULL CHECK (send_status IN ('PENDING', 'SENT', 'FAILED')),
  zalo_message_id varchar(255),
  error_code integer,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_zalo_notifications_invoice_id
  ON public.invoice_zalo_notifications(invoice_id);

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

CREATE TABLE IF NOT EXISTS public.zca_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credentials_encrypted text NOT NULL,
  display_name text,
  avatar_url text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISCONNECTED', 'ERROR')),
  last_error text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

ALTER TABLE public.zca_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_zalo_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zca_sessions_select_own ON public.zca_sessions;
CREATE POLICY zca_sessions_select_own
  ON public.zca_sessions
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

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

GRANT SELECT ON public.zca_sessions TO authenticated;
GRANT ALL ON public.zca_sessions TO service_role;
GRANT SELECT ON public.invoice_zalo_notifications TO authenticated;
GRANT ALL ON public.invoice_zalo_notifications TO service_role;

ALTER TABLE public.invoice_zalo_notifications
  ADD COLUMN IF NOT EXISTS recipient_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_zalo_notifications_recipient_tenant
  ON public.invoice_zalo_notifications(recipient_tenant_id);

NOTIFY pgrst, 'reload schema';
