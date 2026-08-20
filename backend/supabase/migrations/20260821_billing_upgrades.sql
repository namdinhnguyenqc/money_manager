-- Debt carryover (previous_credit + traceability), room-level services/adjustments,
-- and service price history with a scheduled-effective-date flow.

-- 1. Công nợ / số dư kỳ trước ----------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS previous_credit numeric(18,2) NOT NULL DEFAULT 0 CHECK (previous_credit >= 0),
  ADD COLUMN IF NOT EXISTS previous_debt_source_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS credit_balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (credit_balance >= 0);

-- Ghi nhận credit khi khách trả dư một hóa đơn, để kỳ sau tự động trừ vào.
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

  -- Trả dư -> ghi thành số dư của hợp đồng, tự động trừ vào hóa đơn kỳ sau.
  IF v_overpaid > 0 AND v_invoice.contract_id IS NOT NULL THEN
    UPDATE public.contracts
    SET credit_balance = COALESCE(credit_balance, 0) + v_overpaid,
        updated_at = now()
    WHERE id = v_invoice.contract_id AND user_id = p_user_id;
  END IF;

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

-- 2. Dịch vụ gán theo phòng (cộng thêm, độc lập với contract_services) -----
CREATE TABLE IF NOT EXISTS public.room_services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  quantity numeric(18,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  custom_unit_price numeric(18,2),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Phí phát sinh gắn phòng, theo kỳ ---------------------------------------
CREATE TABLE IF NOT EXISTS public.room_adjustments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL CHECK (period_year >= 2000),
  note text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Lịch sử giá dịch vụ -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_price_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  old_unit_price numeric(18,2) NOT NULL,
  old_unit_price_ac numeric(18,2) NOT NULL,
  new_unit_price numeric(18,2) NOT NULL,
  new_unit_price_ac numeric(18,2) NOT NULL,
  effective_date date NOT NULL,
  applied boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS note text;

CREATE INDEX IF NOT EXISTS idx_room_services_room ON public.room_services(room_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_room_adjustments_room_period ON public.room_adjustments(room_id, period_year, period_month) WHERE invoice_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_price_history_pending ON public.service_price_history(service_id) WHERE applied = false;

ALTER TABLE public.room_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_services_owner_policy ON public.room_services;
CREATE POLICY room_services_owner_policy ON public.room_services
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS room_adjustments_owner_policy ON public.room_adjustments;
CREATE POLICY room_adjustments_owner_policy ON public.room_adjustments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS service_price_history_owner_policy ON public.service_price_history;
CREATE POLICY service_price_history_owner_policy ON public.service_price_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_room_services_updated_at ON public.room_services;
CREATE TRIGGER trg_room_services_updated_at
  BEFORE UPDATE ON public.room_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
