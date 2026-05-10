ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS occupant_count INTEGER,
  ADD COLUMN IF NOT EXISTS applied_services_snapshot JSONB;

