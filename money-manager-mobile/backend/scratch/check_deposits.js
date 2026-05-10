
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDeposits() {
  const { data, error } = await supabase.from('deposits').select('*').limit(1);
  if (error) {
    console.log(`❌ Table deposits: ${error.message}`);
  } else {
    console.log(`✅ Table deposits exists. Columns: ${Object.keys(data[0] || {}).join(', ')}`);
  }
}

checkDeposits();
