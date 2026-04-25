-- BEGIN removed to avoid nested transactions since runner wraps in a transaction
-- Ensure user_id exists on wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
-- Ensure wallet_id exists on related tables for data isolation
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);
ALTER TABLE services ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);
ALTER TABLE bank_config ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);
ALTER TABLE trading_categories ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);
-- COMMIT removed; outer runner will commit/rollback
