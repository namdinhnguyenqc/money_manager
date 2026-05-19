import { supabaseAdmin } from "./lib/supabase.js";

async function debugDupes() {
  console.log("Fetching rooms...");
  const { data: rooms } = await supabaseAdmin.from("rooms").select("id, name");
  console.log("Rooms:", JSON.stringify(rooms, null, 2));

  console.log("Fetching invoices for today...");
  const { data: invoices } = await supabaseAdmin
    .from("invoices")
    .select("id, room_id, total_amount, month, year, created_at, status")
    .order("created_at", { ascending: false });
  console.log("Invoices:", JSON.stringify(invoices, null, 2));

  console.log("Fetching transactions for today...");
  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("id, invoice_id, amount, description, created_at")
    .order("created_at", { ascending: false });
  console.log("Transactions:", JSON.stringify(txs, null, 2));
}

debugDupes();
