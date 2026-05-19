import { supabaseAdmin } from './src/lib/supabase.js';

async function inspectColumns() {
  const { data, error } = await supabaseAdmin.from('contracts').select('*').limit(1);
  if (error) {
    console.error("Error fetching contracts:", error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns in 'contracts' table:", Object.keys(data[0]).join(', '));
  } else {
    console.log("No data in contracts table to inspect columns.");
    // Fallback: use a known query to check a specific column
    const { error: colErr } = await supabaseAdmin.from('contracts').select('settlement_status').limit(0);
    if (colErr) {
      console.log("❌ Column 'settlement_status' does NOT exist:", colErr.message);
    } else {
      console.log("✅ Column 'settlement_status' EXISTS");
    }
  }
}

inspectColumns();
