import { supabaseAdmin } from "./src/lib/supabase.js";

async function verifySchemaDetail() {
  console.log("Verifying detailed schema for 'users' table...");
  
  // Try to insert a dummy user to verify columns
  const dummyId = "00000000-0000-0000-0000-000000000000";
  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert({
      id: dummyId,
      email: "test-verification@example.com",
      name: "Verification Test",
      role: "ADMIN",
      status: "ACTIVE",
      provider: "GOOGLE"
    })
    .select();

  if (error) {
    console.error("❌ Failed to upsert dummy user:", error.message);
    if (error.message.includes("column")) {
      console.error("Possible missing column in DB!");
    }
  } else {
    console.log("✅ Successfully upserted dummy user. Columns are correct.");
    console.log("Returned data:", data);

    // Clean up
    await supabaseAdmin.from("users").delete().eq("id", dummyId);
    console.log("✅ Cleaned up dummy user.");
  }

  // Check boarding_houses columns
  console.log("\nVerifying 'boarding_houses' table...");
  const { error: bhError } = await supabaseAdmin
    .from("boarding_houses")
    .insert({
      owner_id: dummyId, // This might fail due to FK if dummy user is deleted too fast, but we just want to see if columns match
      name: "Test BH",
      address: "123 Test St",
      status: "ACTIVE"
    })
    .select();

  if (bhError) {
    if (bhError.message.includes("column")) {
      console.error("❌ Failed due to missing column:", bhError.message);
    } else if (bhError.message.includes("foreign key")) {
      console.log("✅ Table exists and columns seem correct (failed on FK as expected).");
    } else {
      console.error("❌ Unexpected error:", bhError.message);
    }
  } else {
    console.log("✅ Successfully inserted into boarding_houses.");
  }
}

verifySchemaDetail();
