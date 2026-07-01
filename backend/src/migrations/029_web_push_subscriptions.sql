-- Web Push Subscriptions — store browser PushSubscription objects for VAPID push
create table if not exists web_push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, endpoint)
);

create index if not exists idx_web_push_subscriptions_user_active
  on web_push_subscriptions (user_id, is_active);

-- RLS: users can only see their own subscriptions
alter table web_push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on web_push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
