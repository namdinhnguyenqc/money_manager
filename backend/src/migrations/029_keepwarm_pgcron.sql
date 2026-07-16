-- Keep the Render backend awake using Supabase's always-on database.
-- pg_cron schedules a job; pg_net makes the outbound HTTP call. Because the
-- Supabase database never sleeps, it pings /health every 5 minutes and Render's
-- 15-minute idle timer never fires. No GitHub Actions minutes, no external service.
--
-- If the backend URL changes, update it in the cron.schedule command below and
-- re-run this migration (it unschedules the old job first).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous version of this job so re-running is idempotent.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'keep-backend-warm') then
    perform cron.unschedule('keep-backend-warm');
  end if;
end $$;

-- Ping the backend health endpoint every 5 minutes.
select cron.schedule(
  'keep-backend-warm',
  '*/5 * * * *',
  $$ select net.http_get('https://money-manager-xdem.onrender.com/health') $$
);
