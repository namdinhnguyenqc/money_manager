# FE_BE_GAP_DB (MVP v1) – DB/Schema Gap Analysis

Overview: DB layer mapping for BE MVP and how FE relies on DB schema and migrations. Status shows what’s done and what remains.

1) Core Entities & Tables
- BoardingHouses (BH) – fields: id, name, address, description, latitude, longitude, is_public/isPublic, owner_id/ownerId, created_at, updated_at
- Rooms – fields: id, number, name, status, price, capacity, boarding_house_id
- Leads – fields: id, guest_name, guest_phone, message, status, created_at, source
- Users – fields: id, name, email, role, status, created_at
- AuditLog – fields: id, action, actor_id, target_id, timestamp, metadata

2) Migrations & Seeds (BE)
- 004_add_owner_id_to_boarding_houses.sql – add owner_id and indexes
- 005_map_rooms_to_default_boarding_houses.sql – map rooms to BH default
- 006_seed_demo_sprint1.sql – seed demo data for Sprint 1
- Status: DONE (migration scripts exist and are used for demo)

3) Relationships & Keys
- BH has many Rooms; BH has one owner (owner_id)
- Room belongs to BH
- Lead belongs to BH (bh_id)
 - Indexes and foreign keys defined in migrations
- Status ENUMs for BH and Rooms constants kept consistent with FE states

4) Data integrity & seeds
- Demo seeds exist for Sprint 1; ensure alignment with MVP data expectations
- Migrate/Seed tooling: properly wired for local/test env
- Status: DONE (seed scripts exist; integration tests use mocks or seeded data)

5) BE to FE mapping notes
- BE will provide KPI aggregation endpoints or data shapes; FE computes from Rooms for occupancy
- Ensure API responses use consistent shape: data or data.data consistently
- BE timezone and date formats aligned with FE rendering

6) Gaps & Next steps
- Phase 2: Add auditing table changes and trigger logs in BE for UI actions
- Phase 3: Add advanced relationships (staff, bookings, contracts)
