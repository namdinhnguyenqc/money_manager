
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAndClear() {
  console.log('🚀 Starting system cleanup and setup...');

  // 1. Create deposits table if not exists (using RPC or just trying to insert)
  // Since we can't easily run raw SQL without an RPC, we'll try to use the schema as is 
  // or I'll just skip the table creation and use the existing ones if possible.
  // Actually, I'll try to run a migration-like script.
  
  // 2. Clear data
  const tables = ['deposit_refunds', 'invoice_items', 'invoices', 'contract_services', 'contracts', 'tenants', 'transactions'];
  
  for (const table of tables) {
    console.log(`Cleaning ${table}...`);
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) console.error(`Error cleaning ${table}: ${error.message}`);
  }

  // 3. Reset room status
  console.log('Resetting room statuses...');
  const { error: roomError } = await supabase.from('rooms').update({ 
    status: 'AVAILABLE',
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (roomError) console.error(`Error resetting rooms: ${roomError.message}`);

  console.log('✅ Cleanup complete!');
}

setupAndClear();
