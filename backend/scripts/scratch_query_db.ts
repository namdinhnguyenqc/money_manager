import "dotenv/config";
import { supabaseAdmin } from "../src/lib/supabase.js";

async function main() {
  console.log("Fetching roles...");
  const { data: roles, error: rolesErr } = await supabaseAdmin.from("roles").select("*");
  console.log("Roles:", rolesErr ? rolesErr.message : roles);

  console.log("\nFetching permissions count...");
  const { data: permissions, error: permErr } = await supabaseAdmin.from("permissions").select("*").limit(10);
  console.log("Sample Permissions:", permErr ? permErr.message : permissions);

  console.log("\nFetching role_permissions count...");
  const { count, error: countErr } = await supabaseAdmin.from("role_permissions").select("*", { count: "exact", head: true });
  console.log("Role permissions count:", countErr ? countErr.message : count);

  console.log("\nFetching recent users...");
  const { data: users, error: usersErr } = await supabaseAdmin.from("users").select("id, email, name, role, admin_note, user_type").limit(10);
  console.log("Users:", usersErr ? usersErr.message : users);
}

main().catch(console.error);
