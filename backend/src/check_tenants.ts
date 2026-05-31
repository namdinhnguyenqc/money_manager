import { supabaseAdmin } from "./lib/supabase.js";
import dotenv from "dotenv";
dotenv.config();

async function checkTenants() {
  console.log("Fetching tenants with active contracts...");
  
  // 1. Get active contracts
  const { data: contracts, error: contractErr } = await supabaseAdmin
    .from("contracts")
    .select("id, status, tenant_id, room_id, rooms(name)")
    .eq("status", "active");

  if (contractErr) {
    console.error("Failed to query contracts:", contractErr.message);
    return;
  }

  if (!contracts || contracts.length === 0) {
    console.log("No active contracts found in the database.");
    return;
  }

  console.log(`\nFound ${contracts.length} active contract(s):`);

  // 2. Fetch tenant details
  for (const c of contracts) {
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("id, name, phone, invite_code, invite_status")
      .eq("id", c.tenant_id)
      .single();

    if (tenantErr) {
      console.error(`Failed to query tenant for contract ${c.id}:`, tenantErr.message);
      continue;
    }

    console.log(`----------------------------------------`);
    console.log(`Tenant Name: ${tenant.name}`);
    console.log(`Phone: ${tenant.phone}`);
    console.log(`Room: ${Array.isArray(c.rooms) ? (c.rooms as any)[0]?.name : (c.rooms as any)?.name || "Unknown"}`);
    console.log(`Invite Code: ${tenant.invite_code || "None"}`);
    console.log(`Invite Status: ${tenant.invite_status}`);
    console.log(`\n👉 TEST WITH AUTO-ACTIVATION LOGIN:`);
    console.log(`Username: ${tenant.phone}`);
    console.log(`Password: ${tenant.phone}`);
  }
  console.log(`----------------------------------------`);
}

checkTenants();
