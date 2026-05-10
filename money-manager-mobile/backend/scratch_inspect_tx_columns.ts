import { supabaseAdmin } from './src/lib/supabase.js';

async function inspectTxColumns() {
  const { data, error } = await supabaseAdmin.from('transactions').select('*').limit(1);
  if (error) {
    console.error("Error fetching transactions:", error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns in 'transactions' table:", Object.keys(data[0]).join(', '));
  } else {
    console.log("No data in transactions table. Probing columns...");
    const cols = ['user_id', 'type', 'amount', 'description', 'category_id', 'wallet_id', 'image_uri', 'date', 'invoice_id', 'contract_id'];
    for (const c of cols) {
      const { error: e } = await supabaseAdmin.from('transactions').select(c).limit(0);
      console.log(`${e ? '❌' : '✅'} ${c}`);
    }
  }
}

inspectTxColumns();
