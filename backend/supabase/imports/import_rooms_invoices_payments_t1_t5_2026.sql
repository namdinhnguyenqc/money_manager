-- Import source:
--   import_rooms_invoices_payments_T1_T5_2026_full_corrected.xlsx
-- Target:
--   public.users.email = namdinhnguyen2611@gmail.com
--
-- Run once in Supabase SQL Editor after checking target_email below.
-- The source workbook has blank facility_name values, so this import groups
-- the rooms under one boarding house named "Trọ Nem".

BEGIN;

CREATE TEMP TABLE _import_settings AS
SELECT
  'namdinhnguyen2611@gmail.com'::text AS target_email,
  'Trọ Nem'::text AS default_facility_name,
  '60/7/4A đường số 4, phường Thủ Đức, TP Hồ Chí Minh'::text AS default_facility_address,
  'Vi nha tro import T1-T5 2026'::text AS default_wallet_name;

CREATE TEMP TABLE _import_rooms_contracts (
  facility_name text,
  room_code text NOT NULL,
  room_rent_default numeric(18,2) NOT NULL,
  has_ac boolean,
  tenant_name text NOT NULL,
  tenant_phone text,
  tenant_id_card text,
  tenant_address text,
  contract_start_date date NOT NULL,
  contract_end_date date,
  deposit_amount numeric(18,2) NOT NULL,
  billing_day integer,
  occupant_count integer,
  electric_start numeric(18,2),
  water_start numeric(18,2)
);

INSERT INTO _import_rooms_contracts VALUES
  (NULL, 'P101', 2400000, NULL, 'Bảo Ngọc', NULL, NULL, NULL, DATE '2026-01-01', NULL, 2400000, NULL, NULL, 2993, 1482),
  (NULL, 'P102', 1900000, NULL, 'Khánh Linh', NULL, NULL, NULL, DATE '2026-01-01', DATE '2026-04-30', 1000000, NULL, NULL, 1678, 271),
  (NULL, 'P103', 2000000, NULL, 'Mạnh Quân', NULL, NULL, NULL, DATE '2026-01-01', DATE '2026-03-31', 1000000, NULL, NULL, 4411, 85),
  (NULL, 'P103', 2200000, NULL, 'Khánh Linh', NULL, NULL, NULL, DATE '2026-05-01', NULL, 1000000, NULL, NULL, 4458, 86),
  (NULL, 'P104', 2000000, NULL, 'Minh Thức', NULL, NULL, NULL, DATE '2026-01-01', NULL, 500000, NULL, NULL, 1914, 180),
  (NULL, 'P105', 2200000, NULL, 'Huỳnh Như', NULL, NULL, NULL, DATE '2026-01-01', NULL, 2200000, NULL, NULL, 6420, 257),
  (NULL, 'P106', 2000000, NULL, 'Huy Nguyễn', NULL, NULL, NULL, DATE '2026-01-01', NULL, 1000000, NULL, NULL, 3567, 183),
  (NULL, 'P107', 2200000, NULL, 'Phương Anh', NULL, NULL, NULL, DATE '2026-01-01', NULL, 1000000, NULL, NULL, 3842, 138),
  (NULL, 'P108', 2000000, NULL, 'Công Lực', NULL, NULL, NULL, DATE '2026-01-01', DATE '2026-01-31', 1000000, NULL, NULL, 4989, 270),
  (NULL, 'P108', 2200000, NULL, 'Hiếu', NULL, NULL, NULL, DATE '2026-02-01', NULL, 2200000, NULL, NULL, 5073, 276),
  (NULL, 'P109', 2300000, NULL, 'Khánh Giao', NULL, NULL, NULL, DATE '2026-01-01', NULL, 1000000, NULL, NULL, 4000, 242);

CREATE TEMP TABLE _import_invoices (
  room_code text NOT NULL,
  billing_month integer NOT NULL,
  billing_year integer NOT NULL,
  tenant_name text NOT NULL,
  room_rent numeric(18,2),
  electric_old numeric(18,2),
  electric_new numeric(18,2),
  electric_unit_price numeric(18,2),
  water_old numeric(18,2),
  water_new numeric(18,2),
  water_unit_price numeric(18,2),
  water_flat_amount numeric(18,2),
  service_amount numeric(18,2),
  other_amount numeric(18,2),
  discount_amount numeric(18,2),
  previous_debt numeric(18,2),
  invoice_note text,
  expected_total numeric(18,2) NOT NULL
);

INSERT INTO _import_invoices VALUES
  ('P101',1,2026,'Bảo Ngọc',2400000,2993,3019,3400,1482,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 1',2574900),
  ('P102',1,2026,'Khánh Linh',1900000,1678,1699,3400,271,281,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 1',2057900),
  ('P103',1,2026,'Mạnh Quân',2000000,4411,4425,3400,85,86,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 1',2134100),
  ('P104',1,2026,'Minh Thức',2000000,1914,1924,3400,180,182,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 1',2120500),
  ('P105',1,2026,'Huỳnh Như',2200000,6420,6483,3400,257,265,NULL,100000,136500,0,0,0,'Nguồn: Phiếu Thu Tháng 1',2650700),
  ('P106',1,2026,'Huy Nguyễn',2000000,3567,3645,4000,183,188,NULL,50000,136500,0,0,0,'Nguồn: Phiếu Thu Tháng 1',2498500),
  ('P107',1,2026,'Phương Anh',2200000,3842,3890,4000,138,141,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 1',2478500),
  ('P108',1,2026,'Công Lực',2000000,4989,5073,3400,270,276,NULL,100000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 1',2422100),
  ('P109',1,2026,'Khánh Giao',2300000,4000,4064,3400,242,248,NULL,100000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 1',2654100),
  ('P101',2,2026,'Bảo Ngọc',2400000,3019,3019,0,NULL,NULL,NULL,0,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 2',2436500),
  ('P102',2,2026,'Khánh Linh',1900000,1699,1699,0,281,NULL,NULL,0,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 2',1936500),
  ('P103',2,2026,'Mạnh Quân',2000000,4425,4425,0,86,NULL,NULL,0,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 2',2036500),
  ('P104',2,2026,'Minh Thức',2000000,1924,1924,0,182,NULL,NULL,0,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 2',2036500),
  ('P105',2,2026,'Huỳnh Như',2200000,6483,6483,0,265,NULL,NULL,0,136500,0,0,0,'Nguồn: Phiếu Thu Tháng 2',2336500),
  ('P106',2,2026,'Huy Nguyễn',2000000,3645,3645,0,188,NULL,NULL,0,136500,0,0,0,'Nguồn: Phiếu Thu Tháng 2',2136500),
  ('P107',2,2026,'Phương Anh',2200000,3890,3890,0,141,NULL,NULL,0,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 2',2236500),
  ('P108',2,2026,'Hiếu',1100000,5073,5073,0,276,NULL,NULL,0,36500,0,36500,0,'Nguồn: Phiếu Thu Tháng 2; Điều chỉnh khớp tổng nguồn: -36.500',1100000),
  ('P109',2,2026,'Khánh Giao',2300000,4064,4064,0,248,NULL,NULL,0,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 2',2336500),
  ('P101',3,2026,'Bảo Ngọc',2400000,3019,3057,3400,NULL,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 3',2615700),
  ('P102',3,2026,'Khánh Linh',1900000,1699,1729,3400,281,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 3',2088500),
  ('P103',3,2026,'Mạnh Quân',NULL,4425,4456,3400,86,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 3; Nguồn không ghi tiền phòng',191900),
  ('P104',3,2026,'Minh Thức',2000000,1924,1937,3400,182,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 3',2130700),
  ('P105',3,2026,'Huỳnh Như',2200000,6483,6568,3400,265,NULL,NULL,50000,106500,0,0,0,'Nguồn: Phiếu Thu Tháng 3',2645500),
  ('P106',3,2026,'Huy Nguyễn',2000000,3645,3746,4000,188,NULL,NULL,50000,106500,0,0,0,'Nguồn: Phiếu Thu Tháng 3',2560500),
  ('P107',3,2026,'Phương Anh',2200000,3890,4051,4000,141,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 3',2930500),
  ('P108',3,2026,'Hiếu',2200000,5073,5116,0,276,NULL,NULL,50000,106500,0,0,0,'Nguồn: Phiếu Thu Tháng 3; Miễn phí điện tháng này',2356500),
  ('P109',3,2026,'Khánh Giao',2300000,4064,4163,3400,248,NULL,NULL,100000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 3',2773100),
  ('P101',4,2026,'Bảo Ngọc',2400000,3057,3093,3400,NULL,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 4',2608900),
  ('P102',4,2026,'Khánh Linh',1900000,1729,1765,3400,281,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 4',2108900),
  ('P104',4,2026,'Minh Thức',2000000,1937,1944,3400,182,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 4',2110300),
  ('P105',4,2026,'Huỳnh Như',2200000,6568,6634,3400,265,NULL,NULL,50000,106500,0,0,0,'Nguồn: Phiếu Thu Tháng 4',2580900),
  ('P106',4,2026,'Huy Nguyễn',2000000,3746,3857,4000,188,NULL,NULL,50000,106500,0,0,0,'Nguồn: Phiếu Thu Tháng 4',2600500),
  ('P107',4,2026,'Phương Anh',2200000,4051,4168,4000,141,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 4',2754500),
  ('P108',4,2026,'Hiếu',2200000,5116,5167,4000,276,NULL,NULL,50000,106500,0,0,0,'Nguồn: Phiếu Thu Tháng 4; Miễn phí điện tháng này',2560500),
  ('P109',4,2026,'Khánh Giao',2300000,4163,4235,3400,248,NULL,NULL,100000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 4',2681300),
  ('P101',5,2026,'Bảo Ngọc',2400000,3093,3158,3400,NULL,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 5',2707500),
  ('P103',5,2026,'Khánh Linh',2200000,4458,4567,3400,86,NULL,NULL,100000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 5',2707100),
  ('P104',5,2026,'Minh Thức',2000000,1944,1951,3400,182,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 5',2110300),
  ('P105',5,2026,'Huỳnh Như',2200000,6634,6699,3400,265,NULL,NULL,100000,106500,0,0,0,'Nguồn: Phiếu Thu Tháng 5',2627500),
  ('P106',5,2026,'Huy Nguyễn',2000000,3857,3974,4000,188,NULL,NULL,50000,106500,0,0,0,'Nguồn: Phiếu Thu Tháng 5',2624500),
  ('P107',5,2026,'Phương Anh',2200000,4168,4257,4000,141,NULL,NULL,50000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 5',2642500),
  ('P108',5,2026,'Hiếu',2200000,5167,5243,4000,276,NULL,NULL,50000,106500,0,0,0,'Nguồn: Phiếu Thu Tháng 5',2660500),
  ('P109',5,2026,'Khánh Giao',2300000,4235,4304,3400,248,NULL,NULL,100000,36500,0,0,0,'Nguồn: Phiếu Thu Tháng 5',2671100);

CREATE TEMP TABLE _import_payments (
  room_code text NOT NULL,
  billing_month integer NOT NULL,
  billing_year integer NOT NULL,
  payment_date date NOT NULL,
  paid_amount numeric(18,2) NOT NULL,
  payment_method text,
  wallet_name text,
  payment_note text,
  receipt_no text,
  collector_name text
);

INSERT INTO _import_payments VALUES
  ('P104',1,2026,DATE '2026-01-11',2120500,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 1',NULL,NULL),
  ('P105',1,2026,DATE '2026-01-11',2650700,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 1',NULL,NULL),
  ('P106',1,2026,DATE '2026-01-11',2498500,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 1',NULL,NULL),
  ('P107',1,2026,DATE '2026-01-11',2478500,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 1',NULL,NULL),
  ('P109',1,2026,DATE '2026-01-11',2654100,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 1',NULL,NULL),
  ('P104',2,2026,DATE '2026-02-10',2036500,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 2',NULL,NULL),
  ('P105',2,2026,DATE '2026-02-10',2336500,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 2',NULL,NULL),
  ('P106',2,2026,DATE '2026-02-10',2136500,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 2',NULL,NULL),
  ('P107',2,2026,DATE '2026-02-10',2236500,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 2',NULL,NULL),
  ('P109',2,2026,DATE '2026-02-10',2336500,NULL,NULL,'Trạng thái Đ trong Phiếu Thu Tháng 2',NULL,NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN _import_settings s ON lower(u.email) = lower(s.target_email)
  ) THEN
    RAISE EXCEPTION 'Target app user not found. Check _import_settings.target_email.';
  END IF;
END $$;

CREATE TEMP TABLE _import_target_user AS
SELECT u.id AS user_id
FROM public.users u
JOIN _import_settings s ON lower(u.email) = lower(s.target_email);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.invoices i
    JOIN _import_target_user tu ON tu.user_id = i.user_id
    JOIN public.rooms r ON r.id = i.room_id
    JOIN _import_invoices src
      ON src.room_code = r.name
     AND src.billing_month = i.month
     AND src.billing_year = i.year
  ) THEN
    RAISE EXCEPTION 'An invoice from this import already exists. Stop to avoid duplicate imports.';
  END IF;
END $$;

CREATE TEMP TABLE _import_house AS
WITH inserted AS (
  INSERT INTO public.boarding_houses (owner_id, name, address, description, status, is_public)
  SELECT
    tu.user_id,
    s.default_facility_name,
    s.default_facility_address,
    'Created from import_rooms_invoices_payments_T1_T5_2026_full_corrected.xlsx',
    'ACTIVE',
    false
  FROM _import_target_user tu
  CROSS JOIN _import_settings s
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.boarding_houses bh
    WHERE bh.owner_id = tu.user_id
      AND bh.name = s.default_facility_name
  )
  RETURNING id, owner_id
)
SELECT id AS boarding_house_id, owner_id AS user_id FROM inserted
UNION ALL
SELECT bh.id, bh.owner_id
FROM public.boarding_houses bh
JOIN _import_target_user tu ON tu.user_id = bh.owner_id
JOIN _import_settings s ON s.default_facility_name = bh.name
WHERE NOT EXISTS (SELECT 1 FROM inserted);

CREATE TEMP TABLE _import_room_map AS
WITH source_rooms AS (
  SELECT DISTINCT ON (room_code)
    room_code,
    room_rent_default,
    COALESCE(has_ac, false) AS has_ac,
    COALESCE(occupant_count, 1) AS num_people
  FROM _import_rooms_contracts
  ORDER BY room_code, contract_start_date DESC
),
inserted AS (
  INSERT INTO public.rooms
    (user_id, boarding_house_id, name, price, num_people, max_people, has_ac, status, is_public)
  SELECT
    tu.user_id,
    h.boarding_house_id,
    sr.room_code,
    sr.room_rent_default,
    sr.num_people,
    GREATEST(sr.num_people, 1),
    sr.has_ac,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM _import_rooms_contracts rc
        WHERE rc.room_code = sr.room_code
          AND rc.contract_end_date IS NULL
      ) THEN 'occupied'
      ELSE 'vacant'
    END,
    false
  FROM source_rooms sr
  CROSS JOIN _import_target_user tu
  CROSS JOIN _import_house h
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.rooms r
    WHERE r.user_id = tu.user_id
      AND r.name = sr.room_code
  )
  RETURNING id, name, user_id
)
SELECT id AS room_id, name AS room_code, user_id FROM inserted
UNION ALL
SELECT r.id, r.name, r.user_id
FROM public.rooms r
JOIN _import_target_user tu ON tu.user_id = r.user_id
JOIN source_rooms sr ON sr.room_code = r.name
WHERE NOT EXISTS (SELECT 1 FROM inserted i WHERE i.name = r.name);

-- Each workbook contract gets its own tenant row. This preserves historical
-- moves where the same name appears in different room periods.
CREATE TEMP TABLE _import_source_contracts AS
SELECT
  gen_random_uuid() AS tenant_id,
  gen_random_uuid() AS contract_id,
  rc.*
FROM _import_rooms_contracts rc;

INSERT INTO public.tenants (id, user_id, name, phone, id_card, address)
SELECT
  src.tenant_id,
  tu.user_id,
  src.tenant_name,
  src.tenant_phone,
  src.tenant_id_card,
  src.tenant_address
FROM _import_source_contracts src
CROSS JOIN _import_target_user tu;

INSERT INTO public.contracts
  (id, user_id, room_id, tenant_id, start_date, end_date, deposit, rent_amount,
   billing_day, electric_start, water_start, initial_electric_reading,
   initial_water_reading, occupant_count, status, note)
SELECT
  src.contract_id,
  tu.user_id,
  rm.room_id,
  src.tenant_id,
  src.contract_start_date,
  src.contract_end_date,
  src.deposit_amount,
  src.room_rent_default,
  COALESCE(src.billing_day, 5),
  COALESCE(src.electric_start, 0),
  COALESCE(src.water_start, 0),
  COALESCE(src.electric_start, 0),
  COALESCE(src.water_start, 0),
  COALESCE(src.occupant_count, 1),
  CASE WHEN src.contract_end_date IS NULL THEN 'active' ELSE 'ended' END,
  'Imported from T1-T5 2026 workbook'
FROM _import_source_contracts src
JOIN _import_room_map rm ON rm.room_code = src.room_code
CROSS JOIN _import_target_user tu;

CREATE TEMP TABLE _import_contract_map AS
SELECT
  src.room_code,
  src.tenant_name,
  src.contract_start_date,
  src.contract_end_date,
  src.contract_id,
  rm.room_id,
  src.tenant_id
FROM _import_source_contracts src
JOIN _import_room_map rm ON rm.room_code = src.room_code;

INSERT INTO public.deposits
  (user_id, room_id, tenant_name, tenant_phone, amount, type, status,
   payment_method, recorded_at, contract_id, note)
SELECT
  tu.user_id,
  cm.room_id,
  rc.tenant_name,
  rc.tenant_phone,
  rc.deposit_amount,
  'contract',
  'transferred',
  'cash',
  rc.contract_start_date,
  cm.contract_id,
  'Imported contract deposit from T1-T5 2026 workbook'
FROM _import_rooms_contracts rc
JOIN _import_contract_map cm
  ON cm.room_code = rc.room_code
 AND cm.contract_start_date = rc.contract_start_date
CROSS JOIN _import_target_user tu
WHERE rc.deposit_amount > 0;

CREATE TEMP TABLE _import_invoice_map AS
WITH matched AS (
  SELECT
    src.*,
    cm.contract_id,
    cm.room_id,
    row_number() OVER (
      PARTITION BY src.room_code, src.billing_year, src.billing_month
      ORDER BY cm.contract_start_date DESC
    ) AS choice_no
  FROM _import_invoices src
  JOIN _import_contract_map cm
    ON cm.room_code = src.room_code
   AND make_date(src.billing_year, src.billing_month, 1) >=
       date_trunc('month', cm.contract_start_date)::date
   AND (
     cm.contract_end_date IS NULL
     OR make_date(src.billing_year, src.billing_month, 1) <=
        date_trunc('month', cm.contract_end_date)::date
   )
),
inserted AS (
  INSERT INTO public.invoices
    (user_id, room_id, contract_id, month, year, room_fee, previous_debt,
     elec_old, elec_new, water_old, water_new, total_amount, paid_amount,
     status, note)
  SELECT
    tu.user_id,
    m.room_id,
    m.contract_id,
    m.billing_month,
    m.billing_year,
    COALESCE(m.room_rent, 0),
    COALESCE(m.previous_debt, 0),
    m.electric_old,
    m.electric_new,
    m.water_old,
    m.water_new,
    m.expected_total,
    0,
    'unpaid',
    m.invoice_note
  FROM matched m
  CROSS JOIN _import_target_user tu
  WHERE m.choice_no = 1
  RETURNING id, room_id, contract_id, month, year
)
SELECT i.id AS invoice_id, i.room_id, i.contract_id, i.month, i.year, src.*
FROM inserted i
JOIN _import_contract_map cm ON cm.contract_id = i.contract_id
JOIN _import_invoices src
  ON src.room_code = cm.room_code
 AND src.billing_month = i.month
 AND src.billing_year = i.year;

DO $$
BEGIN
  IF (SELECT count(*) FROM _import_invoice_map) <> (SELECT count(*) FROM _import_invoices) THEN
    RAISE EXCEPTION 'Not every source invoice matched an imported contract; import rolled back.';
  END IF;
END $$;

INSERT INTO public.invoice_items
  (user_id, invoice_id, name, detail, amount, calculation_type, unit_price,
   quantity, start_reading, end_reading, usage_value, unit)
SELECT
  tu.user_id,
  im.invoice_id,
  item.name,
  item.detail,
  item.amount,
  item.calculation_type,
  item.unit_price,
  item.quantity,
  item.start_reading,
  item.end_reading,
  item.usage_value,
  item.unit
FROM _import_invoice_map im
CROSS JOIN _import_target_user tu
CROSS JOIN LATERAL (
  VALUES
    ('Tiền điện'::text, 'Chỉ số điện từ file import'::text,
      GREATEST(COALESCE(im.electric_new, im.electric_old, 0) - COALESCE(im.electric_old, 0), 0) * COALESCE(im.electric_unit_price, 0),
      'metered'::text, COALESCE(im.electric_unit_price, 0),
      GREATEST(COALESCE(im.electric_new, im.electric_old, 0) - COALESCE(im.electric_old, 0), 0),
      im.electric_old, im.electric_new,
      GREATEST(COALESCE(im.electric_new, im.electric_old, 0) - COALESCE(im.electric_old, 0), 0),
      'kWh'::text),
    ('Tiền nước'::text, 'Tiền nước khoán từ file import'::text,
      COALESCE(im.water_flat_amount, 0), 'fixed'::text, NULL::numeric,
      1::numeric, NULL::numeric, NULL::numeric, NULL::numeric, 'tháng'::text),
    ('Tiền nước'::text, 'Chỉ số nước từ file import'::text,
      GREATEST(COALESCE(im.water_new, im.water_old, 0) - COALESCE(im.water_old, 0), 0) * COALESCE(im.water_unit_price, 0),
      'metered'::text, COALESCE(im.water_unit_price, 0),
      GREATEST(COALESCE(im.water_new, im.water_old, 0) - COALESCE(im.water_old, 0), 0),
      im.water_old, im.water_new,
      GREATEST(COALESCE(im.water_new, im.water_old, 0) - COALESCE(im.water_old, 0), 0),
      'm3'::text),
    ('Dịch vụ'::text, 'Tổng dịch vụ từ file import'::text,
      COALESCE(im.service_amount, 0), 'fixed'::text, NULL::numeric,
      1::numeric, NULL::numeric, NULL::numeric, NULL::numeric, 'tháng'::text),
    ('Phụ thu'::text, 'Khoản khác từ file import'::text,
      COALESCE(im.other_amount, 0), 'fixed'::text, NULL::numeric,
      1::numeric, NULL::numeric, NULL::numeric, NULL::numeric, 'lần'::text),
    ('Giảm giá'::text, 'Số tiền giảm đã trừ trong tổng hóa đơn'::text,
      COALESCE(im.discount_amount, 0), 'discount'::text, NULL::numeric,
      1::numeric, NULL::numeric, NULL::numeric, NULL::numeric, 'lần'::text)
) AS item
  (name, detail, amount, calculation_type, unit_price, quantity,
   start_reading, end_reading, usage_value, unit)
WHERE item.amount > 0;

CREATE TEMP TABLE _import_wallet AS
WITH inserted AS (
  INSERT INTO public.wallets (user_id, name, type, icon, color, balance, active)
  SELECT
    tu.user_id,
    s.default_wallet_name,
    'rental',
    'home',
    '#10b981',
    0,
    true
  FROM _import_target_user tu
  CROSS JOIN _import_settings s
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.wallets w
    WHERE w.user_id = tu.user_id
      AND w.name = s.default_wallet_name
  )
  RETURNING id, user_id
)
SELECT id AS wallet_id, user_id FROM inserted
UNION ALL
SELECT w.id, w.user_id
FROM public.wallets w
JOIN _import_target_user tu ON tu.user_id = w.user_id
JOIN _import_settings s ON s.default_wallet_name = w.name
WHERE NOT EXISTS (SELECT 1 FROM inserted);

CREATE TEMP TABLE _import_payment_tx AS
WITH inserted AS (
  INSERT INTO public.transactions
    (user_id, wallet_id, invoice_id, contract_id, type, amount, description, date)
  SELECT
    tu.user_id,
    w.wallet_id,
    im.invoice_id,
    im.contract_id,
    'income',
    p.paid_amount,
    concat(
      'Thu tiền phòng ', p.room_code, ' ', p.billing_month, '/', p.billing_year,
      CASE WHEN p.payment_note IS NULL THEN '' ELSE ' · ' || p.payment_note END
    ),
    p.payment_date
  FROM _import_payments p
  JOIN _import_invoice_map im
    ON im.room_code = p.room_code
   AND im.billing_month = p.billing_month
   AND im.billing_year = p.billing_year
  CROSS JOIN _import_target_user tu
  CROSS JOIN _import_wallet w
  RETURNING id, invoice_id, amount
)
SELECT * FROM inserted;

DO $$
BEGIN
  IF (SELECT count(*) FROM _import_payment_tx) <> (SELECT count(*) FROM _import_payments) THEN
    RAISE EXCEPTION 'Not every source payment matched an imported invoice; import rolled back.';
  END IF;
END $$;

UPDATE public.invoices i
SET
  paid_amount = LEAST(i.total_amount, tx.amount),
  status = CASE WHEN tx.amount >= i.total_amount THEN 'paid' ELSE 'partial' END,
  transaction_id = tx.id,
  updated_at = now()
FROM _import_payment_tx tx
WHERE i.id = tx.invoice_id;

UPDATE public.wallets w
SET
  balance = w.balance + totals.amount,
  updated_at = now()
FROM (
  SELECT wallet_id, sum(paid_amount) AS amount
  FROM _import_payments p
  CROSS JOIN _import_wallet iw
  GROUP BY wallet_id
) totals
WHERE w.id = totals.wallet_id;

-- Quick result check shown in SQL Editor after COMMIT.
SELECT
  (SELECT count(*) FROM _import_room_map) AS imported_rooms,
  (SELECT count(*) FROM _import_contract_map) AS imported_contracts,
  (SELECT count(*) FROM _import_invoice_map) AS imported_invoices,
  (SELECT count(*) FROM _import_payment_tx) AS imported_payment_transactions,
  (SELECT sum(amount) FROM _import_payment_tx) AS imported_paid_amount;

COMMIT;
