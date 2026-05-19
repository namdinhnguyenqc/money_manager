
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('Checking tables...');
  
  const tables = ['rooms', 'contracts', 'transactions', 'deposit_refunds'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table ${table}: ${error.message}`);
    } else {
      console.log(`✅ Table ${table} exists. Columns: ${Object.keys(data[0] || {}).join(', ')}`);
    }
  }
}

checkSchema();
