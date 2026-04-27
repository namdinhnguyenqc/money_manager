-- Seed demo data for Sprint 1 - Owner + BoardingHouses + Rooms
-- Insert a seed owner user
INSERT INTO users (id, email, name, avatar, role, status, provider, created_at, last_login_at)
VALUES ('seed-owner', 'owner_sprint@example.com', 'Sprint Owner', NULL, 'ADMIN', 'ACTIVE', 'LOCAL', NOW(), NOW());

-- Insert two boarding houses for the seed owner
INSERT INTO boarding_houses (id, name, address, description, latitude, longitude, status, is_public, owner_id, created_at)
VALUES
  ('bh-sprint-1', 'Sprint BH 1', '123 Sprint Ave', 'Demo boarding house for sprint', 10.0000, 106.0000, 'ACTIVE', true, 'seed-owner', NOW()),
  ('bh-sprint-2', 'Sprint BH 2', '456 Sprint Ave', 'Another demo boarding house', 10.5000, 106.5000, 'ACTIVE', true, 'seed-owner', NOW());

-- Insert rooms for bh-sprint-1
INSERT INTO rooms (id, name, boarding_house_id, price, status, is_public, created_at)
VALUES
  ('room-sprint-1', 'Room 101', 'bh-sprint-1', 1000000, 'AVAILABLE', true, NOW()),
  ('room-sprint-2', 'Room 102', 'bh-sprint-1', 1200000, 'OCCUPIED', true, NOW());

-- Insert rooms for bh-sprint-2
INSERT INTO rooms (id, name, boarding_house_id, price, status, is_public, created_at)
VALUES
  ('room-sprint-3', 'Room 201', 'bh-sprint-2', 900000, 'AVAILABLE', true, NOW()),
  ('room-sprint-4', 'Room 202', 'bh-sprint-2', 1100000, 'MAINTENANCE', false, NOW());
