
// Using global fetch
import assert from 'node:assert';

const BASE_URL = 'http://localhost:8787';
let ownerToken = '';

async function runTests() {
  console.log('🚀 Starting Phase 1 Verification Tests...');

  // 1. Login as Owner
  console.log('--- Logging in as Owner ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com', password: 'owner123456' })
  });
  const loginData = await loginRes.json();
  ownerToken = loginData.accessToken;
  console.log('✅ Login successful');

  // 2. Create a Service with Phase 1 fields
  console.log('\n--- Testing Service Creation (Phase 1) ---');
  const serviceRes = await fetch(`${BASE_URL}/rental/services`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      name: 'Điện Test',
      calculationType: 'meter',
      serviceType: 'electricity',
      unitPrice: 3500,
      unit: 'kWh'
    })
  });
  const serviceData = await serviceRes.json();
  if (serviceRes.status !== 201) {
    console.error('❌ Service creation failed:', serviceData);
  }
  assert.strictEqual(serviceRes.status, 201);
  assert.strictEqual(serviceData.data.calculation_type, 'meter');
  assert.strictEqual(serviceData.data.service_type, 'electricity');
  console.log('✅ Service created with Phase 1 fields');

  // 3. Create a Tenant
  console.log('\n--- Creating a Tenant ---');
  const tenantRes = await fetch(`${BASE_URL}/rental/tenants`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      name: 'John Doe',
      phone: '0987654321',
      idCard: '123456789012'
    })
  });
  const tenantData = await tenantRes.json();
  const tenantId = tenantData.data.id;
  console.log(`✅ Tenant created: ID ${tenantId}`);

  // 4. Create a Contract with Phase 1 fields
  console.log('\n--- Testing Contract Creation (Phase 1) ---');
  // Need a room first
  const roomsRes = await fetch(`${BASE_URL}/rental/rooms`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  const roomsData = await roomsRes.json();
  const room = roomsData.data.find(r => r.status === 'vacant') || roomsData.data[0];
  
  const contractRes = await fetch(`${BASE_URL}/rental/contracts`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      roomId: room.id,
      tenantId: tenantId,
      startDate: '2024-05-01',
      deposit: 2000000,
      initialElectricReading: 150.5,
      initialWaterReading: 20.0,
      serviceIds: [serviceData.data.id]
    })
  });
  const contractData = await contractRes.json();
  assert.strictEqual(contractRes.status, 201);
  
  // Fetch the contract to verify fields (or check mock rooms if in mock mode)
  const activeContractsRes = await fetch(`${BASE_URL}/rental/contracts/active`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  const activeContractsData = await activeContractsRes.json();
  const contract = activeContractsData.data.find(c => c.id === contractData.data.id);
  
  assert.strictEqual(Number(contract.initial_electric_reading), 150.5);
  assert.ok(contract.applied_services_snapshot);
  const serviceSnapshot = contract.applied_services_snapshot.find(s => s.service_id === serviceData.data.id);
  assert.strictEqual(serviceSnapshot.calculation_type, 'meter');
  assert.strictEqual(serviceSnapshot.service_type, 'electricity');
  console.log('✅ Contract created with initial readings and detailed snapshots');

  // 5. Create an Invoice with Phase 1 fields
  console.log('\n--- Testing Invoice Creation (Phase 1) ---');
  const invoiceRes = await fetch(`${BASE_URL}/invoices`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      roomId: room.id,
      contractId: contract.id,
      month: 5,
      year: 2024,
      roomFee: 3000000,
      items: [
        {
          serviceId: serviceData.data.id,
          name: 'Điện Test',
          amount: 3500 * 10,
          calculationType: 'meter',
          unitPrice: 3500,
          quantity: 10,
          startReading: 150.5,
          endReading: 160.5,
          usageValue: 10,
          unit: 'kWh'
        }
      ]
    })
  });
  const invoiceData = await invoiceRes.json();
  assert.strictEqual(invoiceRes.status, 201);
  
  // Fetch detailed invoice
  const invDetailRes = await fetch(`${BASE_URL}/invoices/${invoiceData.data.id}`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  const invDetailData = await invDetailRes.json();
  const invItem = invDetailData.data.items[0];
  assert.strictEqual(invItem.calculation_type, 'meter');
  assert.strictEqual(Number(invItem.start_reading), 150.5);
  assert.strictEqual(Number(invItem.end_reading), 160.5);
  console.log('✅ Invoice created with detailed item snapshots');

  console.log('\n✨ ALL PHASE 1 VERIFICATION TESTS PASSED! ✨');
}

runTests().catch(err => {
  console.error('\n❌ Verification failed:');
  console.error(err);
  process.exit(1);
});
