-- TroCare Admin Portal
-- Phase 1-3 schema only
-- Target DB: PostgreSQL / Supabase
-- No INSERT / UPDATE / DELETE data statements.
-- ID strategy: UUID for all entity primary keys. Permission code remains a unique business key.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_user_type') then
    create type admin_user_type as enum ('admin', 'owner', 'tenant');
  end if;

  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type account_status as enum ('pending_activation', 'active', 'locked', 'soft_deleted');
  end if;

  if not exists (select 1 from pg_type where typname = 'audit_risk_level') then
    create type audit_risk_level as enum ('low', 'medium', 'high', 'critical');
  end if;
end $$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(120) not null unique,
  description text null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key varchar(120) not null unique,
  module varchar(80) not null,
  action varchar(80) not null,
  description text null,
  created_at timestamptz not null default now()
);

alter table public.permissions add column if not exists id uuid default gen_random_uuid();
alter table public.permissions add column if not exists key varchar(120);
create unique index if not exists permissions_key_uidx on public.permissions(key);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key varchar(120) not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

-- If your Supabase already has public.users, this block will not recreate it.
-- Extra admin columns are added below with ALTER TABLE.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) not null unique,
  name varchar(255),
  role varchar(30) not null default 'USER',
  status varchar(30) not null default 'ACTIVE',
  provider varchar(30),
  google_id varchar(255) unique,
  last_login_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists user_type varchar(30);
alter table public.users add column if not exists full_name varchar(120);
alter table public.users add column if not exists phone varchar(30);
alter table public.users add column if not exists role_id uuid references public.roles(id) on delete set null;
alter table public.users add column if not exists locked_at timestamptz;
alter table public.users add column if not exists locked_by uuid references public.users(id) on delete set null;
alter table public.users add column if not exists locked_reason text;
alter table public.users add column if not exists unlocked_at timestamptz;
alter table public.users add column if not exists unlocked_by uuid references public.users(id) on delete set null;
alter table public.users add column if not exists unlocked_reason text;
alter table public.users add column if not exists deleted_at timestamptz;
alter table public.users add column if not exists admin_note text;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null references public.users(id) on delete set null,
  actor_name varchar(120) null,
  actor_role varchar(120) null,
  module varchar(80) null,
  action varchar(120) not null,
  object_type varchar(80) null,
  object_id uuid null,
  before_value jsonb null,
  after_value jsonb null,
  reason text null,
  risk_level varchar(20) not null default 'low',
  ip_address varchar(45) null,
  user_agent text null,
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.audit_logs add column if not exists resource_type varchar(80);
alter table public.audit_logs add column if not exists resource_id uuid;
alter table public.audit_logs add column if not exists details jsonb;
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

create index if not exists users_status_idx on public.users(status);
create index if not exists users_user_type_idx on public.users(user_type);
create index if not exists users_role_idx on public.users(role);
create index if not exists users_role_id_idx on public.users(role_id);
create index if not exists users_created_at_idx on public.users(created_at);
create index if not exists users_last_login_at_idx on public.users(last_login_at);
create index if not exists users_deleted_at_idx on public.users(deleted_at);

create index if not exists role_permissions_role_id_idx on public.role_permissions(role_id);
create index if not exists role_permissions_permission_key_idx on public.role_permissions(permission_key);

create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
create index if not exists audit_logs_module_idx on public.audit_logs(module);
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_object_idx on public.audit_logs(object_type, object_id);
create index if not exists audit_logs_resource_idx on public.audit_logs(resource_type, resource_id);
create index if not exists audit_logs_risk_level_idx on public.audit_logs(risk_level);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at);
