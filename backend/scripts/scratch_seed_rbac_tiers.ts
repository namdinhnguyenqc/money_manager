import "dotenv/config";
import { supabaseAdmin } from "../src/lib/supabase.js";

const BASIC_ID = "8a62d08a-2c8b-4b2a-8888-000000000001";
const PREMIUM_ID = "8a62d08a-2c8b-4b2a-8888-000000000002";

async function main() {
  console.log("Creating roles OWNER_BASIC and OWNER_PREMIUM...");

  const { error: r1Err } = await supabaseAdmin.from("roles").upsert({
    id: BASIC_ID,
    code: "owner_basic",
    name: "OWNER_BASIC",
    description: "Vai trò Chủ trọ Cơ bản - Chỉ sử dụng các tính năng cơ bản",
    is_system: true,
  }, { onConflict: "id" });
  if (r1Err) throw new Error("Failed basic role: " + r1Err.message);

  const { error: r2Err } = await supabaseAdmin.from("roles").upsert({
    id: PREMIUM_ID,
    code: "owner_premium",
    name: "OWNER_PREMIUM",
    description: "Vai trò Chủ trọ Cao cấp - Sử dụng toàn bộ tính năng bao gồm Kinh doanh",
    is_system: true,
  }, { onConflict: "id" });
  if (r2Err) throw new Error("Failed premium role: " + r2Err.message);

  console.log("Fetching all current permissions...");
  const { data: perms, error: permErr } = await supabaseAdmin.from("permissions").select("key");
  if (permErr) throw new Error("Failed fetching permissions: " + permErr.message);

  const permKeys = perms.map((p: any) => p.key);
  console.log(`Found ${permKeys.length} permissions in DB.`);

  // Upsert trading.view if it does not exist
  if (!permKeys.includes("trading.view")) {
    console.log("Inserting trading.view permission...");
    const { error: insErr } = await supabaseAdmin.from("permissions").insert({
      key: "trading.view",
      module: "trading",
      action: "view",
      description: "Xem và quản lý các giao dịch Kinh doanh",
    });
    if (insErr) throw new Error("Failed inserting trading.view permission: " + insErr.message);
    permKeys.push("trading.view");
  }

  // Clear existing permissions for basic & premium roles to prevent constraint conflicts
  await supabaseAdmin.from("role_permissions").delete().eq("role_id", BASIC_ID);
  await supabaseAdmin.from("role_permissions").delete().eq("role_id", PREMIUM_ID);

  console.log("Mapping permissions to roles...");
  // Basic: all permissions EXCEPT trading.view
  const basicPerms = permKeys.filter(k => k !== "trading.view");
  const basicRows = basicPerms.map(k => ({ role_id: BASIC_ID, permission_key: k }));
  const { error: bInsertErr } = await supabaseAdmin.from("role_permissions").insert(basicRows);
  if (bInsertErr) throw new Error("Failed seeding basic permissions: " + bInsertErr.message);

  // Premium: ALL permissions
  const premiumRows = permKeys.map(k => ({ role_id: PREMIUM_ID, permission_key: k }));
  const { error: pInsertErr } = await supabaseAdmin.from("role_permissions").insert(premiumRows);
  if (pInsertErr) throw new Error("Failed seeding premium permissions: " + pInsertErr.message);

  console.log("Successfully seeded role permissions.");

  // Map existing users to their corresponding roles based on admin_note
  console.log("Mapping existing owners to roles...");
  const { data: users, error: userErr } = await supabaseAdmin.from("users").select("id, role, admin_note");
  if (userErr) throw new Error("Failed fetching users: " + userErr.message);

  for (const user of users) {
    if (user.role === "OWNER") {
      const isPremium = user.admin_note?.includes("premium");
      const targetRoleId = isPremium ? PREMIUM_ID : BASIC_ID;
      
      console.log(`Setting user ${user.id} (${isPremium ? "Premium" : "Basic"}) to role_id ${targetRoleId}`);
      await supabaseAdmin.from("users").update({ role_id: targetRoleId }).eq("id", user.id);
    }
  }

  console.log("Completed seeding roles & mapping users.");
}

main().catch(console.error);
