import { supabaseAdmin } from "./lib/supabase.js";

async function testLongGoogleId() {
  const longId = "a".repeat(1000);
  console.log("Testing long google_id...");
  const { error } = await supabaseAdmin.from("users").insert({
    email: "long@example.com",
    google_id: longId
  });
  
  if (error) {
    console.log("LONG_ID_ERROR:", error.message);
  } else {
    console.log("Long ID worked.");
    await supabaseAdmin.from("users").delete().eq("email", "long@example.com");
  }
}

testLongGoogleId();
