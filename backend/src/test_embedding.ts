import "dotenv/config";
import { supabaseAdmin } from "./lib/supabase.js";

async function testEmbedding() {
  const start = Date.now();
  console.log(`Testing query embedding for any rooms`);

  // Test embedding rooms -> contracts -> tenants
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select(`
      *,
      contracts (
        id, deposit, start_date, end_date, status, tenant_id,
        tenants (
          id, name, phone, id_card, address
        )
      )
    `)
    .limit(5);

  const duration = Date.now() - start;

  if (error) {
    console.error("❌ Resource embedding failed:", error);
  } else {
    console.log(`✅ Embedding query succeeded in ${duration}ms!`);
    console.log(`Fetched ${data?.length} rooms.`);
    if (data && data.length > 0) {
      console.log("Sample room data with embedded contracts:", JSON.stringify(data[0], null, 2));
    }
  }
}

testEmbedding();
