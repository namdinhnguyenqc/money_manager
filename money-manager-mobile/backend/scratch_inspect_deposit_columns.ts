import { supabaseAdmin } from './src/lib/supabase.js';

async function inspectDepositColumns() {
  const { data, error } = await supabaseAdmin.from('deposits').select('*').limit(1);
  if (error) {
    console.error("Error fetching deposits:", error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns in 'deposits' table:", Object.keys(data[0]).join(', '));
  } else {
    // Probe columns
    const columns = ['user_id', 'room_id', 'contract_id', 'tenant_name', 'tenant_phone', 'amount', 'type', 'status', 'recorded_at', 'note'];
    console.log("Probing 'deposits' columns...");
    for (const col of columns) {
      const { error: colErr } = await supabaseAdmin.from('deposits').select(col).limit(0);
      if (colErr) {
        console.log(`❌ Column '${col}' MISSING: ${colErr.message}`);
      } else {
        console.log(`✅ Column '${col}' EXISTS`);
      }
    }
  }
}

inspectDepositColumns();
