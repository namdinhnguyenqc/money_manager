import "dotenv/config";
import { supabaseAdmin } from "./lib/supabase.js";

async function checkIndexes() {
  const sql = `
    SELECT
      tablename,
      indexname,
      indexdef
    FROM
      pg_indexes
    WHERE
      schemaname = 'public'
    ORDER BY
      tablename,
      indexname;
  `;

  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    console.error("Failed to fetch indexes:", res.status, await res.text());
  } else {
    const data = await res.json();
    console.log("Database indexes in public schema:");
    data.forEach((idx: any) => {
      console.log(`- Table: ${idx.tablename} | Index: ${idx.indexname} | Def: ${idx.indexdef}`);
    });
  }
}

checkIndexes();
