-- TroCare Admin Portal
-- Phase 1-3 database schema + seed
-- Target DB: PostgreSQL
-- Safe import style: no DROP TABLE, uses IF NOT EXISTS and ON CONFLICT.
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

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(120) not null unique,
  description text null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  key varchar(120) not null unique,
  module varchar(80) not null,
  action varchar(80) not null,
  description text null,
  created_at timestamptz not null default now()
);

alter table permissions add column if not exists id uuid default gen_random_uuid();
alter table permissions add column if not exists key varchar(120);
create unique index if not exists permissions_key_uidx on permissions(key);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_key varchar(120) not null references permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  user_type admin_user_type not null,
  full_name varchar(120) not null,
  email varchar(255) not null unique,
  phone varchar(30) null,
  status account_status not null default 'active',
  role_id uuid null references roles(id) on delete set null,
  last_login_at timestamptz null,
  locked_at timestamptz null,
  locked_by uuid null references users(id) on delete set null,
  locked_reason text null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_admin_role_required check (
    user_type <> 'admin' or role_id is not null
  )
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null references users(id) on delete set null,
  actor_name varchar(120) null,
  actor_role varchar(120) null,
  module varchar(80) not null,
  action varchar(120) not null,
  object_type varchar(80) not null,
  object_id uuid null,
  before_value jsonb null,
  after_value jsonb null,
  reason text null,
  risk_level audit_risk_level not null default 'low',
  ip_address inet null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists users_status_idx on users(status);
create index if not exists users_user_type_idx on users(user_type);
create index if not exists users_role_id_idx on users(role_id);
create index if not exists users_created_at_idx on users(created_at);
create index if not exists users_last_login_at_idx on users(last_login_at);
create index if not exists users_deleted_at_idx on users(deleted_at);

create index if not exists role_permissions_role_id_idx on role_permissions(role_id);
create index if not exists role_permissions_permission_key_idx on role_permissions(permission_key);

create index if not exists audit_logs_actor_id_idx on audit_logs(actor_id);
create index if not exists audit_logs_module_idx on audit_logs(module);
create index if not exists audit_logs_action_idx on audit_logs(action);
create index if not exists audit_logs_object_idx on audit_logs(object_type, object_id);
create index if not exists audit_logs_risk_level_idx on audit_logs(risk_level);
create index if not exists audit_logs_created_at_idx on audit_logs(created_at);

insert into roles (code, name, description, is_system)
values
  ('super_admin', 'Super Admin', 'Quyá»n cao nháº¥t trong Admin Portal.', true),
  ('operation_admin', 'Operation Admin', 'Váº­n hÃ nh dá»¯ liá»‡u tÃ i khoáº£n, Owner vÃ  Tenant.', true),
  ('read_only_admin', 'Read-only Admin', 'Chá»‰ xem dá»¯ liá»‡u, khÃ´ng chá»‰nh sá»­a.', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  updated_at = now();

insert into permissions (key, module, action, description)
values
  ('account.view', 'account', 'view', 'Xem danh sÃ¡ch vÃ  summary tÃ i khoáº£n'),
  ('account.lock', 'account', 'lock', 'KhÃ³a tÃ i khoáº£n'),
  ('account.unlock', 'account', 'unlock', 'Má»Ÿ khÃ³a tÃ i khoáº£n'),
  ('audit_log.view', 'audit_log', 'view', 'Xem audit log'),
  ('admin_user.view', 'admin_user', 'view', 'Xem Admin ná»™i bá»™'),
  ('admin_user.create', 'admin_user', 'create', 'Táº¡o Admin ná»™i bá»™'),
  ('admin_user.update', 'admin_user', 'update', 'Cáº­p nháº­t Admin ná»™i bá»™'),
  ('admin_user.lock', 'admin_user', 'lock', 'KhÃ³a Admin ná»™i bá»™'),
  ('role.view', 'role', 'view', 'Xem role vÃ  permission'),
  ('role.update', 'role', 'update', 'Cáº­p nháº­t permission cá»§a role'),
  ('role.assign', 'role', 'assign', 'GÃ¡n role cho Admin'),
  ('owner.view', 'owner', 'view', 'Xem Owner'),
  ('owner.update', 'owner', 'update', 'Cáº­p nháº­t Owner'),
  ('owner.lock', 'owner', 'lock', 'KhÃ³a Owner'),
  ('owner.unlock', 'owner', 'unlock', 'Má»Ÿ khÃ³a Owner'),
  ('tenant.view', 'tenant', 'view', 'Xem khÃ¡ch thuÃª'),
  ('tenant.update', 'tenant', 'update', 'Cáº­p nháº­t khÃ¡ch thuÃª'),
  ('tenant.lock', 'tenant', 'lock', 'KhÃ³a khÃ¡ch thuÃª'),
  ('tenant.unlock', 'tenant', 'unlock', 'Má»Ÿ khÃ³a khÃ¡ch thuÃª'),
  ('tenant.view_sensitive', 'tenant', 'view_sensitive', 'Xem dá»¯ liá»‡u nháº¡y cáº£m cá»§a khÃ¡ch thuÃª')
on conflict (key) do update set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
cross join permissions p
where r.code = 'super_admin'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'account.view',
  'account.lock',
  'account.unlock',
  'audit_log.view',
  'admin_user.view',
  'owner.view',
  'owner.update',
  'tenant.view',
  'tenant.update'
)
where r.code = 'operation_admin'
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, p.key
from roles r
join permissions p on p.key in (
  'account.view',
  'audit_log.view',
  'admin_user.view',
  'role.view',
  'owner.view',
  'tenant.view'
)
where r.code = 'read_only_admin'
on conflict do nothing;

insert into users (
  user_type,
  full_name,
  email,
  phone,
  status,
  role_id,
  last_login_at,
  created_at,
  updated_at
)
select
  'admin',
  'Super Admin',
  'superadmin@trocare.local',
  '0900000001',
  'active',
  r.id,
  now(),
  now(),
  now()
from roles r
where r.code = 'super_admin'
on conflict (email) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  status = excluded.status,
  role_id = excluded.role_id,
  updated_at = now();

insert into users (
  user_type,
  full_name,
  email,
  phone,
  status,
  role_id,
  created_at,
  updated_at
)
select
  'admin',
  'Operation Admin',
  'ops@trocare.local',
  '0900000002',
  'active',
  r.id,
  now(),
  now()
from roles r
where r.code = 'operation_admin'
on conflict (email) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  status = excluded.status,
  role_id = excluded.role_id,
  updated_at = now();

insert into users (
  user_type,
  full_name,
  email,
  phone,
  status,
  role_id,
  created_at,
  updated_at
)
select
  'admin',
  'Read-only Admin',
  'readonly@trocare.local',
  '0900000003',
  'active',
  r.id,
  now(),
  now()
from roles r
where r.code = 'read_only_admin'
on conflict (email) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  status = excluded.status,
  role_id = excluded.role_id,
  updated_at = now();

insert into users (user_type, full_name, email, phone, status, last_login_at, created_at, updated_at)
values
  ('owner', 'Nguyá»…n VÄƒn Chá»§', 'owner.active@trocare.local', '0911111111', 'active', now() - interval '2 days', now(), now()),
  ('owner', 'Tráº§n Thá»‹ NhÃ ', 'owner.locked@trocare.local', '0922222222', 'locked', now() - interval '9 days', now(), now()),
  ('owner', 'LÃª Minh CÆ¡ Sá»Ÿ', 'owner.pending@trocare.local', '0933333333', 'pending_activation', null, now(), now()),
  ('tenant', 'Pháº¡m An ThuÃª', 'tenant.active@trocare.local', '0944444444', 'active', now() - interval '1 day', now(), now()),
  ('tenant', 'VÃµ BÃ¬nh KhÃ¡ch', 'tenant.locked@trocare.local', '0955555555', 'locked', now() - interval '10 days', now(), now()),
  ('tenant', 'Äá»— Chá» KÃ­ch Hoáº¡t', 'tenant.pending@trocare.local', '0966666666', 'pending_activation', null, now(), now())
on conflict (email) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  status = excluded.status,
  last_login_at = excluded.last_login_at,
  updated_at = now();

update users locked_user
set
  locked_at = coalesce(locked_user.locked_at, now()),
  locked_by = admin_user.id,
  locked_reason = coalesce(locked_user.locked_reason, 'Seed tráº¡ng thÃ¡i locked Ä‘á»ƒ kiá»ƒm thá»­ Admin Portal.'),
  updated_at = now()
from users admin_user
where locked_user.status = 'locked'
  and admin_user.email = 'superadmin@trocare.local';
