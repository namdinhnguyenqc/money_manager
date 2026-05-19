-- Migration 012_user_profiles.sql
-- User profile data for required onboarding in MVP v1
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  province_code TEXT,
  province_name TEXT,
  district_code TEXT,
  district_name TEXT,
  address_line TEXT,
  full_address TEXT,
  phone_verified_at TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles (user_id);

COMMIT;
