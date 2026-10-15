-- TroCare Admin Portal
-- Live Supabase DB gap patch observed from admin smoke tests.
-- Safe to run after the app's base schema exists.
-- No application data INSERT / UPDATE / DELETE statements.

create extension if not exists pgcrypto;

create or replace function public.admin_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Tenant admin lock state.
alter table public.tenants add column if not exists status varchar(30) not null default 'active';
alter table public.tenants add column if not exists locked_at timestamptz;
alter table public.tenants add column if not exists locked_by uuid references public.users(id) on delete set null;
alter table public.tenants add column if not exists locked_reason text;
alter table public.tenants add column if not exists deleted_at timestamptz;
alter table public.tenants add column if not exists admin_note text;

create index if not exists idx_admin_tenants_status_created
  on public.tenants(status, created_at desc);

-- Property admin metadata.
alter table public.boarding_houses add column if not exists locked_at timestamptz;
alter table public.boarding_houses add column if not exists locked_by uuid references public.users(id) on delete set null;
alter table public.boarding_houses add column if not exists locked_reason text;
alter table public.boarding_houses add column if not exists admin_note text;

-- Contract cancel metadata.
alter table public.contracts add column if not exists cancelled_at timestamptz;
alter table public.contracts add column if not exists cancelled_by uuid references public.users(id) on delete set null;
alter table public.contracts add column if not exists cancel_reason text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contracts'::regclass
      and conname = 'contracts_status_check'
  ) then
    alter table public.contracts drop constraint contracts_status_check;
  end if;

  alter table public.contracts
    add constraint contracts_status_check
    check (status in ('active', 'ended', 'terminated', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

-- Invoice payment and cancel metadata.
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists cancelled_at timestamptz;
alter table public.invoices add column if not exists cancelled_by uuid references public.users(id) on delete set null;
alter table public.invoices add column if not exists cancel_reason text;
alter table public.invoices add column if not exists paid_at timestamptz;
alter table public.invoices add column if not exists paid_by uuid references public.users(id) on delete set null;
alter table public.invoices add column if not exists payment_method varchar(50);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.invoices'::regclass
      and conname = 'invoices_status_check'
  ) then
    alter table public.invoices drop constraint invoices_status_check;
  end if;

  alter table public.invoices
    add constraint invoices_status_check
    check (status in (
      'draft',
      'sent',
      'unpaid',
      'partial',
      'partially_paid',
      'paid',
      'overdue',
      'cancelled'
    ));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_admin_invoices_status_due
  on public.invoices(status, due_date);

-- Dedicated admin config, replacing the temporary system_settings fallback.
create table if not exists public.admin_system_configs (
  id uuid primary key default gen_random_uuid(),
  key varchar(120) not null unique,
  value jsonb not null,
  value_type varchar(30) not null default 'string',
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.users(id) on delete set null,
  updated_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_admin_system_configs_updated_at on public.admin_system_configs;
create trigger trg_admin_system_configs_updated_at
before update on public.admin_system_configs
for each row execute function public.admin_touch_updated_at();

-- Admin notifications and per-recipient delivery ledger.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_notification_status') then
    create type admin_notification_status as enum ('draft', 'scheduled', 'sent', 'cancelled', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'admin_notification_target_type') then
    create type admin_notification_target_type as enum (
      'all_owners',
      'selected_owners',
      'one_owner',
      'all_tenants',
      'selected_tenants',
      'one_tenant'
    );
  end if;
end $$;

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  title varchar(200) not null,
  body text not null,
  notification_type varchar(50) not null,
  target_type admin_notification_target_type not null,
  target_ids uuid[] not null default '{}',
  channels text[] not null default array['in_app'],
  status admin_notification_status not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.users(id) on delete set null,
  cancel_reason text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_admin_notifications_updated_at on public.admin_notifications;
create trigger trg_admin_notifications_updated_at
before update on public.admin_notifications
for each row execute function public.admin_touch_updated_at();

create index if not exists idx_admin_notifications_status_schedule
  on public.admin_notifications(status, scheduled_at);
create index if not exists idx_admin_notifications_created
  on public.admin_notifications(created_at desc);

create table if not exists public.admin_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.admin_notifications(id) on delete cascade,
  recipient_user_id uuid references public.users(id) on delete cascade,
  recipient_tenant_id uuid references public.tenants(id) on delete cascade,
  channel varchar(30) not null,
  status varchar(30) not null default 'pending',
  error_message text,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_notification_deliveries_notification
  on public.admin_notification_deliveries(notification_id, status);
create index if not exists idx_admin_notification_deliveries_user
  on public.admin_notification_deliveries(recipient_user_id, read_at, created_at desc);
create index if not exists idx_admin_notification_deliveries_tenant
  on public.admin_notification_deliveries(recipient_tenant_id, read_at, created_at desc);

notify pgrst, 'reload schema';
