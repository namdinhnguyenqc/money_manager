-- [wallets].[user_id] — Used frequently to filter wallets by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- [rooms].[user_id] — Fast lookup for owner's rooms
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_user_id ON public.rooms(user_id);

-- [rooms].[status] — Used in WHERE clauses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_status ON public.rooms(status);

-- [tenants].[user_id] — Fast lookup for owner's tenants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);

-- [contracts].[user_id] — Lookups for owner's contracts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);

-- [contracts].[room_id] — Fast lookup for contracts by room
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_room_id ON public.contracts(room_id);

-- [contracts].[tenant_id] — Fast lookup for contracts by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);

-- [invoices].[user_id] — Fast lookup for owner's invoices
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);

-- [invoices].[contract_id] — Lookups by contract
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_contract_id ON public.invoices(contract_id);

-- [users].[status] — Filtering active users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON public.users(status);

-- [invoices].[created_at] — ORDER BY created_at optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- [rooms].[created_at] — ORDER BY created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);
