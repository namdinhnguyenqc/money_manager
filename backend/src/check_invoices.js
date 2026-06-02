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
  console.log("Checking all invoices in DB...");

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, month, year, room_fee, total_amount, contract_id, status');

  if (error) {
    console.error('Error fetching invoices:', error);
    process.exit(1);
  }

  console.log(`\nFound ${invoices.length} invoices:`);
  console.log(invoices);

  // Check contracts
  for (const inv of invoices) {
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, tenant_id, status, tenants(name, phone)')
      .eq('id', inv.contract_id)
      .maybeSingle();
    
    console.log(`\nInvoice ID: ${inv.id}`);
    console.log(`Linked Contract:`, contract);
  }
}

run().catch(console.error);
