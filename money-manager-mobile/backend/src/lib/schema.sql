-- Database Schema for Money Manager with Google Auth + Admin + Data Isolation
-- Run this against PostgreSQL to create all required tables

-- ============================================
-- USERS & AUTH (P0)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'DELETED')),
  provider VARCHAR(20) NOT NULL DEFAULT 'GOOGLE',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'GOOGLE',
  ip_address VARCHAR(50),
  device_info TEXT,
  login_at TIMESTAMP NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  fail_reason VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_at ON login_logs(login_at DESC);

-- ============================================
-- DATA ISOLATION - Add user_id to ALL user-specific tables (CRITICAL)
-- ============================================

-- wallets - already has user_id in spec, this makes it REQUIRED
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- trading_items
ALTER TABLE trading_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_trading_items_user_id ON trading_items(user_id);

-- trading_categories - SHARED table, need user_id for isolation
ALTER TABLE trading_categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_trading_categories_user_id ON trading_categories(user_id);

-- rooms (rental)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_rooms_user_id ON rooms(user_id);

-- tenants - SHARED table, need user_id
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);

-- contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);

-- invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

-- services (utility services like electric, water)
ALTER TABLE services ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);

-- bank_config - SHARED table, need user_id
ALTER TABLE bank_config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_bank_config_user_id ON bank_config(user_id);

-- meter_readings
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_user_id ON meter_readings(user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();