CREATE TABLE IF NOT EXISTS public.room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_room_types_user ON public.room_types(user_id);

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON public.rooms(user_id, room_type);
