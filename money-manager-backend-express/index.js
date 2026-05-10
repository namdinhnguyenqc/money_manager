import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { 
  initDB, 
  getUserByGoogleId, 
  upsertUser, 
  getAllUsers, 
  getUserById, 
  updateUserStatus, 
  updateUserRole, 
  softDeleteUser,
  dbAvailable,
  memoryUsers 
} from './db.js';
import { isCloudModeEnabled, canaryForUser } from './featureFlags.js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

let dbReady = false;

// Initialize DB
(async () => {
  try {
    dbReady = await initDB(process.env.DATABASE_URL || null);
  } catch (e) {
    console.error('DB Init Error:', e);
    dbReady = false;
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

async function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    
    let user = null;
    if (dbReady || dbAvailable) {
      user = await getUserById(payload.sub);
    } else {
      user = memoryUsers.get(payload.sub);
    }

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

    let user = null;
    let isNew = false;

    // Hybrid: use DB path only for canary cloud mode
    if ((dbReady || dbAvailable) && isCloudModeEnabled() && canaryForUser(googleId)) {
      try {
        user = await getUserByGoogleId(googleId);
        if (!user) {
          user = await upsertUser({ google_id: googleId, email, name, avatar, role: 'USER', status: 'ACTIVE', provider: 'GOOGLE' });
          isNew = true;
        } else {
          user = await upsertUser({ google_id: googleId, email, name, avatar, role: user.role, status: user.status, provider: user.provider });
        }
      } catch (e) {
        console.error('DB auth error:', e);
      }
    }

    if (!user) {
      // Memory path
      user = await getUserByGoogleId(googleId);
      if (!user) {
        const id = crypto.randomUUID();
        user = await upsertUser({ id, google_id: googleId, email, name, avatar, role: 'USER', status: 'ACTIVE', provider: 'GOOGLE' });
        isNew = true;
      }
    }

    const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(48).toString('hex');
    refreshStore.set(hashToken(refreshToken), { userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, revoked: false });

    res.json({ 
      accessToken, 
      refreshToken, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        avatar: user.avatar || avatar, 
        role: user.role, 
        status: user.status, 
        isNew 
      } 
    });
  } catch (e) {
    console.error('Auth Google Error:', e);
    res.status(500).json({ error: 'Backend error' });
  }
});

app.post('/auth/admin-login', async (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Find or create admin user in memory/DB
    let user = await getUserByGoogleId('admin-google-id');
    if (!user) {
      user = await upsertUser({ 
        id: 'u-admin-1', 
        google_id: 'admin-google-id', 
        email: 'admin@example.com', 
        name: 'Admin One', 
        role: 'ADMIN', 
        status: 'ACTIVE', 
        provider: 'GOOGLE' 
      });
    }
    
    const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ accessToken, user });
  }
  res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
});

app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  const hash = hashToken(refreshToken);
  const rec = refreshStore.get(hash);
  if (!rec || rec.revoked) return res.status(401).json({ code: 'REFRESH_TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn.' });
  if (Date.now() > rec.expiresAt) return res.status(401).json({ code: 'REFRESH_TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn.' });
  
  // Use memory lookup for speed on refresh, or DB if preferred
  const user = memoryUsers.get(rec.userId);
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

app.get(['/me', '/auth/me'], authMiddleware, async (req, res) => {
  const user = req.userObj;
  res.json({ 
    id: user.id, 
    email: user.email, 
    name: user.name, 
    avatar: user.avatar, 
    role: user.role, 
    status: user.status 
  });
});

// Admin endpoints
const adminAuth = (req, res, next) => {
  const user = req.user;
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

app.get('/admin/users', authMiddleware, adminAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  
  let all = [];
  if (dbReady || dbAvailable) {
    all = await getAllUsers({ page, limit });
  } else {
    all = Array.from(memoryUsers.values()).slice((page - 1) * limit, (page - 1) * limit + limit);
  }
  
  const data = Array.isArray(all) ? all.map(u => ({ 
    id: u.id, 
    email: u.email, 
    name: u.name, 
    avatar: u.avatar, 
    role: u.role, 
    status: u.status, 
    provider: u.provider, 
    created_at: u.created_at 
  })) : [];
  
  res.json({ data, pagination: { page, limit, total: Array.isArray(all) ? all.length : 0 } });
});

app.get('/admin/users/:id', authMiddleware, adminAuth, async (req, res) => {
  const id = req.params.id;
  let u = null;
  if (dbReady || dbAvailable) {
    u = await getUserById(id);
  } else {
    u = memoryUsers.get(id);
  }
  
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ 
    id: u.id, 
    email: u.email, 
    name: u.name, 
    avatar: u.avatar, 
    role: u.role, 
    status: u.status, 
    provider: u.provider, 
    created_at: u.created_at 
  });
});

app.patch('/admin/users/:id/status', authMiddleware, adminAuth, async (req, res) => {
  const id = req.params.id;
  const status = req.body?.status;
  
  if (req.user?.sub === id) {
    return res.status(400).json({ code: 'CANNOT_BLOCK_SELF', message: 'Không thể tự khóa tài khoản của mình.' });
  }
  
  if (!['ACTIVE', 'BLOCKED', 'DELETED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  
  const updated = await updateUserStatus(id, status);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  
  res.json({ success: true, user: { id, status } });
});

app.patch('/admin/users/:id/role', authMiddleware, adminAuth, async (req, res) => {
  const id = req.params.id;
  const role = req.body?.role;
  
  if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  
  let target = null;
  if (dbReady || dbAvailable) {
    target = await getUserById(id);
  } else {
    target = memoryUsers.get(id);
  }
  
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'SUPER_ADMIN') {
    return res.status(403).json({ code: 'INSUFFICIENT_PERMISSION', message: 'Không thể thay đổi role của SUPER_ADMIN.' });
  }
  
  const updated = await updateUserRole(id, role);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  
  res.json({ success: true, user: { id, role } });
});

app.delete('/admin/users/:id', authMiddleware, adminAuth, async (req, res) => {
  const id = req.params.id;
  
  if (req.user?.sub === id) {
    return res.status(400).json({ code: 'CANNOT_DELETE_SELF', message: 'Không thể xóa tài khoản của mình.' });
  }
  
  const updated = await softDeleteUser(id);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Money Manager Express backend listening at http://localhost:${PORT}`);
});
