-- Money Manager Supabase Schema (Phase 2)
-- Run in Supabase SQL Editor

create table if not exists public.wallets (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('personal', 'rental', 'trading')),
  icon text,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  type text not null check (type in ('income', 'expense')),
  wallet_id bigint not null references public.wallets(id) on delete cascade,
  parent_id bigint references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(18,2) not null check (amount >= 0),
  description text,
  category_id bigint references public.categories(id) on delete set null,
  wallet_id bigint not null references public.wallets(id) on delete cascade,
  image_uri text,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  price numeric(18,2) not null check (price >= 0),
  status text not null default 'vacant' check (status in ('vacant', 'occupied')),
  has_ac boolean not null default false,
  num_people integer not null default 1 check (num_people > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  id_card text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id bigint not null references public.rooms(id) on delete cascade,
  tenant_id bigint not null references public.tenants(id) on delete cascade,
  start_date date not null,
  end_date date,
  deposit numeric(18,2) not null default 0 check (deposit >= 0),
  status text not null default 'active' check (status in ('active', 'terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'fixed' check (type in ('fixed', 'per_person', 'metered', 'meter')),
  unit_price numeric(18,2) not null default 0 check (unit_price >= 0),
  unit_price_ac numeric(18,2) not null default 0 check (unit_price_ac >= 0),
  unit text not null default 'thang',
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_services (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id bigint not null references public.contracts(id) on delete cascade,
  service_id bigint not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, service_id)
);

create table if not exists public.invoices (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id bigint references public.rooms(id) on delete set null,
  contract_id bigint not null references public.contracts(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2000),
  room_fee numeric(18,2) not null default 0 check (room_fee >= 0),
  total_amount numeric(18,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(18,2) not null default 0 check (paid_amount >= 0),
  previous_debt numeric(18,2) not null default 0 check (previous_debt >= 0),
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'partially_paid', 'sent')),
  elec_old numeric(18,2),
  elec_new numeric(18,2),
  water_old numeric(18,2),
  water_new numeric(18,2),
  transaction_id bigint references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, contract_id, month, year)
);

create table if not exists public.invoice_items (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id bigint not null references public.invoices(id) on delete cascade,
  service_id bigint references public.services(id) on delete set null,
  name text not null,
  detail text,
  amount numeric(18,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_config (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_id text not null,
  account_no text not null,
  account_name text not null,
  qr_uri text,
  user_avatar text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_categories (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_items (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id bigint not null references public.wallets(id) on delete cascade,
  name text not null,
  category text,
  import_price numeric(18,2) not null check (import_price >= 0),
  sell_price numeric(18,2) check (sell_price >= 0),
  target_price numeric(18,2) check (target_price >= 0),
  import_date date not null,
  sell_date date,
  status text not null default 'available' check (status in ('available', 'sold')),
  note text,
  batch_id text,
  transaction_id bigint references public.transactions(id) on delete set null,
  sell_transaction_id bigint references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meter_readings (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id bigint not null references public.contracts(id) on delete cascade,
  service_id bigint not null references public.services(id) on delete cascade,
  reading_date date not null,
  reading_value numeric(18,2) not null check (reading_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wallets_user on public.wallets(user_id);
create index if not exists idx_categories_user_wallet on public.categories(user_id, wallet_id);
create index if not exists idx_transactions_user_wallet_date on public.transactions(user_id, wallet_id, date desc);
create index if not exists idx_rooms_user on public.rooms(user_id);
create index if not exists idx_tenants_user on public.tenants(user_id);
create index if not exists idx_contracts_user_room_status on public.contracts(user_id, room_id, status);
create index if not exists idx_services_user_active on public.services(user_id, active);
create index if not exists idx_invoices_user_period on public.invoices(user_id, year, month);
create index if not exists idx_invoice_items_user_invoice on public.invoice_items(user_id, invoice_id);
create index if not exists idx_trading_items_user_wallet_status on public.trading_items(user_id, wallet_id, status);
create index if not exists idx_meter_readings_user_contract_date on public.meter_readings(user_id, contract_id, reading_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wallets_updated_at on public.wallets;
create trigger trg_wallets_updated_at before update on public.wallets for each row execute function public.set_updated_at();
drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();
drop trigger if exists trg_rooms_updated_at on public.rooms;
create trigger trg_rooms_updated_at before update on public.rooms for each row execute function public.set_updated_at();
drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at before update on public.tenants for each row execute function public.set_updated_at();
drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at before update on public.contracts for each row execute function public.set_updated_at();
drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at before update on public.services for each row execute function public.set_updated_at();
drop trigger if exists trg_contract_services_updated_at on public.contract_services;
create trigger trg_contract_services_updated_at before update on public.contract_services for each row execute function public.set_updated_at();
drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();
drop trigger if exists trg_invoice_items_updated_at on public.invoice_items;
create trigger trg_invoice_items_updated_at before update on public.invoice_items for each row execute function public.set_updated_at();
drop trigger if exists trg_bank_config_updated_at on public.bank_config;
create trigger trg_bank_config_updated_at before update on public.bank_config for each row execute function public.set_updated_at();
drop trigger if exists trg_trading_categories_updated_at on public.trading_categories;
create trigger trg_trading_categories_updated_at before update on public.trading_categories for each row execute function public.set_updated_at();
drop trigger if exists trg_trading_items_updated_at on public.trading_items;
create trigger trg_trading_items_updated_at before update on public.trading_items for each row execute function public.set_updated_at();
drop trigger if exists trg_meter_readings_updated_at on public.meter_readings;
create trigger trg_meter_readings_updated_at before update on public.meter_readings for each row execute function public.set_updated_at();

alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.rooms enable row level security;
alter table public.tenants enable row level security;
alter table public.contracts enable row level security;
alter table public.services enable row level security;
alter table public.contract_services enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.bank_config enable row level security;
alter table public.trading_categories enable row level security;
alter table public.trading_items enable row level security;
alter table public.meter_readings enable row level security;

drop policy if exists "wallets_owner_all" on public.wallets;
create policy "wallets_owner_all" on public.wallets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "categories_owner_all" on public.categories;
create policy "categories_owner_all" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "transactions_owner_all" on public.transactions;
create policy "transactions_owner_all" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "rooms_owner_all" on public.rooms;
create policy "rooms_owner_all" on public.rooms for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tenants_owner_all" on public.tenants;
create policy "tenants_owner_all" on public.tenants for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "contracts_owner_all" on public.contracts;
create policy "contracts_owner_all" on public.contracts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "services_owner_all" on public.services;
create policy "services_owner_all" on public.services for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "contract_services_owner_all" on public.contract_services;
create policy "contract_services_owner_all" on public.contract_services for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "invoices_owner_all" on public.invoices;
create policy "invoices_owner_all" on public.invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "invoice_items_owner_all" on public.invoice_items;
create policy "invoice_items_owner_all" on public.invoice_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "bank_config_owner_all" on public.bank_config;
create policy "bank_config_owner_all" on public.bank_config for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "trading_categories_owner_all" on public.trading_categories;
create policy "trading_categories_owner_all" on public.trading_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "trading_items_owner_all" on public.trading_items;
create policy "trading_items_owner_all" on public.trading_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "meter_readings_owner_all" on public.meter_readings;
create policy "meter_readings_owner_all" on public.meter_readings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
