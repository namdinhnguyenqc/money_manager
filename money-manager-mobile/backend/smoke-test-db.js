import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runSmokeTest() {
  console.log("Starting Smoke Test on Real DB...");
  const fakeUserId = "00000000-0000-0000-0000-000000000000"; // Assuming UUID for users
  
  // 0. Mock user creation (Supabase requires FK reference for owner_id)
  // Let's create a temporary user in public.users to satisfy FK constraints.
  await supabaseAdmin.from('users').upsert({ id: fakeUserId, email: 'smoke@test.com' });

  // 1. Insert Boarding House
  console.log("\n[1] Creating Boarding House...");
  const { data: bh, error: bhError } = await supabaseAdmin
    .from('boarding_houses')
    .insert({ owner_id: fakeUserId, name: "Test House UUID" })
    .select()
    .single();
  if (bhError) { console.error("X Error creating Boarding House:", bhError); return; }
  console.log("✓ Boarding House created:", bh.id);

  // 2. Insert Room
  console.log("\n[2] Creating Room...");
  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .insert({ user_id: fakeUserId, boarding_house_id: bh.id, name: "Test Room 101", price: 1500000 })
    .select()
    .single();
  if (roomError) { console.error("X Error creating Room:", roomError); return; }
  console.log("✓ Room created:", room.id);

  // 3. Update Room
  console.log("\n[3] Updating Room...");
  const { data: updatedRoom, error: updateError } = await supabaseAdmin
    .from('rooms')
    .update({ price: 2000000 })
    .eq('id', room.id)
    .select()
    .single();
  if (updateError) { console.error("X Error updating Room:", updateError); return; }
  console.log("✓ Room updated price:", updatedRoom.price);

  // 4. Delete Room
  console.log("\n[4] Deleting Room...");
  const { error: delRoomError } = await supabaseAdmin
    .from('rooms')
    .delete()
    .eq('id', room.id);
  if (delRoomError) { console.error("X Error deleting Room:", delRoomError); return; }
  console.log("✓ Room deleted");

  // 5. Delete Boarding House
  console.log("\n[5] Deleting Boarding House...");
  const { error: delBhError } = await supabaseAdmin
    .from('boarding_houses')
    .delete()
    .eq('id', bh.id);
  if (delBhError) { console.error("X Error deleting Boarding House:", delBhError); return; }
  console.log("✓ Boarding House deleted");

  // Cleanup fake user
  await supabaseAdmin.from('users').delete().eq('id', fakeUserId);

  console.log("\n✨ Smoke Test Completed Successfully! All IDs handled as UUIDs.");
}

runSmokeTest();
