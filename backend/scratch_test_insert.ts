import { supabaseAdmin } from './src/lib/supabase.js';

async function checkContracts() {
  console.log("Attempting to insert a test contract with UUID room_id...");
  const { data, error } = await supabaseAdmin.from('contracts').insert({
    room_id: "5e0b37d4-8951-415c-a7e6-03a3bcd6609a",
    tenant_id: 20,
    start_date: "2026-05-02",
    deposit: 0,
    status: "active"
  }).select();

  if (error) {
    console.error("INSERT ERROR:", error.message);
  } else {
    console.log("INSERT SUCCESS:", data);
  }
}

checkContracts();
