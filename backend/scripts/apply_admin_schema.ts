import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const projectRoot = path.resolve(process.cwd(), "..");
const sqlInput = process.argv[2] || "docs/admin/admin-schema-tables-only.sql";
const sqlPath = path.isAbsolute(sqlInput) ? sqlInput : path.resolve(projectRoot, sqlInput);
const sql = fs.readFileSync(sqlPath, "utf8");

const projectRef = process.env.SUPABASE_URL
  ?.replace("https://", "")
  .replace(".supabase.co", "");

const connectionString =
  process.env.DATABASE_URL ||
  process.env.PG_CONNECTION_STRING ||
  (projectRef && process.env.SUPABASE_DB_PASSWORD
    ? `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.${projectRef}.supabase.co:5432/postgres`
    : "");

if (!connectionString) {
  console.error("Missing DATABASE_URL/PG_CONNECTION_STRING or SUPABASE_DB_PASSWORD.");
  console.error("Add one of these to backend/.env, then run: npx tsx scripts/apply_admin_schema.ts [sql-file]");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});

try {
  console.log(`Applying admin schema: ${sqlPath}`);
  await pool.query(sql);
  await pool.query("notify pgrst, 'reload schema';");
  const { rows } = await pool.query(`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'tenants' and column_name = 'status')
        or table_name in ('roles', 'permissions', 'role_permissions', 'admin_system_configs', 'admin_notifications')
      )
    order by table_name, column_name
  `);
  console.table(rows);
  console.log("Admin schema applied and PostgREST schema reload requested.");
} finally {
  await pool.end();
}
