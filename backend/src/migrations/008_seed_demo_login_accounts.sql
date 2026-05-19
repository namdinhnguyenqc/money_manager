-- Migration 008: Seed deterministic demo accounts for local/manual testing.
INSERT INTO users (id, google_id, email, name, avatar, role, status, provider, last_login_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo-user-local', 'user@example.com', 'Demo User', NULL, 'USER', 'ACTIVE', 'LOCAL', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'demo-admin-local', 'admin@example.com', 'Demo Admin', NULL, 'ADMIN', 'ACTIVE', 'LOCAL', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'demo-owner-local', 'owner@example.com', 'Demo Owner', NULL, 'OWNER', 'ACTIVE', 'LOCAL', NOW(), NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  provider = EXCLUDED.provider,
  updated_at = NOW();
