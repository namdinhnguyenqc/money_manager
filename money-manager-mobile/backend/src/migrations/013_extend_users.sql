-- Migration 013_extend_users.sql
ALTER TABLE users
  ADD COLUMN avatar_url TEXT,
  ADD COLUMN auth_provider TEXT,
  ADD COLUMN email_verified_at TIMESTAMPTZ,
  ADD COLUMN is_profile_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN onboarding_step TEXT,
  ADD COLUMN last_login_at TIMESTAMPTZ;

COMMIT;
