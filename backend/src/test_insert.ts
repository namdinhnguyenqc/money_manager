import { supabaseAdmin } from "./lib/supabase.js";

async function testInsert() {
  const testEmail = `test_${Date.now()}@example.com`;
  console.log(`Attempting to insert user: ${testEmail}`);
  
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      email: testEmail,
      google_id: `google_${Date.now()}`,
      name: "Test User",
      role: "USER",
      status: "ACTIVE",
      provider: "GOOGLE"
    })
    .select()
    .single();

  if (error) {
    console.error("Insert failed!");
    console.error("Error message:", error.message);
  } else {
    console.log("Insert successful!", data.id);
    // Cleanup
    await supabaseAdmin.from("users").delete().eq("id", data.id);
  }
}

testInsert();
