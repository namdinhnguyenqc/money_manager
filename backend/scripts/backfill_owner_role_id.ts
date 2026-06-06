/**
 * Backfill script: assign OWNER_BASIC role_id to all existing OWNER users without one
 * Run: npx tsx scripts/backfill_owner_role_id.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OWNER_BASIC_ROLE_ID = "8a62d08a-2c8b-4b2a-8888-000000000001";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔍 Finding OWNER users without role_id...");

  // Find all OWNER users without role_id
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, role, role_id")
    .eq("role", "OWNER")
    .is("role_id", null);

  if (error) {
    console.error("❌ Error fetching users:", error.message);
    process.exit(1);
  }

  console.log(`Found ${users?.length ?? 0} OWNER users without role_id`);

  if (!users || users.length === 0) {
    console.log("✅ All owners already have a role_id assigned. Nothing to do.");
    return;
  }

  const ids = users.map((u: any) => u.id);
  console.log("Users to update:", users.map((u: any) => `${u.email} (${u.id})`).join("\n  "));

  const { error: updateError, count } = await supabase
    .from("users")
    .update({ role_id: OWNER_BASIC_ROLE_ID, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) {
    console.error("❌ Update failed:", updateError.message);
    process.exit(1);
  }

  console.log(`\n✅ Successfully assigned OWNER_BASIC role_id to ${users.length} users.`);

  // Verify
  const { data: verify } = await supabase
    .from("users")
    .select("id, email, role_id")
    .eq("role", "OWNER")
    .is("role_id", null);

  if (!verify || verify.length === 0) {
    console.log("✅ Verification passed: all OWNER users now have a role_id.");
  } else {
    console.warn(`⚠️  Still ${verify.length} users without role_id after update.`);
  }
}

main().catch(console.error);
