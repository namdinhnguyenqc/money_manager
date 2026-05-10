import { supabaseAdmin } from "./lib/supabase.js";

async function checkConstraints() {
  console.log("Checking users table constraints...");
  
  // We try to trigger an error and see the detail
  const { error } = await supabaseAdmin.from("users").insert({
    email: "test@example.com",
    google_id: "test_google_id"
  });
  
  if (error) {
    console.log("Error code:", error.code);
    console.log("Error message:", error.message);
    console.log("Error details:", error.details);
    console.log("Error hint:", error.hint);
  } else {
    console.log("Insert worked (cleaned up immediately)");
    await supabaseAdmin.from("users").delete().eq("email", "test@example.com");
  }
}

checkConstraints();
