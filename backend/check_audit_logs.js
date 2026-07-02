import { supabaseAdmin } from "./dist/lib/supabase.js";

async function checkAudit() {
  const { data: logs, error } = await supabaseAdmin
    .from("rental_audit_logs")
    .select("*")
    .eq("actor_user_id", "a63f0af3-795a-47f0-b565-5c65a385cb3f")
    .limit(10);
  
  if (error) {
    console.error("Error fetching audit logs:", error.message);
  } else {
    console.log("Audit logs count:", logs?.length || 0);
    console.log(JSON.stringify(logs, null, 2));
  }
}

checkAudit();
