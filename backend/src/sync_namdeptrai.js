import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase config is missing.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const userId = 'da0ca3d3-ef64-44f7-a93d-1a81a9c4612c';
  const targetTenantId = '92088080-bcdf-40e8-b328-d43a751ce3f2'; // namdeptrai (the one with 4 invoices)
  const sourceTenantId = '1fb17f90-eae3-4c41-baa9-685aa6a98dbf'; // Khach 1 (has registered password)

  // 1. Get the registered password hash from Khach 1
  const { data: sourceTenant, error: getErr } = await supabase
    .from('tenants')
    .select('password_hash')
    .eq('id', sourceTenantId)
    .single();

  if (getErr || !sourceTenant?.password_hash) {
    console.error("Could not fetch source password hash:", getErr);
    process.exit(1);
  }

  const passwordHash = sourceTenant.password_hash;
  console.log(`Source password hash retrieved.`);

  // 2. Update namdeptrai's password hash and invite status
  const { data: updatedTenant, error: updateTenantErr } = await supabase
    .from('tenants')
    .update({
      password_hash: passwordHash,
      invite_status: 'accepted'
    })
    .eq('id', targetTenantId)
    .select();

  if (updateTenantErr) {
    console.error("Error updating namdeptrai tenant:", updateTenantErr);
    process.exit(1);
  }

  console.log(`Updated namdeptrai password and invite status:`, updatedTenant);

  // 3. Delete old link in tenant_accounts
  console.log(`Deleting old links in tenant_accounts for user_id = ${userId}`);
  const { error: deleteError } = await supabase
    .from('tenant_accounts')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting old link:', deleteError);
    process.exit(1);
  }

  // 4. Insert new correct link pointing to namdeptrai
  console.log(`Inserting new link pointing to namdeptrai (tenant_id = ${targetTenantId})`);
  const { data: newLink, error: insertError } = await supabase
    .from('tenant_accounts')
    .insert({
      user_id: userId,
      tenant_id: targetTenantId,
      status: 'active'
    })
    .select();

  if (insertError) {
    console.error('Error inserting new link:', insertError);
  } else {
    console.log('Successfully re-linked account to namdeptrai:', newLink);
  }
}

run().catch(console.error);
