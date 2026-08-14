-- Optional blocks/wings within a boarding facility. Existing rooms stay valid:
-- block_id is nullable and therefore means "Không phân dãy".
CREATE TABLE IF NOT EXISTS public.facility_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  boarding_house_id UUID NOT NULL REFERENCES public.boarding_houses(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (boarding_house_id, name)
);

CREATE INDEX IF NOT EXISTS idx_facility_blocks_owner_house
  ON public.facility_blocks(owner_id, boarding_house_id);

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES public.facility_blocks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_block_id ON public.rooms(block_id);
