import { supabaseAdmin } from "./dist/lib/supabase.js";

async function checkUsers() {
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("*");
  
  if (error) {
    console.error("Error fetching users:", error.message);
  } else {
    console.log("Users in database:");
    console.log(JSON.stringify(users, null, 2));
  }
}

checkUsers();
