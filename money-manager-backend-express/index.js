import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { initDB, getUserByGoogleId, upsertUser, getAllUsers, getUserById, updateUserStatus, updateUserRole, softDeleteUser } from './db.js';
import { isCloudModeEnabled, canaryForUser } from './featureFlags.js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

let users = new Map(); // legacy memory fallback if DB not available
let dbReady = false;
// Initialize DB (attempt connection if DATABASE_URL env var is provided)
(async () => {
  try {
    const { default: dotenvDefault } = await import('dotenv');
    // no-op: dotenv already initialized at top
  } catch {}
  try {
    // @ts-ignore
    const { initDB } = await import('./db.js');
    dbReady = await initDB(process.env.DATABASE_URL || null);
  } catch {
    dbReady = false;
  }
  // Seed memory admins if DB not ready
  if (!dbReady) {
    if (!users.has('u-admin-1')) {
      users.set('u-admin-1', { id: 'u-admin-1', google_id: 'admin-google-id', email: 'admin@example.com', name: 'Admin One', avatar: null, role: 'ADMIN', status: 'ACTIVE', provider: 'GOOGLE' });
    }
    if (!users.has('u-super-1')) {
      users.set('u-super-1', { id: 'u-super-1', google_id: 'super-google-id', email: 'super@example.com', name: 'Super Admin', avatar: null, role: 'SUPER_ADMIN', status: 'ACTIVE', provider: 'GOOGLE' });
    }
  }
})();
const refreshStore = new Map(); // hash -> { userId, expiresAt, revoked }

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
  // Mock mode
  return { sub: 'mock-user', email: 'mock@example.com', name: 'Mock User', picture: null };
  }
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  return ticket.getPayload();
}

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    const user = users.get(payload.sub);
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error: 'Unauthorized' });
    req.userObj = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ error: 'idToken required' });
    const payload = await verifyGoogleIdToken(idToken);
    const googleId = payload?.sub;
    const email = payload?.email;
    const name = payload?.name;
    const avatar = payload?.picture;

    // Try DB path first if available
  let user = null;
  let isNew = false;
  // Hybrid: use DB path only for canary cloud mode, otherwise fall back to memory path for safety
  if (dbReady && isCloudModeEnabled() && canaryForUser(googleId)) {
    try {
      user = await getUserByGoogleId(googleId);
      if (!user) {
        user = await upsertUser({ google_id: googleId, email, name, avatar, role: 'USER', status: 'ACTIVE', provider: 'GOOGLE' });
        isNew = true;
      } else {
        // Update profile details if changed
        user = await upsertUser({ google_id: googleId, email, name, avatar, role: user.role, status: user.status, provider: user.provider });
      }
    } catch {
      user = null;
    }
  }
  if (!user) {
      const id = crypto.randomUUID();
      user = { id, google_id: googleId, email, name, avatar, role: 'USER', status: 'ACTIVE', provider: 'GOOGLE' };
      users.set(id, user);
      isNew = true;
    }

    const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(48).toString('hex');
    refreshStore.set(hashToken(refreshToken), { userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, revoked: false });

    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, avatar, role: user.role, status: user.status, isNewUser } });
  } catch (e) {
    res.status(500).json({ error: 'Backend error' });
  }
});

app.post('/auth/refresh-token', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  const hash = hashToken(refreshToken);
  const rec = refreshStore.get(hash);
  if (!rec || rec.revoked) return res.status(401).json({ code: 'REFRESH_TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn.' });
  if (Date.now() > rec.expiresAt) return res.status(401).json({ code: 'REFRESH_TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn.' });
  const user = users.get(rec.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '15m' });
  res.json({ accessToken });
});

app.post('/auth/logout', authMiddleware, (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    const hash = hashToken(refreshToken);
    if (refreshStore.has(hash)) refreshStore.get(hash).revoked = true;
  }
  res.json({ success: true });
});


app.get('/me', authMiddleware, async (req, res) => {
  const payload = req.user;
  let user = req.userObj;
  if (dbReady) {
    const udb = await getUserById(payload.sub);
    if (udb) user = udb;
  }
  if (!user) {
    // Fallback to payload data
    user = { id: payload.sub, email: payload.email, name: payload.name, avatar: payload.avatar, role: payload.role, status: payload.status };
  }
  res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role, status: user.status });
});

// Admin endpoints
const adminAuth = (req, res, next) => {
  const user = req.user;
  if (!user || !['ADMIN','SUPER_ADMIN'].includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

app.get('/admin/users', authMiddleware, adminAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  let all = [];
  if (dbReady) {
    const list = await getAllUsers({ page, limit });
    all = list;
  } else {
    all = Array.from(users.values()).slice((page-1)*limit, (page-1)*limit + limit);
  }
  const start = (page - 1) * limit;
  const data = Array.isArray(all) ? all.map(u => ({ id: u.id, email: u.email, name: u.name, avatar: u.avatar, role: u.role, status: u.status, provider: u.provider, created_at: u.created_at })) : [];
  res.json({ data, pagination: { page, limit, total: Array.isArray(all) ? all.length : 0 } });
});

app.get('/admin/users/:id', authMiddleware, adminAuth, async (req, res) => {
  const id = req.params.id;
  if (dbReady) {
    const u = await getUserById(id);
    if (!u) return res.status(404).json({ error: 'User not found' });
    return res.json({ id: u.id, email: u.email, name: u.name, avatar: u.avatar, role: u.role, status: u.status, provider: u.provider, created_at: u.created_at });
  }
  const u = users.get(id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ id: u.id, email: u.email, name: u.name, avatar: u.avatar, role: u.role, status: u.status, provider: u.provider, created_at: u.created_at });
});

app.patch('/admin/users/:id/status', authMiddleware, adminAuth, async (req, res) => {
  const id = req.params.id;
  if (dbReady) {
    if (req.user?.sub === id || req.user?.id === id) {
      // can't block self
      return res.status(400).json({ code: 'CANNOT_BLOCK_SELF', message: 'Không thể tự khóa tài khoản của mình.' });
    }
    const status = req.body?.status;
    if (!['ACTIVE','BLOCKED','DELETED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const updated = await updateUserStatus(id, status);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true, user: { id, status } });
  }
  const target = users.get(id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (req.user?.id === id) {
    return res.status(400).json({ code: 'CANNOT_BLOCK_SELF', message: 'Không thể tự khóa tài khoản của mình.' });
  }
  const status = req.body?.status;
  if (!['ACTIVE','BLOCKED','DELETED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  target.status = status;
  users.set(id, target);
  res.json({ success: true, user: { id, status } });
});

app.patch('/admin/users/:id/role', authMiddleware, adminAuth, async (req, res) => {
  const id = req.params.id;
  if (dbReady) {
    const role = req.body?.role;
    if (!['USER','ADMIN','SUPER_ADMIN'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const updated = await updateUserRole(id, role);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true, user: { id, role } });
  }
  const target = users.get(id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'SUPER_ADMIN') {
    return res.status(403).json({ code: 'INSUFFICIENT_PERMISSION', message: 'Không thể thay đổi role của SUPER_ADMIN.' });
  }
  const role = req.body?.role;
  if (!['USER','ADMIN','SUPER_ADMIN'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  target.role = role;
  users.set(id, target);
  res.json({ success: true, user: { id, role } });
});

app.delete('/admin/users/:id', authMiddleware, adminAuth, async (req, res) => {
  const id = req.params.id;
  if (dbReady) {
    const updated = await softDeleteUser(id);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true });
  }
  const target = users.get(id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (req.user?.id === id) {
    return res.status(400).json({ code: 'CANNOT_DELETE_SELF', message: 'Không thể xóa tài khoản của mình.' });
  }
  target.status = 'DELETED';
  users.set(id, target);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Money Manager Express backend listening at http://localhost:${PORT}`);
});
