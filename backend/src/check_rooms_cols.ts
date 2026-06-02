import { supabaseAdmin } from "./lib/supabase.js";

async function checkRoomsCols() {
  console.log("Checking columns in 'rooms' table...");
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .limit(1);

  if (error) {
    console.error("❌ Error fetching rooms:", error.message);
  } else {
    console.log("✅ Successfully fetched rooms. Returned keys:");
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No rows in rooms table, trying insert to inspect error...");
      const { error: insertError } = await supabaseAdmin.from("rooms").insert({
        name: "Test Room Temp",
        price: 1000
      }).select();
      if (insertError) {
        console.log("Insert error (might contain missing columns details):", insertError.message);
      }
    }
  }
}

checkRoomsCols().catch(console.error);
