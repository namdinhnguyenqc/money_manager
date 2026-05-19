import { Client } from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, '../src/migrations');
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || 'postgres://postgres:postgres@localhost:5432/money_manager';

async function apply() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    // Ensure migrations_log table exists
    await client.query(`CREATE TABLE IF NOT EXISTS migrations_log (id SERIAL PRIMARY KEY, filename TEXT NOT NULL UNIQUE, applied_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW())`);
    await client.query('BEGIN');
    for (const f of files) {
      const logRes = await client.query('SELECT 1 FROM migrations_log WHERE filename = $1', [f]);
      if (logRes.rows.length > 0) {
        console.log(`Skipping ${f} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
      console.log(`Applying ${f}...`);
      await client.query(sql);
      await client.query('INSERT INTO migrations_log (filename) VALUES ($1)', [f]);
      console.log(`Applied ${f}`);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    await client.end();
  }
}

apply().then(() => process.exit(0)).catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
