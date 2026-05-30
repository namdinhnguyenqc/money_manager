CREATE TABLE IF NOT EXISTS public.zalo_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  connection_type varchar(50) NOT NULL CHECK (connection_type IN ('USER', 'OA')),
  zalo_user_id varchar(100),
  oa_id varchar(100),
  oa_name varchar(255),
  oa_avatar text,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  access_token_expires_at timestamp with time zone NOT NULL,
  refresh_token_expires_at timestamp with time zone NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate active connections per owner & type
CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_connections_owner_type ON public.zalo_connections(owner_id, connection_type);

CREATE TABLE IF NOT EXISTS public.zalo_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  oa_id varchar(100) NOT NULL,
  template_id varchar(100) NOT NULL,
  template_name varchar(255) NOT NULL,
  template_type varchar(100),
  status varchar(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_templates_owner_oa_template ON public.zalo_message_templates(owner_id, oa_id, template_id);

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

CREATE INDEX IF NOT EXISTS idx_invoice_zalo_notifications_invoice_id ON public.invoice_zalo_notifications(invoice_id);
