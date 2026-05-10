import { supabaseAdmin } from "./lib/supabase.js";

async function checkDetailedSchema() {
  console.log("Checking detailed schema for 'users' table...");
  
  // We can't query information_schema easily via PostgREST, 
  // but we can try to guess common constraint names or trigger names.
  
  // Actually, let's try to trigger a 500 error on purpose and see what happens.
  const { error } = await supabaseAdmin.from("users").insert({
    email: null as any, // This should trigger a NOT NULL constraint
    google_id: null as any
  });
  
  if (error) {
    console.log("NULL_CONSTRAINT_ERROR:", JSON.stringify(error, null, 2));
  }
}

checkDetailedSchema();
