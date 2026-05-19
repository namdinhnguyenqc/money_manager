-- Migration 007: Allow owner accounts for boarding house management.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('USER', 'OWNER', 'ADMIN', 'SUPER_ADMIN'));
