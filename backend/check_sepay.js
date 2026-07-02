import { supabaseAdmin } from "./dist/lib/supabase.js";

async function checkDatabase() {
  console.log("Checking invoices in database...");
  const { data: invoices, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("id, payment_code, total_amount, status, user_id")
    .limit(5);

  if (invoiceError) {
    console.error("Error fetching invoices:", invoiceError.message);
  } else {
    console.log(`Found ${invoices?.length || 0} invoices:`);
    console.log(JSON.stringify(invoices, null, 2));
  }

  console.log("\nChecking SePay webhook events in database...");
  const { data: events, error: eventError } = await supabaseAdmin
    .from("sepay_webhook_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (eventError) {
    console.error("Error fetching events:", eventError.message);
  } else {
    console.log(`Found ${events?.length || 0} events:`);
    console.log(JSON.stringify(events, null, 2));
  }
}

checkDatabase();
