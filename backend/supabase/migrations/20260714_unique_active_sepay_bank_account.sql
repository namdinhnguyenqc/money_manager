-- Prevent one owner from creating multiple active SePay channels for the same
-- bank account. Formatting differences such as spaces and dashes are ignored.

-- Preserve the preferred/newest channel and safely retire any duplicates that
-- already exist before creating the unique index. Existing invoice references
-- are moved to the preserved channel so reconciliation keeps working.
CREATE TEMP TABLE sepay_duplicate_channels ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY
        user_id,
        upper(regexp_replace(coalesce(bank_id, ''), '[^A-Z0-9]', '', 'g')),
        upper(regexp_replace(coalesce(account_no, ''), '[^A-Z0-9]', '', 'g'))
      ORDER BY is_default DESC, updated_at DESC, created_at DESC, id DESC
    ) AS keeper_id,
    row_number() OVER (
      PARTITION BY
        user_id,
        upper(regexp_replace(coalesce(bank_id, ''), '[^A-Z0-9]', '', 'g')),
        upper(regexp_replace(coalesce(account_no, ''), '[^A-Z0-9]', '', 'g'))
      ORDER BY is_default DESC, updated_at DESC, created_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.payment_channels
  WHERE provider = 'sepay'
    AND enabled = true
    AND account_no IS NOT NULL
    AND account_no <> ''
)
SELECT id AS duplicate_id, keeper_id
FROM ranked
WHERE duplicate_rank > 1;

UPDATE public.invoices AS invoice
SET payment_channel_id = duplicate.keeper_id,
    updated_at = now()
FROM sepay_duplicate_channels AS duplicate
WHERE invoice.payment_channel_id = duplicate.duplicate_id;

UPDATE public.payment_channels AS channel
SET enabled = false,
    is_default = false,
    updated_at = now()
FROM sepay_duplicate_channels AS duplicate
WHERE channel.id = duplicate.duplicate_id;

-- Store a canonical representation so future webhook account matching is
-- deterministic even when old data contained spaces or punctuation.
UPDATE public.payment_channels
SET bank_id = upper(regexp_replace(coalesce(bank_id, ''), '[^A-Z0-9]', '', 'g')),
    account_no = upper(regexp_replace(coalesce(account_no, ''), '[^A-Z0-9]', '', 'g')),
    updated_at = now()
WHERE provider = 'sepay';

-- A configured wallet means the channel is ready for automatic reconciliation.
UPDATE public.payment_channels
SET auto_reconcile_enabled = true,
    updated_at = now()
WHERE provider = 'sepay'
  AND enabled = true
  AND wallet_id IS NOT NULL
  AND auto_reconcile_enabled = false;

-- Guarantee at most one valid default per owner, preferring the existing
-- default and then the most recently updated channel.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY is_default DESC, updated_at DESC, created_at DESC, id DESC
    ) AS default_rank
  FROM public.payment_channels
  WHERE provider = 'sepay'
    AND enabled = true
    AND wallet_id IS NOT NULL
)
UPDATE public.payment_channels AS channel
SET is_default = (ranked.default_rank = 1),
    updated_at = now()
FROM ranked
WHERE channel.id = ranked.id
  AND channel.is_default IS DISTINCT FROM (ranked.default_rank = 1);

-- Repair invoices that have a payment code but no channel so new webhook
-- receipts resolve to the owner's valid default SePay channel.
WITH owner_defaults AS (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.payment_channels
  WHERE provider = 'sepay'
    AND enabled = true
    AND auto_reconcile_enabled = true
    AND wallet_id IS NOT NULL
  ORDER BY user_id, is_default DESC, updated_at DESC, id DESC
)
UPDATE public.invoices AS invoice
SET payment_channel_id = owner_defaults.id,
    updated_at = now()
FROM owner_defaults
WHERE invoice.user_id = owner_defaults.user_id
  AND invoice.payment_code IS NOT NULL
  AND invoice.payment_channel_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_sepay_channel_bank_account
  ON public.payment_channels (
    user_id,
    upper(regexp_replace(coalesce(bank_id, ''), '[^A-Z0-9]', '', 'g')),
    upper(regexp_replace(coalesce(account_no, ''), '[^A-Z0-9]', '', 'g'))
  )
  WHERE provider = 'sepay'
    AND enabled = true
    AND account_no IS NOT NULL
    AND account_no <> '';
