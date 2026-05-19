-- BEGIN removed; outer runner handles transactions
-- Seed admin users for testing in DB-backed mode
INSERT INTO users (google_id, email, name, avatar, role, status, provider, last_login_at, created_at, updated_at)
VALUES 
  ('admin-google-id', 'admin@example.com', 'Admin One', NULL, 'ADMIN', 'ACTIVE', 'GOOGLE', NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (google_id, email, name, avatar, role, status, provider, last_login_at, created_at, updated_at)
VALUES 
  ('super-google-id', 'super@example.com', 'Super Admin', NULL, 'SUPER_ADMIN', 'ACTIVE', 'GOOGLE', NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
