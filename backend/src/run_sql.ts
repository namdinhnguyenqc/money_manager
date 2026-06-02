import pg from "pg";

const connectionString = process.env.DATABASE_URL;

async function runSQL() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run SQL scripts.");
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to PostgreSQL database...");
    const client = await pool.connect();
    console.log("Connected successfully!");

    console.log("Executing SQL: ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;");
    const res = await client.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `);

    console.log("SQL executed successfully!", res);

    client.release();
  } catch (err: any) {
    console.error("Database query failed:", err.message);
  } finally {
    await pool.end();
  }
}

runSQL();
