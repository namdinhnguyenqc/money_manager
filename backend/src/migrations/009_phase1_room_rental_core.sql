-- Migration 009: Phase 1 room-rental marketplace core schema.
-- The migration runner wraps all files in one transaction; do not add BEGIN/COMMIT here.
-- Tables use a rental_* prefix so they can coexist with the existing money-manager
-- rental tables and owner boarding-house mock/API surface while the product migrates.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE rental_room_status AS ENUM (
    'DRAFT',
    'AVAILABLE',
    'HELD',
    'OCCUPIED',
    'MAINTENANCE',
    'HIDDEN',
    'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE rental_booking_mode AS ENUM ('CONTACT_FIRST', 'HOLD_FIRST');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE rental_booking_status AS ENUM (
    'PENDING',
    'HOLD',
    'CONFIRMED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED',
    'CHECKED_IN'
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE rental_meter_type AS ENUM ('ELECTRICITY', 'WATER', 'INTERNET', 'SERVICE');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS rental_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_text TEXT NOT NULL,
  province_code TEXT,
  district_code TEXT,
  ward_code TEXT,
  street TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_buildings_owner ON rental_buildings (owner_id);
CREATE INDEX IF NOT EXISTS idx_rental_buildings_location ON rental_buildings (province_code, district_code, ward_code);
CREATE INDEX IF NOT EXISTS idx_rental_buildings_status ON rental_buildings (status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
    CREATE EXTENSION IF NOT EXISTS postgis;
    EXECUTE 'ALTER TABLE rental_buildings ADD COLUMN IF NOT EXISTS geo GEOGRAPHY(POINT, 4326)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rental_buildings_geo_gist ON rental_buildings USING GIST (geo)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS rental_building_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES rental_buildings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_building TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (building_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rental_building_staff_user ON rental_building_staff (user_id);

CREATE TABLE IF NOT EXISTS rental_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES rental_buildings(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  area_m2 NUMERIC(10,2) NOT NULL,
  monthly_rent NUMERIC(14,2) NOT NULL,
  deposit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  electricity_price NUMERIC(14,2),
  water_price NUMERIC(14,2),
  internet_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  service_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  amenities JSONB NOT NULL DEFAULT '[]'::JSONB,
  furnished BOOLEAN NOT NULL DEFAULT false,
  current_status rental_room_status NOT NULL DEFAULT 'DRAFT',
  is_public BOOLEAN NOT NULL DEFAULT false,
  search_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (building_id, code)
);

CREATE INDEX IF NOT EXISTS idx_rental_rooms_building_status ON rental_rooms (building_id, current_status, is_public);
CREATE INDEX IF NOT EXISTS idx_rental_rooms_public_status ON rental_rooms (is_public, current_status);
CREATE INDEX IF NOT EXISTS idx_rental_rooms_rent_area ON rental_rooms (monthly_rent, area_m2);
CREATE INDEX IF NOT EXISTS idx_rental_rooms_amenities_gin ON rental_rooms USING GIN (amenities);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm') THEN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_rental_rooms_search_trgm ON rental_rooms USING GIN (search_text gin_trgm_ops)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS rental_room_availability (
  room_id UUID PRIMARY KEY REFERENCES rental_rooms(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  available_from DATE,
  active_booking_id UUID,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_room_availability_available ON rental_room_availability (is_available, available_from);
CREATE INDEX IF NOT EXISTS idx_rental_room_availability_version ON rental_room_availability (version);

CREATE TABLE IF NOT EXISTS rental_room_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rental_rooms(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_room_media_room ON rental_room_media (room_id, sort_order);

CREATE TABLE IF NOT EXISTS rental_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES rental_buildings(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rental_rooms(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  source TEXT NOT NULL DEFAULT 'PUBLIC_WEB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_leads_building_status ON rental_leads (building_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_leads_room ON rental_leads (room_id);

CREATE TABLE IF NOT EXISTS rental_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rental_rooms(id) ON DELETE CASCADE,
  tenant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES rental_leads(id) ON DELETE SET NULL,
  booking_mode rental_booking_mode NOT NULL DEFAULT 'CONTACT_FIRST',
  status rental_booking_status NOT NULL DEFAULT 'PENDING',
  desired_move_in DATE,
  lease_months INTEGER,
  message TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_bookings_room_status ON rental_bookings (room_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_tenant ON rental_bookings (tenant_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rental_room_single_active_booking
ON rental_bookings (room_id)
WHERE status IN ('HOLD', 'CONFIRMED', 'CHECKED_IN');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_rental_room_availability_active_booking'
  ) THEN
    ALTER TABLE rental_room_availability
      ADD CONSTRAINT fk_rental_room_availability_active_booking
      FOREIGN KEY (active_booking_id) REFERENCES rental_bookings(id) ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS rental_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES rental_bookings(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES rental_leads(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rental_rooms(id) ON DELETE SET NULL,
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_conversations_room ON rental_conversations (room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rental_conversation_participants (
  conversation_id UUID NOT NULL REFERENCES rental_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rental_conversation_participants_user ON rental_conversation_participants (user_id);

CREATE TABLE IF NOT EXISTS rental_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES rental_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_message_id TEXT,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, sender_user_id, client_message_id)
);

CREATE INDEX IF NOT EXISTS idx_rental_messages_conversation ON rental_messages (conversation_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS rental_utility_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rental_rooms(id) ON DELETE CASCADE,
  meter_type rental_meter_type NOT NULL,
  meter_code TEXT,
  unit TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, meter_type)
);

CREATE INDEX IF NOT EXISTS idx_rental_utility_meters_room ON rental_utility_meters (room_id, active);

CREATE TABLE IF NOT EXISTS rental_meter_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID NOT NULL REFERENCES rental_utility_meters(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL,
  reading_value NUMERIC(14,3) NOT NULL,
  image_url TEXT,
  note TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meter_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_rental_meter_records_meter_time ON rental_meter_records (meter_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS rental_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_notifications_user ON rental_notifications (user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS rental_outbox_events (
  id BIGSERIAL PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rental_outbox_unpublished
ON rental_outbox_events (created_at)
WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS rental_idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_code INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rental_idempotency_expiry ON rental_idempotency_keys (expires_at);

CREATE TABLE IF NOT EXISTS rental_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_audit_logs_resource ON rental_audit_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_audit_logs_actor ON rental_audit_logs (actor_user_id, created_at DESC);
