-- TroCare Admin Portal Phase 1 local schema draft.
-- This file documents the DB shape expected by the mock API.
-- Replace with real migrations when the production DB/ORM is confirmed.

create table users (
  id text primary key,
  user_type text not null check (user_type in ('admin', 'owner', 'tenant')),
  full_name text not null,
  email text not null unique,
  phone text,
  status text not null default 'active'
    check (status in ('pending_activation', 'active', 'locked', 'soft_deleted')),
  role_name text,
  last_login_at text,
  locked_at text,
  locked_by text,
  locked_reason text,
  deleted_at text,
  created_at text not null,
  updated_at text not null
);

create index users_status_idx on users(status);
create index users_user_type_idx on users(user_type);
create index users_created_at_idx on users(created_at);
create index users_last_login_at_idx on users(last_login_at);

create table audit_logs (
  id text primary key,
  actor_id text,
  actor_name text,
  actor_role text,
  module text not null,
  action text not null,
  object_type text not null,
  object_id text not null,
  before_value text,
  after_value text,
  reason text,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  ip_address text,
  user_agent text,
  created_at text not null
);

create index audit_logs_actor_id_idx on audit_logs(actor_id);
create index audit_logs_module_idx on audit_logs(module);
create index audit_logs_action_idx on audit_logs(action);
create index audit_logs_object_idx on audit_logs(object_type, object_id);
create index audit_logs_risk_level_idx on audit_logs(risk_level);
create index audit_logs_created_at_idx on audit_logs(created_at);

create table roles (
  id text primary key,
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at text not null,
  updated_at text not null
);

create table permissions (
  key text primary key,
  created_at text not null
);

create table role_permissions (
  role_id text not null,
  permission_key text not null,
  primary key (role_id, permission_key)
);

create index role_permissions_role_id_idx on role_permissions(role_id);
create index role_permissions_permission_key_idx on role_permissions(permission_key);
