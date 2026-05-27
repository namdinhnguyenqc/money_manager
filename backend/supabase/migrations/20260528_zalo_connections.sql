CREATE TABLE IF NOT EXISTS public.zalo_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  zalo_id text NOT NULL,
  display_name text,
  avatar_url text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text,
  status text NOT NULL DEFAULT 'connected',
  raw_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(zalo_id)
);

CREATE INDEX IF NOT EXISTS idx_zalo_connections_user
  ON public.zalo_connections(user_id);

ALTER TABLE public.zalo_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zalo_connections_owner_select_policy ON public.zalo_connections;
CREATE POLICY zalo_connections_owner_select_policy ON public.zalo_connections
  FOR SELECT USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_zalo_connections_updated_at ON public.zalo_connections;
CREATE TRIGGER trg_zalo_connections_updated_at
  BEFORE UPDATE ON public.zalo_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
