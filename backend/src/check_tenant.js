import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase config is missing.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const phone = '0927368772';
  console.log(`Checking DB state for phone: ${phone}`);

  // 1. Check users table
  const { data: users, error: errUsers } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone);
  console.log('\n--- USERS ---');
  console.log(users);
  if (errUsers) console.error('Error users:', errUsers);

  // 2. Check tenants table
  const { data: tenants, error: errTenants } = await supabase
    .from('tenants')
    .select('*')
    .eq('phone', phone);
  console.log('\n--- TENANTS ---');
  console.log(tenants);
  if (errTenants) console.error('Error tenants:', errTenants);

  if (tenants && tenants.length > 0) {
    for (const t of tenants) {
      // 3. Check contracts for each tenant
      const { data: contracts, error: errContracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', t.id);
      console.log(`\n--- CONTRACTS FOR TENANT ${t.name} (id: ${t.id}) ---`);
      console.log(contracts);
      if (errContracts) console.error('Error contracts:', errContracts);
    }
  }

  // 4. Check tenant_accounts
  if (users && users.length > 0) {
    for (const u of users) {
      const { data: accounts, error: errAcc } = await supabase
        .from('tenant_accounts')
        .select('*')
        .eq('user_id', u.id);
      console.log(`\n--- TENANT_ACCOUNTS FOR USER (id: ${u.id}) ---`);
      console.log(accounts);
      if (errAcc) console.error('Error accounts:', errAcc);
    }
  }
}

run().catch(console.error);
