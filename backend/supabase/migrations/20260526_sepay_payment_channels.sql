-- SePay auto-reconcile support.

CREATE TABLE IF NOT EXISTS public.payment_channels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('sepay', 'bank_transfer', 'cash', 'manual')),
  display_name text NOT NULL,
  bank_id text,
  account_no text,
  account_name text,
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  auto_reconcile_enabled boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_code text,
  ADD COLUMN IF NOT EXISTS payment_channel_id uuid REFERENCES public.payment_channels(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.sepay_webhook_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_channel_id uuid REFERENCES public.payment_channels(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  sepay_transaction_id text NOT NULL UNIQUE,
  gateway text,
  account_number text,
  transfer_type text,
  transfer_amount numeric(18,2) NOT NULL DEFAULT 0,
  allocated_amount numeric(18,2) NOT NULL DEFAULT 0,
  overpaid_amount numeric(18,2) NOT NULL DEFAULT 0,
  payment_code text,
  status text NOT NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_payment_code
  ON public.invoices(payment_code)
  WHERE payment_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_channels_user_provider
  ON public.payment_channels(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_payment_channels_account
  ON public.payment_channels(account_no)
  WHERE account_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_external_ref
  ON public.transactions(external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sepay_events_invoice
  ON public.sepay_webhook_events(invoice_id);

CREATE INDEX IF NOT EXISTS idx_sepay_events_payment_code
  ON public.sepay_webhook_events(payment_code);

ALTER TABLE public.payment_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sepay_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_channels_owner_policy ON public.payment_channels;
CREATE POLICY payment_channels_owner_policy ON public.payment_channels
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sepay_webhook_events_owner_select_policy ON public.sepay_webhook_events;
CREATE POLICY sepay_webhook_events_owner_select_policy ON public.sepay_webhook_events
  FOR SELECT USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_payment_channels_updated_at ON public.payment_channels;
CREATE TRIGGER trg_payment_channels_updated_at
  BEFORE UPDATE ON public.payment_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
