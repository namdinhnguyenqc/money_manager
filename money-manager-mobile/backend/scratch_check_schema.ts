import { supabaseAdmin } from './src/lib/supabase.js';

async function checkSchema() {
  // Use raw SQL via supabase rest - try known tables that were working before
  const tables = ['rooms', 'contracts', 'tenants', 'services', 'invoices', 'wallets', 'categories', 'transactions', 'boarding_houses', 'bank_config', 'meter_readings', 'invoice_items', 'contract_services', 'trading_items', 'users', 'user_profiles'];
  
  for (const table of tables) {
    try {
      const res = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`,
        {
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            'Prefer': 'count=exact'
          }
        }
      );
      const count = res.headers.get('content-range');
      if (res.ok) {
        console.log(`✅ ${table} — exists (${count})`);
      } else {
        const body = await res.json();
        console.log(`❌ ${table} — ${res.status}: ${body.message || JSON.stringify(body)}`);
      }
    } catch (e: any) {
      console.log(`❌ ${table} — ${e.message}`);
    }
  }
  
  // Also check column types for key tables
  console.log("\n--- Column types for key tables ---");
  for (const table of ['rooms', 'contracts', 'invoices', 'tenants', 'services']) {
    try {
      const res = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`,
        {
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          console.log(`\n${table} sample row:`, JSON.stringify(data[0], null, 2));
        } else {
          console.log(`\n${table}: empty table`);
        }
      }
    } catch {}
  }
}

// Load env
import 'dotenv/config';
checkSchema();
