-- Migration 028: Add atomic wallet balance adjustment function
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
  wallet_id UUID,
  amount NUMERIC,
  is_income BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.wallets
  SET balance = balance + (CASE WHEN is_income THEN amount ELSE -amount END),
      updated_at = now()
  WHERE id = wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
