import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function runMigration() {
  const sqlPath = path.resolve(__dirname, 'src/migrations/016_full_uuid_reset.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  console.log("=== Running migration 016_full_uuid_reset.sql ===");
  console.log(`SQL length: ${sql.length} chars`);
  console.log(`Target: ${SUPABASE_URL}`);
  
  // Use Supabase Management API or direct pg connection
  // Since we don't have DATABASE_URL, use the REST SQL endpoint
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  
  if (!res.ok) {
    const body = await res.text();
    console.log(`RPC exec_sql not available (${res.status}). Trying pg directly...`);
    
    // Try using pg module directly with Supabase connection string
    const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
    const connString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD || ''}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
    
    // Check if we have pg available
    try {
      const pg = await import('pg');
      const Pool = pg.default?.Pool || pg.Pool;
      
      // Try direct connection
      const directConn = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || ''}@db.${projectRef}.supabase.co:5432/postgres`;
      
      console.log("Attempting direct pg connection...");
      console.log("(Need SUPABASE_DB_PASSWORD env var)");
      
      if (!process.env.SUPABASE_DB_PASSWORD) {
        console.log("\n❌ Cannot run migration automatically without database password.");
        console.log("\nPlease do ONE of the following:");
        console.log("");
        console.log("Option A: Run the SQL in Supabase Dashboard");
        console.log("  1. Go to https://supabase.com/dashboard/project/" + projectRef + "/sql");
        console.log("  2. Copy-paste the contents of src/migrations/016_full_uuid_reset.sql");
        console.log("  3. Click 'Run'");
        console.log("");
        console.log("Option B: Add database password to .env and re-run");
        console.log("  1. Go to Supabase Dashboard > Settings > Database");
        console.log("  2. Copy the database password");
        console.log("  3. Add to .env: SUPABASE_DB_PASSWORD=your_password_here");
        console.log("  4. Re-run: npx tsx run_migration.ts");
        return;
      }
      
      const pool = new Pool({ connectionString: directConn, ssl: { rejectUnauthorized: false } });
      
      try {
        console.log("Connected. Running migration...");
        await pool.query(sql);
        console.log("✅ Migration completed successfully!");
        
        // Verify
        const result = await pool.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
          ORDER BY table_name
        `);
        console.log("\nTables created:");
        result.rows.forEach((r: any) => console.log(`  ✅ ${r.table_name}`));
      } finally {
        await pool.end();
      }
    } catch (pgErr: any) {
      console.error("pg connection failed:", pgErr.message);
      console.log("\nPlease run the migration manually in Supabase SQL Editor.");
      console.log("File: src/migrations/016_full_uuid_reset.sql");
    }
  } else {
    const data = await res.json();
    console.log("✅ Migration executed via RPC:", data);
  }
}

runMigration().catch(console.error);
