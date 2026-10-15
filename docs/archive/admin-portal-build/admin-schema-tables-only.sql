-- TroCare Admin Portal
-- Admin schema tables only
-- Target DB: PostgreSQL / Supabase public schema
-- No INSERT / UPDATE / DELETE data statements.
-- No CREATE VIEW statements.
-- ID strategy: UUID-first, matching backend API and migrations.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.admin_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Admin roles and permissions
-- ---------------------------------------------------------------------------

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(120) not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key varchar(120) not null unique,
  module varchar(80) not null,
  action varchar(80) not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key varchar(120) not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create index if not exists idx_role_permissions_role_id
  on public.role_permissions(role_id);
create index if not exists idx_role_permissions_permission_key
  on public.role_permissions(permission_key);

-- ---------------------------------------------------------------------------
-- Users admin extension
-- Existing backend API uses public.users.id as UUID string.
-- ---------------------------------------------------------------------------

alter table public.users add column if not exists user_type varchar(30);
alter table public.users add column if not exists full_name varchar(120);
alter table public.users add column if not exists phone varchar(30);
alter table public.users add column if not exists role_id uuid references public.roles(id) on delete set null;
alter table public.users add column if not exists admin_note text;
alter table public.users add column if not exists locked_at timestamptz;
alter table public.users add column if not exists locked_by uuid references public.users(id) on delete set null;
alter table public.users add column if not exists locked_reason text;
alter table public.users add column if not exists unlocked_at timestamptz;
alter table public.users add column if not exists unlocked_by uuid references public.users(id) on delete set null;
alter table public.users add column if not exists unlocked_reason text;
alter table public.users add column if not exists deleted_at timestamptz;

create index if not exists idx_admin_users_role_status_created
  on public.users(role, status, created_at desc);
create index if not exists idx_admin_users_user_type
  on public.users(user_type);
create index if not exists idx_admin_users_role_id
  on public.users(role_id);
create index if not exists idx_admin_users_last_login
  on public.users(last_login_at desc);
create index if not exists idx_admin_users_locked_at
  on public.users(locked_at desc)
  where locked_at is not null;

-- ---------------------------------------------------------------------------
-- Audit logs extension
-- Compatible with the existing backend audit_logs table.
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action varchar(120) not null,
  resource_type varchar(80),
  resource_id uuid,
  details jsonb,
  ip_address varchar(45),
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists actor_id uuid references public.users(id) on delete set null;
alter table public.audit_logs add column if not exists actor_name varchar(120);
alter table public.audit_logs add column if not exists actor_role varchar(120);
alter table public.audit_logs add column if not exists module varchar(80);
alter table public.audit_logs add column if not exists object_type varchar(80);
alter table public.audit_logs add column if not exists object_id uuid;
alter table public.audit_logs add column if not exists before_value jsonb;
alter table public.audit_logs add column if not exists after_value jsonb;
alter table public.audit_logs add column if not exists reason text;
alter table public.audit_logs add column if not exists risk_level varchar(20) not null default 'low';
alter table public.audit_logs add column if not exists user_agent text;

create index if not exists idx_admin_audit_logs_user_id
  on public.audit_logs(user_id);
create index if not exists idx_admin_audit_logs_actor_id
  on public.audit_logs(actor_id);
create index if not exists idx_admin_audit_logs_action_created
  on public.audit_logs(action, created_at desc);
create index if not exists idx_admin_audit_logs_resource_created
  on public.audit_logs(resource_type, resource_id, created_at desc);
create index if not exists idx_admin_audit_logs_object_created
  on public.audit_logs(object_type, object_id, created_at desc);
create index if not exists idx_admin_audit_logs_module
  on public.audit_logs(module, created_at desc);
create index if not exists idx_admin_audit_logs_risk
  on public.audit_logs(risk_level, created_at desc);
create index if not exists idx_admin_audit_logs_created
  on public.audit_logs(created_at desc);

-- ---------------------------------------------------------------------------
-- Tenant admin extension
-- ---------------------------------------------------------------------------

alter table public.tenants add column if not exists status varchar(30) not null default 'active';
alter table public.tenants add column if not exists locked_at timestamptz;
alter table public.tenants add column if not exists locked_by uuid references public.users(id) on delete set null;
alter table public.tenants add column if not exists locked_reason text;
alter table public.tenants add column if not exists deleted_at timestamptz;
alter table public.tenants add column if not exists admin_note text;

create index if not exists idx_admin_tenants_status_created
  on public.tenants(status, created_at desc);
create index if not exists idx_admin_tenants_phone
  on public.tenants(phone);
create index if not exists idx_admin_tenants_email
  on public.tenants(email);

-- ---------------------------------------------------------------------------
-- Property and room admin extension
-- ---------------------------------------------------------------------------

alter table public.boarding_houses add column if not exists locked_at timestamptz;
alter table public.boarding_houses add column if not exists locked_by uuid references public.users(id) on delete set null;
alter table public.boarding_houses add column if not exists locked_reason text;
alter table public.boarding_houses add column if not exists admin_note text;

alter table public.rooms add column if not exists locked_at timestamptz;
alter table public.rooms add column if not exists locked_by uuid references public.users(id) on delete set null;
alter table public.rooms add column if not exists locked_reason text;
alter table public.rooms add column if not exists admin_note text;

create index if not exists idx_admin_boarding_houses_status_created
  on public.boarding_houses(status, created_at desc);
create index if not exists idx_admin_boarding_houses_public
  on public.boarding_houses(is_public, status);
create index if not exists idx_admin_rooms_status_created
  on public.rooms(status, created_at desc);
create index if not exists idx_admin_rooms_price
  on public.rooms(price);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rooms'::regclass
      and conname = 'rooms_status_check'
  ) then
    alter table public.rooms drop constraint rooms_status_check;
  end if;

  alter table public.rooms
    add constraint rooms_status_check
    check (status in (
      'vacant',
      'reserved',
      'occupied',
      'maintenance',
      'inactive',
      'AVAILABLE',
      'OCCUPIED',
      'MAINTENANCE'
    ));
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Contract admin extension
-- ---------------------------------------------------------------------------

alter table public.contracts add column if not exists cancelled_at timestamptz;
alter table public.contracts add column if not exists cancelled_by uuid references public.users(id) on delete set null;
alter table public.contracts add column if not exists cancel_reason text;
alter table public.contracts add column if not exists admin_note text;
alter table public.contracts add column if not exists file_url text;
alter table public.contracts add column if not exists settlement_status varchar(50) default 'none';
alter table public.contracts add column if not exists settlement_amount numeric(14,2) default 0;

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

create index if not exists idx_admin_contracts_status_dates
  on public.contracts(status, start_date, end_date);
create index if not exists idx_admin_contracts_near_expiry
  on public.contracts(end_date)
  where status = 'active' and end_date is not null;

do $$
begin
  if not exists (
    select 1
    from public.contracts
    where status = 'active'
    group by room_id
    having count(*) > 1
  ) then
    execute 'create unique index if not exists uq_admin_one_active_contract_per_room on public.contracts(room_id) where status = ''active''';
  else
    raise notice 'Skip uq_admin_one_active_contract_per_room: duplicate active contracts exist.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Invoice / payment admin extension
-- ---------------------------------------------------------------------------

alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists cancelled_at timestamptz;
alter table public.invoices add column if not exists cancelled_by uuid references public.users(id) on delete set null;
alter table public.invoices add column if not exists cancel_reason text;
alter table public.invoices add column if not exists paid_at timestamptz;
alter table public.invoices add column if not exists paid_by uuid references public.users(id) on delete set null;
alter table public.invoices add column if not exists payment_method varchar(50);
alter table public.invoices add column if not exists admin_note text;

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
create index if not exists idx_admin_invoices_paid_at
  on public.invoices(paid_at desc)
  where paid_at is not null;

-- ---------------------------------------------------------------------------
-- System config
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- System notifications
-- ---------------------------------------------------------------------------

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
