-- Seed demo data for Sprint 1 - Owner + BoardingHouses + Rooms
-- Insert a seed owner user
INSERT INTO users (id, email, name, avatar, role, status, provider, created_at, last_login_at)
VALUES ('00000000-0000-0000-0000-000000000101', 'owner_sprint@example.com', 'Sprint Owner', NULL, 'OWNER', 'ACTIVE', 'LOCAL', NOW(), NOW());

-- Insert two boarding houses for the seed owner
INSERT INTO boarding_houses (id, name, address, description, latitude, longitude, status, is_public, owner_id, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000201', 'Sprint BH 1', '123 Sprint Ave', 'Demo boarding house for sprint', 10.0000, 106.0000, 'ACTIVE', true, '00000000-0000-0000-0000-000000000101', NOW()),
  ('00000000-0000-0000-0000-000000000202', 'Sprint BH 2', '456 Sprint Ave', 'Another demo boarding house', 10.5000, 106.5000, 'ACTIVE', true, '00000000-0000-0000-0000-000000000101', NOW());

-- Insert rooms for bh-sprint-1
INSERT INTO rooms (id, name, boarding_house_id, price, status, is_public, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000301', 'Room 101', '00000000-0000-0000-0000-000000000201', 1000000, 'AVAILABLE', true, NOW()),
  ('00000000-0000-0000-0000-000000000302', 'Room 102', '00000000-0000-0000-0000-000000000201', 1200000, 'OCCUPIED', true, NOW());

-- Insert rooms for bh-sprint-2
INSERT INTO rooms (id, name, boarding_house_id, price, status, is_public, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000303', 'Room 201', '00000000-0000-0000-0000-000000000202', 900000, 'AVAILABLE', true, NOW()),
  ('00000000-0000-0000-0000-000000000304', 'Room 202', '00000000-0000-0000-0000-000000000202', 1100000, 'MAINTENANCE', false, NOW());
