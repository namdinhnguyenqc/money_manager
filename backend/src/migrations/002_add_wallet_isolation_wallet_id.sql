-- BEGIN removed; outer runner handles transactions
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);
ALTER TABLE bank_config ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);
ALTER TABLE services ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);
ALTER TABLE trading_categories ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);
-- COMMIT removed
