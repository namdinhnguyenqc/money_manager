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

const userId = 'da0ca3d3-ef64-44f7-a93d-1a81a9c4612c'; // namdeptrai
const tenantId = '92088080-bcdf-40e8-b328-d43a751ce3f2';
const invoiceId = '3993ae64-f5ff-4b9e-b3cb-72477f9b77e0'; // sample invoice detail

async function benchmarkOld() {
  const start = performance.now();

  // 1. Fetch tenant account
  const { data: tenantAccount } = await supabase
    .from("tenant_accounts")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tenantAccount) return 0;

  // 2. Fetch contracts
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id")
    .eq("tenant_id", tenantAccount.tenant_id);

  if (!contracts || contracts.length === 0) return 0;
  const contractIds = contracts.map((c) => c.id);

  // 3. Fetch invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      id, month, year, status, total_amount, paid_amount,
      room_fee, previous_debt,
      payment_code, payment_channel_id, due_date,
      elec_old, elec_new, water_old, water_new,
      created_at, updated_at, contract_id,
      rooms ( id, name, boarding_houses ( name, address ) ),
      invoice_items ( id, name, amount, quantity, unit_price )
    `)
    .in("contract_id", contractIds)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  const end = performance.now();
  return end - start;
}

async function benchmarkNew() {
  const start = performance.now();

  // 1. Fetch tenant account
  const { data: tenantAccount } = await supabase
    .from("tenant_accounts")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tenantAccount) return 0;

  // 2. Fetch invoices directly using inner join
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      id, month, year, status, total_amount, paid_amount,
      room_fee, previous_debt,
      payment_code, payment_channel_id, due_date,
      elec_old, elec_new, water_old, water_new,
      created_at, updated_at, contract_id,
      contracts!inner ( tenant_id ),
      rooms ( id, name, boarding_houses ( name, address ) ),
      invoice_items ( id, name, amount, quantity, unit_price )
    `)
    .eq("contracts.tenant_id", tenantAccount.tenant_id)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  const end = performance.now();
  return end - start;
}

async function benchmarkDetail() {
  const start = performance.now();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, rooms(*, boarding_houses(*)), contracts(*, tenants(*))")
    .eq("id", invoiceId)
    .single();

  const end = performance.now();
  return end - start;
}

async function run() {
  console.log("Starting DB benchmarks against live Supabase production cloud...\n");

  const iterations = 15;
  let oldTotal = 0;
  let newTotal = 0;
  let detailTotal = 0;

  // Warmup
  await benchmarkOld();
  await benchmarkNew();
  await benchmarkDetail();

  console.log(`Running ${iterations} iterations to get stable averages...\n`);

  for (let i = 0; i < iterations; i++) {
    const oldTime = await benchmarkOld();
    const newTime = await benchmarkNew();
    const detailTime = await benchmarkDetail();
    
    oldTotal += oldTime;
    newTotal += newTime;
    detailTotal += detailTime;
    
    console.log(`Iteration ${i + 1}: Old List Query = ${oldTime.toFixed(1)}ms | New List Query = ${newTime.toFixed(1)}ms | Detail Query = ${detailTime.toFixed(1)}ms`);
  }

  const oldAvg = oldTotal / iterations;
  const newAvg = newTotal / iterations;
  const detailAvg = detailTotal / iterations;

  console.log("\n=================== BENCHMARK RESULTS ===================");
  console.log(`1. INVOICES HISTORY LIST FEED (GET /tenant/invoices):`);
  console.log(`   - BEFORE optimization (Sequential Queries): ${oldAvg.toFixed(1)} ms`);
  console.log(`   - AFTER optimization (Consolidated Inner Join): ${newAvg.toFixed(1)} ms`);
  console.log(`   - PERFORMANCE GAIN: ${((oldAvg - newAvg) / oldAvg * 100).toFixed(1)}% faster!`);
  console.log(`   - Net time saved per load: ${(oldAvg - newAvg).toFixed(1)} ms`);
  console.log(`\n2. INVOICE DETAIL VIEW (GET /tenant/invoices/:id):`);
  console.log(`   - Average response time: ${detailAvg.toFixed(1)} ms`);
  console.log("=========================================================");
}

run().catch(console.error);
