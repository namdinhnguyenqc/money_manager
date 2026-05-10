import { supabaseAdmin } from "./lib/supabase.js";

async function testDuplicate() {
  const testEmail = `dup_test@example.com`;
  console.log(`Attempting to insert first user: ${testEmail}`);
  
  await supabaseAdmin.from("users").delete().eq("email", testEmail);

  await supabaseAdmin
    .from("users")
    .insert({
      email: testEmail,
      google_id: `g1_${Date.now()}`,
      name: "User 1",
      role: "USER",
      status: "ACTIVE",
      provider: "GOOGLE"
    });

  console.log(`Attempting to insert second user with SAME email: ${testEmail}`);
  const { error } = await supabaseAdmin
    .from("users")
    .insert({
      email: testEmail,
      google_id: `g2_${Date.now()}`,
      name: "User 2",
      role: "USER",
      status: "ACTIVE",
      provider: "GOOGLE"
    });

  if (error) {
    console.log("Error message:", error.message);
  } else {
    console.log("No error! (This shouldn't happen if email is unique)");
  }
}

testDuplicate();
