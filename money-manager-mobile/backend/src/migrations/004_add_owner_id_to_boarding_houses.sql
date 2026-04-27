-- Migration 004: Add owner_id to boarding_houses (1:N relationship with users)
ALTER TABLE boarding_houses ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_boarding_houses_owner_id ON boarding_houses(owner_id);
