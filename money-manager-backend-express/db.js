import { Pool } from 'pg';

let pool = null;
let dbAvailable = false;

// Simple in-memory fallback for environments without DB
const memoryUsers = new Map();

export async function initDB(connectionString) {
  if (connectionString) {
    pool = new Pool({ connectionString, max: 8 });
    try {
      await pool.query('SELECT 1');
      dbAvailable = true;
      console.log('[db] Connected to Postgres');
    } catch (e) {
      console.error('[db] Unable to connect to Postgres', e);
      pool = null;
      dbAvailable = false;
    }
  } else {
    dbAvailable = false;
  }
  // Seed initial admin users into memory as a fallback if DB not used
  if (!dbAvailable && memoryUsers.size === 0) {
    memoryUsers.set('u-admin-1', { id: 'u-admin-1', google_id: 'admin-google-id', email: 'admin@example.com', name: 'Admin One', avatar: null, role: 'ADMIN', status: 'ACTIVE', provider: 'GOOGLE' });
    memoryUsers.set('u-super-1', { id: 'u-super-1', google_id: 'super-google-id', email: 'super@example.com', name: 'Super Admin', avatar: null, role: 'SUPER_ADMIN', status: 'ACTIVE', provider: 'GOOGLE' });
  }
  return dbAvailable;
}

export async function getUserByGoogleId(googleId) {
  if (dbAvailable && pool) {
    const res = await pool.query('SELECT id, google_id AS google_id, email, name, avatar, role, status FROM users WHERE google_id = $1', [googleId]);
    return res.rows[0] || null;
  }
  for (const u of memoryUsers.values()) {
    if (u.google_id === googleId) return u;
  }
  return null;
}

export async function upsertUser(user) {
  const now = new Date().toISOString();
  if (dbAvailable && pool) {
    const { google_id, email, name, avatar, role, status, provider } = user;
    const res = await pool.query(
      `INSERT INTO users (google_id, email, name, avatar, role, status, provider, last_login_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW(), NOW(), NOW())
       ON CONFLICT (google_id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, avatar = EXCLUDED.avatar, last_login_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [google_id, email, name, avatar, role, status, provider]
    );
    return res.rows[0];
  } else {
    // Memory path
    const id = user.id || `mem-${Date.now()}`;
    const existing = Array.from(memoryUsers.values()).find(u => u.google_id === user.google_id);
    if (!existing) {
      const newU = {
        id,
        google_id: user.google_id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        provider: user.provider,
        last_login_at: now
      };
      memoryUsers.set(id, newU);
      return newU;
    } else {
      existing.email = user.email;
      existing.name = user.name;
      existing.avatar = user.avatar;
      existing.role = user.role;
      existing.status = user.status;
      existing.last_login_at = now;
      memoryUsers.set(existing.id, existing);
      return existing;
    }
  }
}

export async function getAllUsers({ page = 1, limit = 20 } = {}) {
  if (dbAvailable && pool) {
    const off = (page - 1) * limit;
    const res = await pool.query('SELECT id, email, name, avatar, role, status, provider, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, off]);
    return res.rows;
  }
  const arr = Array.from(memoryUsers.values());
  return arr.slice((page - 1) * limit, (page - 1) * limit + limit);
}

export async function getUserById(id) {
  if (dbAvailable && pool) {
    const res = await pool.query('SELECT id, email, name, avatar, role, status, provider, created_at FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return memoryUsers.get(id) || null;
}

export async function updateUserStatus(id, status) {
  if (dbAvailable && pool) {
    const res = await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id]);
    return res.rows[0] || null;
  }
  const u = memoryUsers.get(id);
  if (!u) return null;
  u.status = status;
  memoryUsers.set(id, u);
  return u;
}

export async function updateUserRole(id, role) {
  if (dbAvailable && pool) {
    const res = await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [role, id]);
    return res.rows[0] || null;
  }
  const u = memoryUsers.get(id);
  if (!u) return null;
  u.role = role;
  memoryUsers.set(id, u);
  return u;
}

export async function softDeleteUser(id) {
  return updateUserStatus(id, 'DELETED');
}
