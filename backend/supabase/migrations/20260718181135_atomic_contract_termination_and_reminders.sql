-- Additive hardening for contract termination and automated payment reminders.
-- Existing REST routes remain compatible; the backend calls the RPC when this
-- migration is present and falls back to the legacy flow while rolling deploys.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS payment_reminder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_days_before integer[] NOT NULL DEFAULT ARRAY[3, 0],
  ADD COLUMN IF NOT EXISTS reminder_days_after integer[] NOT NULL DEFAULT ARRAY[2, 7];

CREATE TABLE IF NOT EXISTS public.payment_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_key text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  amount_due numeric(14,2) NOT NULL DEFAULT 0,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (invoice_id, reminder_key, channel)
);

CREATE INDEX IF NOT EXISTS idx_payment_reminder_deliveries_owner
  ON public.payment_reminder_deliveries (user_id, delivered_at DESC);

ALTER TABLE public.payment_reminder_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_reminder_deliveries_select_own ON public.payment_reminder_deliveries;
CREATE POLICY payment_reminder_deliveries_select_own
  ON public.payment_reminder_deliveries
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.payment_reminder_deliveries TO authenticated;
GRANT ALL ON public.payment_reminder_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.terminate_contract_atomic(
  p_contract_id uuid,
  p_user_id uuid,
  p_refund_amount numeric,
  p_refund_date date,
  p_refund_method text,
  p_note text,
  p_refund_wallet_id uuid DEFAULT NULL,
  p_settlement_wallet_id uuid DEFAULT NULL,
  p_settlement_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_room_name text;
  v_original_deposit numeric;
  v_deduction numeric;
  v_expense_amount numeric;
  v_settlement_tx_id uuid;
  v_refund_tx_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to terminate this contract';
  END IF;

  IF p_refund_amount < 0 OR COALESCE(p_settlement_amount, 0) < 0 THEN
    RETURN jsonb_build_object('error', 'Invalid settlement amount');
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Contract not found');
  END IF;

  SELECT name INTO v_room_name
  FROM public.rooms
  WHERE id = v_contract.room_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_room_name IS NULL THEN
    RETURN jsonb_build_object('error', 'Room not found');
  END IF;

  -- Safe retry: do not create duplicate financial entries after success.
  IF v_contract.status = 'ended' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'room_id', v_contract.room_id);
  END IF;

  v_original_deposit := COALESCE(v_contract.deposit, 0);
  v_deduction := GREATEST(0, v_original_deposit - p_refund_amount);
  v_expense_amount := CASE
    WHEN COALESCE(p_settlement_amount, 0) > 0 THEN v_original_deposit
    ELSE p_refund_amount
  END;

  IF COALESCE(p_settlement_amount, 0) > 0 THEN
    IF p_settlement_wallet_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Settlement wallet is required');
    END IF;
    PERFORM 1 FROM public.wallets
      WHERE id = p_settlement_wallet_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Settlement wallet not found'); END IF;
  END IF;

  IF v_expense_amount > 0 THEN
    IF p_refund_wallet_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Refund wallet is required');
    END IF;
    PERFORM 1 FROM public.wallets
      WHERE id = p_refund_wallet_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Refund wallet not found'); END IF;
  END IF;

  UPDATE public.contracts
  SET status = 'ended', end_date = p_refund_date,
      settlement_status = CASE WHEN COALESCE(p_settlement_amount, 0) > 0 THEN 'paid' ELSE settlement_status END,
      settlement_amount = COALESCE(p_settlement_amount, 0), updated_at = now()
  WHERE id = p_contract_id AND user_id = p_user_id;

  UPDATE public.deposits
  SET status = 'refunded', updated_at = now()
  WHERE user_id = p_user_id
    AND (contract_id = p_contract_id OR (room_id = v_contract.room_id AND status = 'active'));

  INSERT INTO public.deposit_refunds (
    contract_id, tenant_id, room_id, original_deposit_amount,
    refund_amount, deduction_amount, refund_date, refund_method, note, user_id,
    created_at, updated_at
  ) VALUES (
    p_contract_id, v_contract.tenant_id, v_contract.room_id, v_original_deposit,
    p_refund_amount, v_deduction, p_refund_date, COALESCE(p_refund_method, 'Tiền mặt'),
    COALESCE(p_note, ''), p_user_id, now(), now()
  )
  ON CONFLICT (contract_id) DO UPDATE SET
    refund_amount = EXCLUDED.refund_amount,
    deduction_amount = EXCLUDED.deduction_amount,
    refund_date = EXCLUDED.refund_date,
    refund_method = EXCLUDED.refund_method,
    note = EXCLUDED.note,
    updated_at = now();

  IF COALESCE(p_settlement_amount, 0) > 0 THEN
    INSERT INTO public.transactions (
      user_id, wallet_id, type, amount, description, date, contract_id,
      source, external_ref, metadata, created_at, updated_at
    ) VALUES (
      p_user_id, p_settlement_wallet_id, 'income', p_settlement_amount,
      'Thu tiền thanh lý HĐ - ' || v_room_name || ' (Tất toán HĐ #' || right(p_contract_id::text, 6) || ')',
      p_refund_date, p_contract_id, 'manual', 'contract-termination:' || p_contract_id || ':settlement',
      jsonb_build_object('operation', 'contract_termination'), now(), now()
    ) RETURNING id INTO v_settlement_tx_id;

    UPDATE public.wallets SET balance = COALESCE(balance, 0) + p_settlement_amount, updated_at = now()
    WHERE id = p_settlement_wallet_id AND user_id = p_user_id;
  END IF;

  IF v_expense_amount > 0 THEN
    INSERT INTO public.transactions (
      user_id, wallet_id, type, amount, description, date, contract_id,
      source, external_ref, metadata, created_at, updated_at
    ) VALUES (
      p_user_id, p_refund_wallet_id, 'expense', v_expense_amount,
      'Trả tiền cọc - ' || v_room_name || ' (Hoàn tiền cọc HĐ #' || right(p_contract_id::text, 6) || ')',
      p_refund_date, p_contract_id, 'manual', 'contract-termination:' || p_contract_id || ':refund',
      jsonb_build_object('operation', 'contract_termination'), now(), now()
    ) RETURNING id INTO v_refund_tx_id;

    UPDATE public.wallets SET balance = COALESCE(balance, 0) - v_expense_amount, updated_at = now()
    WHERE id = p_refund_wallet_id AND user_id = p_user_id;
  END IF;

  UPDATE public.rooms SET status = 'vacant', updated_at = now()
  WHERE id = v_contract.room_id AND user_id = p_user_id;

  INSERT INTO public.rental_audit_logs (
    actor_user_id, resource_type, resource_id, action, after_data, metadata
  ) VALUES (
    p_user_id, 'contract', p_contract_id, 'contract_terminated',
    jsonb_build_object('status', 'ended', 'room_id', v_contract.room_id),
    jsonb_build_object(
      'refund_amount', p_refund_amount,
      'settlement_amount', COALESCE(p_settlement_amount, 0),
      'deduction', v_deduction
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'room_id', v_contract.room_id,
    'refund_transaction_id', v_refund_tx_id,
    'settlement_transaction_id', v_settlement_tx_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.terminate_contract_atomic(uuid, uuid, numeric, date, text, text, uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.terminate_contract_atomic(uuid, uuid, numeric, date, text, text, uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terminate_contract_atomic(uuid, uuid, numeric, date, text, text, uuid, uuid, numeric) TO service_role;

NOTIFY pgrst, 'reload schema';
