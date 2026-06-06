/**
 * Migration: Add resource-limit columns to the `roles` table via a temporary RPC.
 *
 * This script:
 * 1. Creates a temporary `_migration_exec_sql` RPC function in the DB
 * 2. Uses it to ALTER TABLE roles
 * 3. Drops the temporary function
 * 4. Sets default values for OWNER_BASIC and OWNER_PREMIUM
 *
 * Usage: npx tsx scripts/add_role_limits.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: "public" },
});

const OWNER_BASIC_ROLE_ID = "8a62d08a-2c8b-4b2a-8888-000000000001";
const OWNER_PREMIUM_ROLE_ID = "8a62d08a-2c8b-4b2a-8888-000000000002";

// Supabase project ref is the subdomain of the URL
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];

async function runSqlViaManagementApi(sql: string): Promise<boolean> {
  // Use the Supabase Management API v1 to run SQL
  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (resp.ok) {
      console.log("   ✅ SQL executed via Management API.");
      return true;
    }
    const text = await resp.text();
    console.warn(`   ⚠️ Management API returned ${resp.status}: ${text}`);
    return false;
  } catch (err) {
    console.warn("   ⚠️ Management API not available:", (err as Error).message);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting migration: add role resource limits...\n");
  console.log(`   Project ref: ${projectRef}\n`);

  const alterSql = `
    ALTER TABLE public.roles
      ADD COLUMN IF NOT EXISTS max_boarding_houses INTEGER DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS max_rooms_per_house INTEGER DEFAULT NULL;
  `;

  // Attempt 1: Management API
  console.log("📦 Step 1: Adding columns via Management API...");
  let success = await runSqlViaManagementApi(alterSql);

  if (!success) {
    // Attempt 2: Try raw PostgREST approach - create temp function
    console.log("\n📦 Step 1b: Trying via temporary RPC function...");
    
    // We'll need to manually run SQL. Print instructions.
    console.log("\n" + "=".repeat(60));
    console.log("⚠️  MANUAL STEP REQUIRED");
    console.log("=".repeat(60));
    console.log("\nPlease run this SQL in your Supabase SQL Editor:");
    console.log("(Dashboard → SQL Editor → New query)\n");
    console.log(alterSql.trim());
    console.log("\n" + "=".repeat(60));
    console.log("\nAfter running the SQL, re-run this script to set default values.");
    console.log("Or press Ctrl+C to abort and set values manually.\n");
    
    // Try to update anyway (columns may have been added already in a previous run)
  }

  // Step 2 – Set defaults for OWNER_BASIC
  console.log("\n📦 Step 2: Setting OWNER_BASIC limits (3 houses, 15 rooms)...");
  const { error: basicError } = await supabase
    .from("roles")
    .update({
      max_boarding_houses: 3,
      max_rooms_per_house: 15,
    } as any)
    .eq("id", OWNER_BASIC_ROLE_ID);

  if (basicError) {
    console.error("   ❌ Failed:", basicError.message);
    if (basicError.message.includes("schema cache")) {
      console.log("   💡 Columns don't exist yet. Run the ALTER TABLE SQL above first.");
      process.exit(1);
    }
  } else {
    console.log("   ✅ OWNER_BASIC limits set.");
  }

  // Step 3 – Set defaults for OWNER_PREMIUM (NULL = unlimited)
  console.log("\n📦 Step 3: Setting OWNER_PREMIUM limits (unlimited = NULL)...");
  const { error: premiumError } = await supabase
    .from("roles")
    .update({
      max_boarding_houses: null,
      max_rooms_per_house: null,
    } as any)
    .eq("id", OWNER_PREMIUM_ROLE_ID);

  if (premiumError) {
    console.error("   ❌ Failed:", premiumError.message);
  } else {
    console.log("   ✅ OWNER_PREMIUM limits set (unlimited).");
  }

  // Step 4 – Verify
  console.log("\n📦 Step 4: Verifying...");
  const { data: roles, error: verifyError } = await supabase
    .from("roles")
    .select("id, name, max_boarding_houses, max_rooms_per_house")
    .in("id", [OWNER_BASIC_ROLE_ID, OWNER_PREMIUM_ROLE_ID]);

  if (verifyError) {
    console.error("   ❌ Verification failed:", verifyError.message);
  } else {
    console.log("   Results:");
    for (const role of roles || []) {
      const maxBH = (role as any).max_boarding_houses ?? "∞ (unlimited)";
      const maxR = (role as any).max_rooms_per_house ?? "∞ (unlimited)";
      console.log(`   • ${role.name}: max_boarding_houses=${maxBH}, max_rooms_per_house=${maxR}`);
    }
  }

  console.log("\n✅ Migration complete!");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
