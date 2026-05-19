import { supabaseAdmin } from "./lib/supabase.js";

async function diagnose() {
  const email = `diag_${Date.now()}@example.com`;
  console.log(`Diagnosing user creation for: ${email}`);
  
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      email,
      google_id: `g_${Date.now()}`,
      name: "Diag User",
      role: "USER",
      status: "ACTIVE",
      provider: "GOOGLE",
      is_profile_completed: false,
      onboarding_step: "COMPLETE_PROFILE"
    })
    .select()
    .single();

  if (error) {
    console.error("CREATE_ERROR_RAW:", JSON.stringify(error, null, 2));
  } else {
    console.log("CREATE_SUCCESS:", data.id);
    await supabaseAdmin.from("users").delete().eq("id", data.id);
  }
}

diagnose();
