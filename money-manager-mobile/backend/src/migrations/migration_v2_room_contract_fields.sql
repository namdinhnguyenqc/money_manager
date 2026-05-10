-- Migration: Add missing fields to rooms, contracts, and tenants
-- Phase: Fixing data mapping and missing essential fields

-- 1. Add fields to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS area NUMERIC(10,2) DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_people INTEGER DEFAULT 1;

-- 2. Add fields to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Add fields to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS rent_amount NUMERIC(14,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 5;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS electric_start NUMERIC(14,2) DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS water_start NUMERIC(14,2) DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS note TEXT;

-- Update existing contracts to inherit room price if rent_amount is null
UPDATE contracts 
SET rent_amount = (SELECT price FROM rooms WHERE rooms.id = contracts.room_id)
WHERE rent_amount IS NULL;
