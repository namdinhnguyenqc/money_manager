-- Repoint the billing tables' user foreign keys at public.users.
--
-- 20260821_billing_upgrades.sql declared user_id REFERENCES auth.users(id),
-- copying the pattern in supabase/schema.sql. This deployment does not use
-- Supabase Auth though — it issues its own JWTs against public.users, and an
-- owner's id exists only there. Every insert into these three tables therefore
-- failed the foreign key check, so assigning a service to a room, adding an
-- ad-hoc room fee, and recording a service price change were all impossible.
--
-- The constraints are located by what they point at rather than by name, so
-- this repairs the tables whether or not Postgres picked the default names.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname AS table_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_class fref ON fref.oid = con.confrelid
    JOIN pg_namespace fnsp ON fnsp.oid = fref.relnamespace
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
      AND rel.relname IN ('room_services', 'room_adjustments', 'service_price_history')
      AND fnsp.nspname = 'auth'
      AND fref.relname = 'users'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.room_services
  ADD CONSTRAINT room_services_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.room_adjustments
  ADD CONSTRAINT room_adjustments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_price_history
  ADD CONSTRAINT service_price_history_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_price_history
  ADD CONSTRAINT service_price_history_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
