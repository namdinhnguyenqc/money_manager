-- The backend moved from Render to Vercel. The pg_cron job from
-- backend/src/migrations/029_keepwarm_pgcron.sql still pinged the old Render
-- service every 5 minutes, keeping it awake around the clock and burning
-- Render's free instance hours. Vercel functions need no keep-warm.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'keep-backend-warm') then
    perform cron.unschedule('keep-backend-warm');
  end if;
end $$;
