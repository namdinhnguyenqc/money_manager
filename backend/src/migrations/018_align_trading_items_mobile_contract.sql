ALTER TABLE public.trading_items
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS import_price NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS target_price NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS import_date DATE,
  ADD COLUMN IF NOT EXISTS batch_id TEXT,
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sell_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

UPDATE public.trading_items
SET
  import_price = COALESCE(import_price, buy_price, 0),
  import_date = COALESCE(import_date, buy_date, created_at::date),
  status = CASE
    WHEN status = 'holding' THEN 'available'
    WHEN status IS NULL THEN 'available'
    ELSE status
  END;

ALTER TABLE public.trading_items
  ALTER COLUMN import_price SET DEFAULT 0,
  ALTER COLUMN import_date SET DEFAULT CURRENT_DATE;

ALTER TABLE public.trading_items DROP CONSTRAINT IF EXISTS trading_items_status_check;
ALTER TABLE public.trading_items
  ADD CONSTRAINT trading_items_status_check
  CHECK (status IN ('available', 'sold', 'cancelled', 'holding'));

CREATE INDEX IF NOT EXISTS idx_trading_items_user_wallet_import_date
  ON public.trading_items(user_id, wallet_id, import_date DESC);
