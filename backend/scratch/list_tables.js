
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not work if no RPC
  if (error) {
     // Try querying pg_catalog
     const { data: tables, error: pgError } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
     if (pgError) {
        // Last resort: query something common and see what happens
        console.log("Could not list tables easily. Trying a search approach.");
     } else {
        console.log(tables.map(t => t.tablename));
     }
  } else {
    console.log(data);
  }
}

listTables();
