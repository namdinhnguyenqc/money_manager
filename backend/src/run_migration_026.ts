import { supabaseAdmin } from "./lib/supabase.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log("=== Running migration 026_feedback_system ===");
  const sqlPath = path.resolve(__dirname, "migrations/026_feedback_system.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // Since RPC exec_sql can only run a single statement at a time in some versions of Postgres,
  // let's split the SQL file by semicolons or execute it as a single transactional block.
  // Actually, exec_sql usually accepts a single string containing multiple commands perfectly.
  const { error } = await supabaseAdmin.rpc("exec_sql", { sql_query: sql });
  if (error) {
    console.error("❌ Migration failed via RPC:", error.message);
    process.exit(1);
  } else {
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  }
}

runMigration().catch((err) => {
  console.error("❌ Migration exception:", err);
  process.exit(1);
});
