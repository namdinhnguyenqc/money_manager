import test from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';
let adminToken = '';
let adminRefreshToken = '';
let userToken = '';
let testUserId = '';

test('API Test Suite', async (t) => {
  
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
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.accessToken);
    adminToken = data.accessToken;
  });

  await t.test('POST /auth/google - Should mock login and return tokens', async () => {
    const res = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'mock-id-token' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.accessToken);
    assert.ok(data.refreshToken);
    userToken = data.accessToken;
    testUserId = data.user.id;
  });

  await t.test('GET /me - Should return user profile', async () => {
    const res = await fetch(`${BASE_URL}/me`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.id, testUserId);
  });

  await t.test('GET /admin/users - Should return user list (Admin only)', async () => {
    const res = await fetch(`${BASE_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.data));
  });

  await t.test('GET /admin/users/:id - Should return specific user details', async () => {
    const res = await fetch(`${BASE_URL}/admin/users/${testUserId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.id, testUserId);
  });

  await t.test('PATCH /admin/users/:id/status - Should update user status', async () => {
    const res = await fetch(`${BASE_URL}/admin/users/${testUserId}/status`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'BLOCKED' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.status, 'BLOCKED');
  });

  await t.test('PATCH /admin/users/:id/role - Should update user role', async () => {
    const res = await fetch(`${BASE_URL}/admin/users/${testUserId}/role`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'ADMIN' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.role, 'ADMIN');
  });

  await t.test('DELETE /admin/users/:id - Should soft delete user', async () => {
    const res = await fetch(`${BASE_URL}/admin/users/${testUserId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  });

  await t.test('POST /auth/logout - Should logout successfully', async () => {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken: 'dummy-refresh-token' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  });

});
