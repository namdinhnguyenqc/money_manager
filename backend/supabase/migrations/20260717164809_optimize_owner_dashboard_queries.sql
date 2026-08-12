-- Matches the owner dashboard's current-month ledger lookup:
-- WHERE user_id = ? AND date >= ? ORDER BY date DESC LIMIT 300.
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_desc
  ON public.transactions (user_id, date DESC);

-- The dashboard only reads deposits that are still being held. A partial index
-- is smaller and cheaper to maintain than another full-table status index.
CREATE INDEX IF NOT EXISTS idx_deposits_holding_user_created_desc
  ON public.deposits (user_id, created_at DESC)
  INCLUDE (amount)
  WHERE status = 'holding';

-- Refresh planner statistics after deployment so the new access paths can be
-- selected immediately. Safe to run repeatedly in migration environments.
ANALYZE public.transactions;
ANALYZE public.deposits;
