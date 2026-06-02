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
  const correctTenantId = '1fb17f90-eae3-4c41-baa9-685aa6a98dbf'; // Khach 1

  console.log(`Re-linking: Deleting old link for user_id = ${userId}`);
  
  const { error: deleteError } = await supabase
    .from('tenant_accounts')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting old link:', deleteError);
    process.exit(1);
  }

  console.log(`Inserting new link: user_id = ${userId}, tenant_id = ${correctTenantId}`);
  
  const { data, error: insertError } = await supabase
    .from('tenant_accounts')
    .insert({
      user_id: userId,
      tenant_id: correctTenantId,
      status: 'active'
    })
    .select();

  if (insertError) {
    console.error('Error inserting new link:', insertError);
  } else {
    console.log('Successfully re-linked account:', data);
  }
}

run().catch(console.error);
