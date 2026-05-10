import { supabaseAdmin } from './src/lib/supabase.js';

async function checkContracts() {
  console.log("Attempting to insert a test contract with NUMBER room_id to see if it fails differently...");
  const { error } = await supabaseAdmin.from('contracts').insert({
    room_id: 12345, // Invalid but numeric
    tenant_id: 20,
    start_date: "2026-05-02",
    deposit: 0,
    status: "active"
  }).select();

  if (error) {
    console.error("INSERT ERROR (with number):", error.message);
  } else {
    console.log("INSERT SUCCESS (with number):", error);
  }
}

checkContracts();
