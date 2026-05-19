-- Run this in Supabase when public.rooms.id is UUID but legacy rental
-- foreign keys are still bigint.
--
-- Existing non-null child values must already be UUID strings, or the child
-- table must be empty. Numeric legacy references cannot be mapped to new UUID
-- room IDs unless a separate legacy-id mapping was preserved.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.__mm_is_uuid_text(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$$;

CREATE OR REPLACE FUNCTION public.__mm_align_fk_to_parent_uuid(
  child_table text,
  child_column text,
  parent_table text,
  delete_action text DEFAULT 'NO ACTION'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  child_reg regclass;
  parent_reg regclass;
  child_type text;
  parent_type text;
  child_attnum smallint;
  parent_attnum smallint;
  invalid_count bigint;
  fk_exists boolean;
  fk record;
  fk_name text;
BEGIN
  child_reg := to_regclass(format('public.%I', child_table));
  parent_reg := to_regclass(format('public.%I', parent_table));
  IF child_reg IS NULL OR parent_reg IS NULL THEN
    RETURN;
  END IF;

  SELECT a.atttypid::regtype::text, a.attnum
    INTO child_type, child_attnum
  FROM pg_attribute a
  WHERE a.attrelid = child_reg
    AND a.attname = child_column
    AND NOT a.attisdropped;

  SELECT a.atttypid::regtype::text, a.attnum
    INTO parent_type, parent_attnum
  FROM pg_attribute a
  WHERE a.attrelid = parent_reg
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  IF child_type IS NULL OR parent_type IS NULL OR parent_type <> 'uuid' THEN
    RETURN;
  END IF;

  IF upper(delete_action) NOT IN ('CASCADE', 'SET NULL', 'SET DEFAULT', 'RESTRICT', 'NO ACTION') THEN
    RAISE EXCEPTION 'Unsupported ON DELETE action: %', delete_action;
  END IF;

  IF child_type <> 'uuid' THEN
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I IS NOT NULL AND NOT public.__mm_is_uuid_text(%I::text)',
      child_table,
      child_column,
      child_column
    )
    INTO invalid_count;

    IF invalid_count > 0 THEN
      RAISE EXCEPTION
        'Cannot convert %.% from % to uuid: % existing non-null values are not UUID strings. Parent %.id is already uuid, so restore a legacy numeric-to-uuid mapping or clean/migrate those child rows first.',
        child_table,
        child_column,
        child_type,
        invalid_count,
        parent_table;
    END IF;

    FOR fk IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = child_reg
        AND contype = 'f'
        AND child_attnum = ANY(conkey)
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', child_table, fk.conname);
    END LOOP;

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE uuid USING (CASE WHEN %I IS NULL THEN NULL ELSE %I::text::uuid END)',
      child_table,
      child_column,
      child_column,
      child_column
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = child_reg
      AND confrelid = parent_reg
      AND contype = 'f'
      AND child_attnum = ANY(conkey)
      AND parent_attnum = ANY(confkey)
  )
  INTO fk_exists;

  IF NOT fk_exists THEN
    fk_name := left(format('fk_%s_%s_%s_uuid', child_table, child_column, parent_table), 63);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', child_table, fk_name);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE %s',
      child_table,
      fk_name,
      child_column,
      parent_table,
      upper(delete_action)
    );
  END IF;
END;
$$;

SELECT public.__mm_align_fk_to_parent_uuid('contracts', 'room_id', 'rooms', 'CASCADE');
SELECT public.__mm_align_fk_to_parent_uuid('contracts', 'tenant_id', 'tenants', 'CASCADE');
SELECT public.__mm_align_fk_to_parent_uuid('invoices', 'room_id', 'rooms', 'SET NULL');
SELECT public.__mm_align_fk_to_parent_uuid('invoices', 'contract_id', 'contracts', 'CASCADE');
SELECT public.__mm_align_fk_to_parent_uuid('contract_services', 'contract_id', 'contracts', 'CASCADE');
SELECT public.__mm_align_fk_to_parent_uuid('contract_services', 'service_id', 'services', 'CASCADE');
SELECT public.__mm_align_fk_to_parent_uuid('invoice_items', 'invoice_id', 'invoices', 'CASCADE');
SELECT public.__mm_align_fk_to_parent_uuid('invoice_items', 'service_id', 'services', 'SET NULL');
SELECT public.__mm_align_fk_to_parent_uuid('transactions', 'invoice_id', 'invoices', 'SET NULL');
SELECT public.__mm_align_fk_to_parent_uuid('meter_readings', 'room_id', 'rooms', 'CASCADE');
SELECT public.__mm_align_fk_to_parent_uuid('meter_readings', 'contract_id', 'contracts', 'CASCADE');
SELECT public.__mm_align_fk_to_parent_uuid('meter_readings', 'service_id', 'services', 'CASCADE');

DROP FUNCTION IF EXISTS public.__mm_align_fk_to_parent_uuid(text, text, text, text);
DROP FUNCTION IF EXISTS public.__mm_is_uuid_text(text);
