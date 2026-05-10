import { supabaseAdmin } from './src/lib/supabase.js';

async function checkWallets() {
  const { data, error } = await supabaseAdmin.from('wallets').select('*').limit(1);
  if (error) {
    console.error("Error:", error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log("Wallets columns:", Object.keys(data[0]).join(', '));
  } else {
    console.log("No data in wallets table.");
  }
}

checkWallets();
