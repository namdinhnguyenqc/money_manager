import pg from "pg";

const connectionString = process.env.DATABASE_URL;

async function runSQL() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run this migration.");
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to Supabase PostgreSQL database...");
    const client = await pool.connect();
    console.log("Connected successfully!");

    console.log("Executing SQL: ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS file_url TEXT;");
    const res = await client.query(`
      ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS file_url TEXT;
      COMMENT ON COLUMN public.contracts.file_url IS 'Word (.docx) or PDF contract file attachment URL';
    `);

    console.log("Migration 025 executed successfully!", res);

    client.release();
  } catch (err: any) {
    console.error("Database query failed:", err.message);
  } finally {
    await pool.end();
  }
}

runSQL().catch(console.error);
