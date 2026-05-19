import test from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:8787';
let adminToken = '';
let ownerToken = '';
let userToken = '';
let testUserId = '';

test('Hono API Test Suite', async (t) => {
  
  await t.test('GET /health - Should return ok:true', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.ok, true);
  });

  await t.test('POST /auth/admin-login - Should login as admin', async () => {
    const res = await fetch(`${BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.accessToken);
    adminToken = data.accessToken;
  });

  await t.test('POST /auth/login (Owner) - Should login as owner', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'owner123456' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.accessToken);
    ownerToken = data.accessToken;
  });

  await t.test('POST /auth/google - Should mock login as user', async () => {
    const res = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'mock-id-token' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.accessToken);
    userToken = data.accessToken;
    testUserId = data.user.id;
  });

  await t.test('GET /public/boarding-houses - Should return public listings', async () => {
    const res = await fetch(`${BASE_URL}/public/boarding-houses`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.data));
  });

  await t.test('POST /public/leads - Should submit a lead', async () => {
    const res = await fetch(`${BASE_URL}/public/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        boardingHouseId: 'mock-bh-1',
        guestName: 'Test Guest',
        guestPhone: '0123456789',
        guestEmail: 'guest@example.com',
        message: 'Interested in a room'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.data.id);
  });

  await t.test('GET /admin/users - Should return user list (Admin only)', async () => {
    const res = await fetch(`${BASE_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.data));
  });

  await t.test('GET /owner/boarding-houses - Should return owner listings', async () => {
    const res = await fetch(`${BASE_URL}/owner/boarding-houses`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.data));
  });

});
