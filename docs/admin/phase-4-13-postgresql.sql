-- TroCare Admin Portal
-- Phase 4-13 database extension SQL
-- Target DB: PostgreSQL / Supabase public schema
-- Safe import style: no DROP TABLE, uses IF NOT EXISTS and ON CONFLICT where possible.
-- ID strategy: UUID for all entity primary keys. Config key remains a unique business key.
--
-- Assumes Phase 1-3 already created/admin-seeded:
-- roles, permissions, role_permissions, users, audit_logs.
--
-- This file extends the existing Money Manager rental schema:
-- users, boarding_houses, rooms, tenants, contracts, invoices, invoice_items,
-- deposits, system_settings.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helper
-- ---------------------------------------------------------------------------

create or replace function public.admin_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Phase 4-13 permissions
-- ---------------------------------------------------------------------------

insert into public.permissions (key, module, action, description)
values
  -- Phase 4: Owner Management
  ('owner.view_sensitive', 'owner', 'view_sensitive', 'View sensitive owner data'),
  ('owner.export', 'owner', 'export', 'Export owner data'),

  -- Phase 5: Tenant Management
  ('tenant.export', 'tenant', 'export', 'Export tenant data'),

  -- Phase 6: Property & Room Management
  ('property.view', 'property', 'view', 'View properties'),
  ('property.update', 'property', 'update', 'Update property information'),
  ('property.lock', 'property', 'lock', 'Lock property'),
  ('property.unlock', 'property', 'unlock', 'Unlock property'),
  ('room.view', 'room', 'view', 'View rooms'),
  ('room.update', 'room', 'update', 'Update room information'),
  ('room.lock', 'room', 'lock', 'Lock room'),
  ('room.unlock', 'room', 'unlock', 'Unlock room'),

  -- Phase 7: Contract Management
  ('contract.view', 'contract', 'view', 'View contracts'),
  ('contract.update', 'contract', 'update', 'Update contracts'),
  ('contract.cancel', 'contract', 'cancel', 'Cancel contracts'),
  ('contract.download_file', 'contract', 'download_file', 'Download contract files'),

  -- Phase 8: Invoice / Payment Management
  ('invoice.view', 'invoice', 'view', 'View invoices'),
  ('invoice.update', 'invoice', 'update', 'Update invoices'),
  ('invoice.mark_paid', 'invoice', 'mark_paid', 'Mark invoices as paid'),
  ('invoice.cancel', 'invoice', 'cancel', 'Cancel invoices'),

  -- Phase 9-10: Dashboard & Reports
  ('dashboard.view', 'dashboard', 'view', 'View admin dashboard'),
  ('report.view', 'report', 'view', 'View operation reports'),
  ('report.export', 'report', 'export', 'Export operation reports'),

  -- Phase 11: System Config
  ('system_config.view', 'system_config', 'view', 'View system config'),
  ('system_config.update', 'system_config', 'update', 'Update system config'),

  -- Phase 12: System Notification
  ('notification.view', 'notification', 'view', 'View system notifications'),
  ('notification.create', 'notification', 'create', 'Create system notifications'),
  ('notification.send', 'notification', 'send', 'Send system notifications'),
  ('notification.cancel', 'notification', 'cancel', 'Cancel scheduled notifications')
on conflict (key) do update set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.code = 'super_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key in (
  'owner.view',
  'owner.update',
  'owner.lock',
  'owner.unlock',
  'tenant.view',
  'tenant.update',
  'tenant.lock',
  'tenant.unlock',
  'property.view',
  'property.update',
  'room.view',
  'room.update',
  'contract.view',
  'contract.update',
  'invoice.view',
  'invoice.update',
  'invoice.mark_paid',
  'dashboard.view',
  'report.view',
  'notification.view',
  'notification.create'
)
where r.code = 'operation_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join public.permissions p on p.key in (
  'owner.view',
  'tenant.view',
  'property.view',
  'room.view',
  'contract.view',
  'invoice.view',
  'dashboard.view',
  'report.view',
  'notification.view'
)
where r.code = 'read_only_admin'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Phase 4: Owner Management
-- Existing model: users.role/user_type identifies owners.
-- ---------------------------------------------------------------------------

alter table public.users add column if not exists admin_note text;
alter table public.users add column if not exists role varchar(30) not null default 'USER';
alter table public.users add column if not exists locked_at timestamptz;
alter table public.users add column if not exists locked_by uuid references public.users(id) on delete set null;
alter table public.users add column if not exists locked_reason text;
alter table public.users add column if not exists unlocked_at timestamptz;
alter table public.users add column if not exists unlocked_by uuid references public.users(id) on delete set null;
alter table public.users add column if not exists unlocked_reason text;
alter table public.users add column if not exists deleted_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'user_type'
  ) then
    execute $sql$
      update public.users
      set role = upper(user_type::text)
      where role = 'USER'
        and user_type::text in ('admin', 'owner', 'tenant')
    $sql$;
  end if;
end $$;

create index if not exists idx_admin_users_role_status_created
  on public.users(role, status, created_at desc);
create index if not exists idx_admin_users_last_login
  on public.users(last_login_at desc);
create index if not exists idx_admin_users_locked_at
  on public.users(locked_at desc)
  where locked_at is not null;

create or replace view public.admin_owner_overview as
select
  u.id as owner_id,
  u.email,
  coalesce(up.full_name, u.name) as owner_name,
  up.phone,
  u.status,
  u.last_login_at,
  u.created_at,
  count(distinct bh.id) as property_count,
  count(distinct r.id) as room_count,
  count(distinct c.id) filter (where c.status = 'active') as active_contract_count,
  count(distinct i.id) filter (where i.status in ('unpaid', 'partial', 'partially_paid', 'overdue')) as open_invoice_count,
  coalesce(sum(i.total_amount - i.paid_amount) filter (where i.status in ('unpaid', 'partial', 'partially_paid', 'overdue')), 0) as debt_amount
from public.users u
left join public.user_profiles up on up.user_id = u.id
left join public.boarding_houses bh on bh.owner_id = u.id
left join public.rooms r on r.user_id = u.id
left join public.contracts c on c.user_id = u.id
left join public.invoices i on i.user_id = u.id
where lower(coalesce(u.role::text, '')) in ('owner', 'user')
group by u.id, u.email, coalesce(up.full_name, u.name), up.phone, u.status, u.last_login_at, u.created_at;

-- ---------------------------------------------------------------------------
-- Phase 5: Tenant Management
-- Existing model: tenants are owner-scoped records.
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

create or replace view public.admin_tenant_overview as
select
  t.id as tenant_id,
  t.user_id as owner_id,
  t.name as tenant_name,
  t.phone,
  t.email,
  t.status,
  t.created_at,
  count(distinct c.id) filter (where c.status = 'active') as active_contract_count,
  count(distinct i.id) filter (where i.status in ('unpaid', 'partial', 'partially_paid', 'overdue')) as open_invoice_count,
  coalesce(sum(i.total_amount - i.paid_amount) filter (where i.status in ('unpaid', 'partial', 'partially_paid', 'overdue')), 0) as debt_amount
from public.tenants t
left join public.contracts c on c.tenant_id = t.id
left join public.invoices i on i.contract_id = c.id
group by t.id, t.user_id, t.name, t.phone, t.email, t.status, t.created_at;

-- ---------------------------------------------------------------------------
-- Phase 6: Property & Room Management
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

create or replace view public.admin_property_overview as
select
  bh.id as property_id,
  bh.owner_id,
  bh.name,
  bh.address,
  bh.status,
  bh.is_public,
  bh.created_at,
  count(r.id) as room_count,
  count(r.id) filter (where lower(r.status::text) in ('occupied')) as occupied_room_count,
  count(r.id) filter (where lower(r.status::text) in ('vacant', 'available')) as vacant_room_count,
  count(r.id) filter (where lower(r.status::text) in ('maintenance')) as maintenance_room_count
from public.boarding_houses bh
left join public.rooms r on r.boarding_house_id = bh.id
group by bh.id, bh.owner_id, bh.name, bh.address, bh.status, bh.is_public, bh.created_at;

create or replace view public.admin_room_overview as
select
  r.id as room_id,
  r.user_id as owner_id,
  r.boarding_house_id as property_id,
  r.name,
  r.price,
  r.area,
  r.max_people,
  r.status,
  r.is_public,
  r.created_at,
  c.id as active_contract_id,
  t.id as current_tenant_id,
  t.name as current_tenant_name,
  c.start_date as current_contract_start_date,
  c.end_date as current_contract_end_date
from public.rooms r
left join public.contracts c on c.room_id = r.id and c.status = 'active'
left join public.tenants t on t.id = c.tenant_id;

-- ---------------------------------------------------------------------------
-- Phase 7: Contract Management
-- ---------------------------------------------------------------------------

alter table public.contracts add column if not exists cancelled_at timestamptz;
alter table public.contracts add column if not exists cancelled_by uuid references public.users(id) on delete set null;
alter table public.contracts add column if not exists cancel_reason text;
alter table public.contracts add column if not exists admin_note text;
alter table public.contracts add column if not exists file_url text;
alter table public.contracts add column if not exists settlement_status varchar(50) default 'none';
alter table public.contracts add column if not exists settlement_amount numeric(14,2) default 0;

create index if not exists idx_admin_contracts_status_dates
  on public.contracts(status, start_date, end_date);
create index if not exists idx_admin_contracts_near_expiry
  on public.contracts(end_date)
  where status = 'active' and end_date is not null;

create or replace view public.admin_contract_overview as
select
  c.id as contract_id,
  c.user_id as owner_id,
  c.room_id,
  c.tenant_id,
  r.boarding_house_id as property_id,
  r.name as room_name,
  t.name as tenant_name,
  t.phone as tenant_phone,
  c.start_date,
  c.end_date,
  c.rent_amount,
  c.deposit,
  c.status,
  c.settlement_status,
  c.created_at,
  case
    when c.status = 'active'
      and c.end_date is not null
      and c.end_date <= current_date + interval '30 days'
    then true
    else false
  end as near_expiry
from public.contracts c
left join public.rooms r on r.id = c.room_id
left join public.tenants t on t.id = c.tenant_id;

-- Prevent more than one active contract for the same room when existing data is clean.
-- If duplicate active contracts already exist, clean data first, then rerun this block.
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
-- Phase 8: Invoice / Payment Management
-- ---------------------------------------------------------------------------

alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists cancelled_at timestamptz;
alter table public.invoices add column if not exists cancelled_by uuid references public.users(id) on delete set null;
alter table public.invoices add column if not exists cancel_reason text;
alter table public.invoices add column if not exists paid_at timestamptz;
alter table public.invoices add column if not exists paid_by uuid references public.users(id) on delete set null;
alter table public.invoices add column if not exists payment_method varchar(50);
alter table public.invoices add column if not exists admin_note text;

update public.invoices
set due_date = make_date(year, month, 1) + interval '1 month' - interval '1 day'
where due_date is null
  and year is not null
  and month between 1 and 12;

create index if not exists idx_admin_invoices_status_due
  on public.invoices(status, due_date);
create index if not exists idx_admin_invoices_paid_at
  on public.invoices(paid_at desc)
  where paid_at is not null;

-- Run this whole CREATE VIEW statement together, from CREATE to the final semicolon.
create or replace view public.admin_invoice_overview as
select
  inv.id as invoice_id,
  inv.user_id as owner_id,
  inv.room_id,
  inv.contract_id,
  con.tenant_id,
  rm.boarding_house_id as property_id,
  inv.month as billing_month,
  inv.year as billing_year,
  inv.due_date,
  inv.total_amount,
  inv.paid_amount,
  greatest(inv.total_amount - inv.paid_amount, 0) as remaining_amount,
  inv.status,
  case
    when inv.status in ('paid') then false
    when inv.due_date is not null and inv.due_date < current_date then true
    else false
  end as overdue,
  inv.created_at,
  inv.paid_at
from public.invoices inv
left join public.contracts con on con.id = inv.contract_id
left join public.rooms rm on rm.id = inv.room_id;

-- ---------------------------------------------------------------------------
-- Phase 9-10: Dashboard and reports
-- ---------------------------------------------------------------------------

create or replace view public.admin_dashboard_summary as
select
  (select count(*) from public.users where lower(coalesce(role::text, '')) = 'owner') as total_owners,
  (select count(*) from public.users where lower(coalesce(role::text, '')) = 'owner' and lower(status::text) in ('active')) as active_owners,
  (select count(*) from public.users where lower(coalesce(role::text, '')) = 'owner' and lower(status::text) in ('locked', 'blocked')) as locked_owners,
  (select count(*) from public.tenants) as total_tenants,
  (select count(*) from public.boarding_houses) as total_properties,
  (select count(*) from public.rooms) as total_rooms,
  (select count(*) from public.rooms where lower(status::text) = 'occupied') as occupied_rooms,
  (select count(*) from public.rooms where lower(status::text) in ('vacant', 'available')) as vacant_rooms,
  (select count(*) from public.contracts where status = 'active' and end_date is not null and end_date <= current_date + interval '30 days') as near_expiry_contracts,
  (select count(*) from public.invoices where status in ('unpaid', 'partial', 'partially_paid')) as unpaid_invoices,
  (select count(*) from public.admin_invoice_overview where overdue = true) as overdue_invoices,
  (select coalesce(sum(remaining_amount), 0) from public.admin_invoice_overview where status <> 'paid') as total_debt_amount;

create or replace view public.admin_report_owner_monthly as
select
  date_trunc('month', created_at)::date as month,
  count(*) as owner_count
from public.users
where lower(coalesce(role::text, '')) = 'owner'
group by date_trunc('month', created_at)::date;

create or replace view public.admin_report_invoice_monthly as
select
  make_date(year, month, 1) as billing_month,
  count(*) as invoice_count,
  coalesce(sum(total_amount), 0) as total_invoice_amount,
  coalesce(sum(paid_amount), 0) as total_paid_amount,
  coalesce(sum(greatest(total_amount - paid_amount, 0)), 0) as total_debt_amount
from public.invoices
where year is not null
  and month between 1 and 12
group by make_date(year, month, 1);

-- ---------------------------------------------------------------------------
-- Phase 11: System Config
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

alter table public.admin_system_configs add column if not exists id uuid default gen_random_uuid();
alter table public.admin_system_configs add column if not exists key varchar(120);
create unique index if not exists admin_system_configs_key_uidx on public.admin_system_configs(key);

drop trigger if exists trg_admin_system_configs_updated_at on public.admin_system_configs;
create trigger trg_admin_system_configs_updated_at
before update on public.admin_system_configs
for each row execute function public.admin_touch_updated_at();

insert into public.admin_system_configs (key, value, value_type, description, is_public)
values
  ('google_login_enabled', 'true'::jsonb, 'boolean', 'Allow Google login', false),
  ('email_login_enabled', 'false'::jsonb, 'boolean', 'Allow email/password login', false),
  ('admin_session_timeout_minutes', '120'::jsonb, 'number', 'Admin session timeout in minutes', false),
  ('invoice_code_prefix', '"INV"'::jsonb, 'string', 'Invoice code prefix', false),
  ('contract_code_prefix', '"CT"'::jsonb, 'string', 'Contract code prefix', false),
  ('contract_expiry_warning_days', '30'::jsonb, 'number', 'Near-expiry contract warning window', false),
  ('allow_edit_paid_invoice', 'false'::jsonb, 'boolean', 'Allow editing paid invoice', false),
  ('require_reason_when_update_invoice_amount', 'true'::jsonb, 'boolean', 'Require reason when invoice amount changes', false),
  ('require_reason_when_view_sensitive_data', 'true'::jsonb, 'boolean', 'Require reason when viewing sensitive data', false),
  ('max_upload_file_size_mb', '10'::jsonb, 'number', 'Maximum upload file size in MB', false),
  ('allowed_upload_file_types', '["pdf","jpg","jpeg","png"]'::jsonb, 'json', 'Allowed upload file types', false)
on conflict (key) do update set
  value = excluded.value,
  value_type = excluded.value_type,
  description = excluded.description,
  is_public = excluded.is_public,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Phase 12: System Notification
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

-- ---------------------------------------------------------------------------
-- Phase 13: hardening support indexes and audit lookup
-- ---------------------------------------------------------------------------

create index if not exists idx_admin_audit_logs_action_created
  on public.audit_logs(action, created_at desc);
create index if not exists idx_admin_audit_logs_resource_created
  on public.audit_logs(resource_type, resource_id, created_at desc);
create index if not exists idx_admin_audit_logs_created
  on public.audit_logs(created_at desc);

-- Optional compatibility columns for the wider Admin Portal audit shape.
alter table public.audit_logs add column if not exists actor_name varchar(120);
alter table public.audit_logs add column if not exists actor_role varchar(120);
alter table public.audit_logs add column if not exists module varchar(80);
alter table public.audit_logs add column if not exists before_value jsonb;
alter table public.audit_logs add column if not exists after_value jsonb;
alter table public.audit_logs add column if not exists reason text;
alter table public.audit_logs add column if not exists risk_level varchar(20) not null default 'low';
alter table public.audit_logs add column if not exists user_agent text;

create index if not exists idx_admin_audit_logs_module
  on public.audit_logs(module, created_at desc);
create index if not exists idx_admin_audit_logs_risk
  on public.audit_logs(risk_level, created_at desc);
