-- Backfill migration: the `deposits` table has existed in production since
-- early on (created directly on Supabase) but was never captured in a
-- migration file. This brings source-controlled schema in sync with what
-- routes/rental.ts and routes/owner.ts actually read/write, so a fresh
-- environment provisioned from migrations doesn't break the deposit
-- (đặt cọc giữ chỗ / tiền cọc hợp đồng) feature.
-- CREATE TABLE IF NOT EXISTS is intentional: safe no-op against the
-- existing production table.

CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  tenant_name TEXT,
  tenant_phone TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'reservation', -- 'reservation' (đặt cọc giữ chỗ) | 'contract' (cọc hợp đồng)
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'transferred' | 'cancelled' | 'refunded'
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposits_user ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_room ON public.deposits(room_id);
CREATE INDEX IF NOT EXISTS idx_deposits_contract ON public.deposits(contract_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(user_id, status);
