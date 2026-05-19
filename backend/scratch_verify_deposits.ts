import { supabaseAdmin } from './src/lib/supabase.js';

async function verifyTables() {
  const tablesToCheck = ['deposits', 'deposit_refunds', 'contracts', 'rooms', 'transactions'];
  
  console.log("--- VERIFYING TABLES ---");
  for (const t of tablesToCheck) {
    const { error } = await supabaseAdmin.from(t).select('*').limit(0);
    if (!error) {
      console.log(`✅ Table '${t}' EXISTS`);
    } else {
      console.log(`❌ Table '${t}' ERROR: ${error.message}`);
    }
  }
}

verifyTables();
