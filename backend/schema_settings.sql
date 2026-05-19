-- Schema for system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'general', 'payment', 'pricing', 'room'
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  type VARCHAR(20) NOT NULL,     -- 'number', 'string', 'boolean', 'json'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- RLS Policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON system_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON system_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON system_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON system_settings FOR DELETE
  USING (auth.uid() = user_id);
