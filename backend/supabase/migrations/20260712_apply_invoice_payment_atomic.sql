-- Install the atomic invoice-payment RPC used by SePay reconciliation.
-- This migration lives in the canonical Supabase migration directory so it is
-- included in production schema deployments.

CREATE OR REPLACE FUNCTION public.apply_invoice_payment_atomic(
  p_invoice_id    uuid,
  p_user_id       uuid,
  p_wallet_id     text,
  p_amount        numeric,
  p_source        text,
  p_date          date,
  p_description   text,
  p_external_ref  text  DEFAULT NULL,
  p_metadata      jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_invoice      public.invoices%ROWTYPE;
  v_existing_tx public.transactions%ROWTYPE;
  v_total        numeric;
  v_current_paid numeric;
  v_remaining    numeric;
  v_allocated    numeric;
  v_overpaid     numeric;
  v_next_paid    numeric;
  v_next_status  text;
  v_tx_id        uuid;
BEGIN
  -- Authenticated callers may only reconcile their own invoices. A service-role
  -- request has no auth.uid() and is used by the verified webhook handler.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to apply payment for this user';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'Invalid payment amount.');
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invoice not found');
  END IF;

  -- Lock and validate the destination wallet before changing any records.
  PERFORM 1
  FROM public.wallets
  WHERE id = p_wallet_id::uuid AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Wallet not found or does not belong to invoice owner');
  END IF;

  IF p_external_ref IS NOT NULL THEN
    SELECT * INTO v_existing_tx
    FROM public.transactions
    WHERE user_id = p_user_id AND external_ref = p_external_ref
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'transaction_id', v_existing_tx.id,
        'allocated_amount', COALESCE((v_existing_tx.metadata->>'allocated_amount')::numeric, 0),
        'overpaid_amount', COALESCE((v_existing_tx.metadata->>'overpaid_amount')::numeric, 0),
        'status', v_invoice.status
      );
    END IF;
  END IF;

  v_total        := COALESCE(v_invoice.total_amount, 0);
  v_current_paid := COALESCE(v_invoice.paid_amount, 0);
  v_remaining    := GREATEST(0, v_total - v_current_paid);

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('error', 'Hóa đơn này đã được thanh toán đầy đủ.');
  END IF;

  v_allocated   := LEAST(p_amount, v_remaining);
  v_overpaid    := GREATEST(0, p_amount - v_remaining);
  v_next_paid   := v_current_paid + v_allocated;
  v_next_status := CASE WHEN v_next_paid >= v_total THEN 'paid' ELSE 'partial' END;

  UPDATE public.invoices
  SET paid_amount = v_next_paid,
      status = v_next_status,
      updated_at = now()
  WHERE id = p_invoice_id AND user_id = p_user_id;

  INSERT INTO public.transactions (
    user_id, type, amount, description, category_id,
    wallet_id, image_uri, date, invoice_id, contract_id,
    source, external_ref, metadata, created_at, updated_at
  )
  VALUES (
    p_user_id, 'income', p_amount, p_description, NULL,
    p_wallet_id::uuid, NULL, p_date, p_invoice_id, v_invoice.contract_id,
    p_source, p_external_ref,
    p_metadata || jsonb_build_object(
      'allocated_amount', v_allocated,
      'overpaid_amount', v_overpaid,
      'payment_code', v_invoice.payment_code
    ),
    now(), now()
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.invoices
  SET transaction_id = v_tx_id, updated_at = now()
  WHERE id = p_invoice_id AND user_id = p_user_id;

  UPDATE public.wallets
  SET balance = COALESCE(balance, 0) + p_amount,
      updated_at = now()
  WHERE id = p_wallet_id::uuid AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'transaction_id', v_tx_id,
    'allocated_amount', v_allocated,
    'overpaid_amount', v_overpaid,
    'status', v_next_status,
    'next_paid', v_next_paid
  );
EXCEPTION
  WHEN unique_violation THEN
    -- A concurrent webhook retry may win the unique external_ref race. Return
    -- the already-created transaction instead of crediting the wallet twice.
    IF p_external_ref IS NOT NULL THEN
      SELECT * INTO v_existing_tx
      FROM public.transactions
      WHERE user_id = p_user_id AND external_ref = p_external_ref
      LIMIT 1;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'ok', true,
          'idempotent', true,
          'transaction_id', v_existing_tx.id,
          'allocated_amount', COALESCE((v_existing_tx.metadata->>'allocated_amount')::numeric, 0),
          'overpaid_amount', COALESCE((v_existing_tx.metadata->>'overpaid_amount')::numeric, 0),
          'status', v_invoice.status
        );
      END IF;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_invoice_payment_atomic(uuid, uuid, text, numeric, text, date, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_invoice_payment_atomic(uuid, uuid, text, numeric, text, date, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_payment_atomic(uuid, uuid, text, numeric, text, date, text, text, jsonb) TO service_role;

-- Ask PostgREST to refresh its RPC schema cache immediately after deployment.
NOTIFY pgrst, 'reload schema';
