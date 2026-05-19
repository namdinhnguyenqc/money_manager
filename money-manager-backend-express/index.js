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
const memoryWallets = new Map();
const memoryCategories = new Map();
const memoryTransactions = new Map();
const memoryRooms = new Map();
const memoryRentalServices = new Map();
const memoryBankConfigs = new Map();
const memoryTradingItems = new Map();

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

app.post(['/auth/google', '/auth/owner-google'], async (req, res) => {
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

const nowIso = () => new Date().toISOString();
const createId = () => crypto.randomUUID();

const getOwnedRows = (store, userId) =>
  Array.from(store.values()).filter((row) => row.user_id === userId);

app.get('/wallets', authMiddleware, (req, res) => {
  const activeOnly = req.query.activeOnly !== '0';
  const rows = getOwnedRows(memoryWallets, req.user.sub)
    .filter((wallet) => !activeOnly || wallet.active !== false)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  res.json({ data: rows, count: rows.length });
});

app.post('/wallets', authMiddleware, (req, res) => {
  const wallet = {
    id: createId(),
    user_id: req.user.sub,
    name: req.body?.name || 'Wallet',
    type: req.body?.type || 'personal',
    active: req.body?.active !== false,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  memoryWallets.set(wallet.id, wallet);
  res.status(201).json({ data: wallet });
});

app.patch('/wallets/:id', authMiddleware, (req, res) => {
  const wallet = memoryWallets.get(req.params.id);
  if (!wallet || wallet.user_id !== req.user.sub) return res.status(404).json({ error: 'Wallet not found' });
  const updated = {
    ...wallet,
    ...(req.body?.name !== undefined ? { name: req.body.name } : {}),
    ...(req.body?.type !== undefined ? { type: req.body.type } : {}),
    ...(req.body?.active !== undefined ? { active: Boolean(req.body.active) } : {}),
    updated_at: nowIso(),
  };
  memoryWallets.set(updated.id, updated);
  res.json({ data: updated });
});

app.get('/wallets/:id/stats', authMiddleware, (req, res) => {
  const wallet = memoryWallets.get(req.params.id);
  if (!wallet || wallet.user_id !== req.user.sub) return res.status(404).json({ error: 'Wallet not found' });
  const rows = getOwnedRows(memoryTransactions, req.user.sub).filter((tx) => tx.wallet_id === req.params.id);
  const income = rows.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const expense = rows.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  res.json({ data: { income, expense, balance: income - expense } });
});

app.get('/categories', authMiddleware, (req, res) => {
  const rows = getOwnedRows(memoryCategories, req.user.sub)
    .filter((category) => !req.query.type || category.type === req.query.type)
    .filter((category) => !req.query.walletId || category.wallet_id === req.query.walletId);
  res.json({ data: rows, count: rows.length });
});

app.post('/categories', authMiddleware, (req, res) => {
  const category = {
    id: createId(),
    user_id: req.user.sub,
    wallet_id: req.body?.walletId || req.body?.wallet_id || null,
    parent_id: req.body?.parentId || req.body?.parent_id || null,
    name: req.body?.name || 'Category',
    icon: req.body?.icon || null,
    color: req.body?.color || '#64748b',
    type: req.body?.type || 'expense',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  memoryCategories.set(category.id, category);
  res.status(201).json({ data: category });
});

app.patch('/categories/:id', authMiddleware, (req, res) => {
  const category = memoryCategories.get(req.params.id);
  if (!category || category.user_id !== req.user.sub) return res.status(404).json({ error: 'Category not found' });
  const updated = {
    ...category,
    ...(req.body?.name !== undefined ? { name: req.body.name } : {}),
    ...(req.body?.icon !== undefined ? { icon: req.body.icon } : {}),
    ...(req.body?.color !== undefined ? { color: req.body.color } : {}),
    ...(req.body?.parentId !== undefined ? { parent_id: req.body.parentId } : {}),
    updated_at: nowIso(),
  };
  memoryCategories.set(updated.id, updated);
  res.json({ data: updated });
});

app.delete('/categories/:id', authMiddleware, (req, res) => {
  const category = memoryCategories.get(req.params.id);
  if (!category || category.user_id !== req.user.sub) return res.status(404).json({ error: 'Category not found' });
  memoryCategories.delete(req.params.id);
  res.json({ success: true });
});

app.get('/transactions', authMiddleware, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  const all = getOwnedRows(memoryTransactions, req.user.sub)
    .filter((tx) => !req.query.walletId || tx.wallet_id === req.query.walletId)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  res.json({ data: all.slice(offset, offset + limit), count: all.length });
});

app.post('/transactions', authMiddleware, (req, res) => {
  const tx = {
    id: createId(),
    user_id: req.user.sub,
    wallet_id: req.body?.walletId || req.body?.wallet_id || null,
    category_id: req.body?.categoryId || req.body?.category_id || null,
    type: req.body?.type || 'expense',
    amount: Number(req.body?.amount || 0),
    description: req.body?.description || '',
    image_uri: req.body?.imageUri || req.body?.image_uri || null,
    date: req.body?.date || nowIso(),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  memoryTransactions.set(tx.id, tx);
  res.status(201).json({ data: tx });
});

app.patch('/transactions/:id', authMiddleware, (req, res) => {
  const tx = memoryTransactions.get(req.params.id);
  if (!tx || tx.user_id !== req.user.sub) return res.status(404).json({ error: 'Transaction not found' });
  const updated = {
    ...tx,
    ...(req.body?.walletId !== undefined ? { wallet_id: req.body.walletId } : {}),
    ...(req.body?.categoryId !== undefined ? { category_id: req.body.categoryId } : {}),
    ...(req.body?.type !== undefined ? { type: req.body.type } : {}),
    ...(req.body?.amount !== undefined ? { amount: Number(req.body.amount || 0) } : {}),
    ...(req.body?.description !== undefined ? { description: req.body.description } : {}),
    ...(req.body?.imageUri !== undefined ? { image_uri: req.body.imageUri } : {}),
    ...(req.body?.date !== undefined ? { date: req.body.date } : {}),
    updated_at: nowIso(),
  };
  memoryTransactions.set(updated.id, updated);
  res.json({ data: updated });
});

app.delete('/transactions/:id', authMiddleware, (req, res) => {
  const tx = memoryTransactions.get(req.params.id);
  if (!tx || tx.user_id !== req.user.sub) return res.status(404).json({ error: 'Transaction not found' });
  memoryTransactions.delete(req.params.id);
  res.json({ success: true });
});

app.get('/rental/rooms', authMiddleware, (req, res) => {
  const rows = getOwnedRows(memoryRooms, req.user.sub);
  res.json({ data: rows, count: rows.length });
});

app.post('/rental/rooms', authMiddleware, (req, res) => {
  const room = {
    id: createId(),
    user_id: req.user.sub,
    wallet_id: req.body?.walletId || req.body?.wallet_id || null,
    name: req.body?.name || 'Room',
    price: Number(req.body?.price || 0),
    has_ac: Boolean(req.body?.hasAc || req.body?.has_ac),
    num_people: Number(req.body?.numPeople || req.body?.num_people || 1),
    status: 'vacant',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  memoryRooms.set(room.id, room);
  res.status(201).json({ data: room });
});

app.get('/rental/services', authMiddleware, (req, res) => {
  const activeOnly = req.query.activeOnly !== '0';
  const rows = getOwnedRows(memoryRentalServices, req.user.sub).filter((service) => !activeOnly || service.active !== false);
  res.json({ data: rows, count: rows.length });
});

app.post('/rental/services', authMiddleware, (req, res) => {
  const service = {
    id: createId(),
    user_id: req.user.sub,
    name: req.body?.name || 'Service',
    type: req.body?.type || 'fixed',
    unit_price: Number(req.body?.unitPrice || req.body?.unit_price || 0),
    unit_price_ac: Number(req.body?.unitPriceAc || req.body?.unit_price_ac || 0),
    unit: req.body?.unit || '',
    icon: req.body?.icon || null,
    active: req.body?.active !== false,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  memoryRentalServices.set(service.id, service);
  res.status(201).json({ data: service });
});

app.get('/bank-config', authMiddleware, (req, res) => {
  res.json({ data: memoryBankConfigs.get(req.user.sub) || null });
});

app.put('/bank-config', authMiddleware, (req, res) => {
  const config = {
    id: memoryBankConfigs.get(req.user.sub)?.id || createId(),
    user_id: req.user.sub,
    bank_id: req.body?.bank_id || null,
    account_no: req.body?.account_no || null,
    account_name: req.body?.account_name || null,
    qr_uri: req.body?.qr_uri || null,
    user_avatar: req.body?.user_avatar || null,
    updated_at: nowIso(),
  };
  memoryBankConfigs.set(req.user.sub, config);
  res.json({ data: config });
});

app.get('/trading/items', authMiddleware, (req, res) => {
  const rows = getOwnedRows(memoryTradingItems, req.user.sub)
    .filter((item) => !req.query.walletId || item.wallet_id === req.query.walletId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  res.json({ data: rows, count: rows.length });
});

app.get('/trading/items/batch/:batchId', authMiddleware, (req, res) => {
  const rows = getOwnedRows(memoryTradingItems, req.user.sub).filter((item) => item.batch_id === req.params.batchId);
  res.json({ data: rows, count: rows.length });
});

app.post('/trading/items', authMiddleware, (req, res) => {
  const quantity = Math.max(Number(req.body?.quantity || 1), 1);
  const batchId = quantity > 1 ? createId() : req.body?.batchId || req.body?.batch_id || null;
  const rows = Array.from({ length: quantity }, () => {
    const item = {
      id: createId(),
      user_id: req.user.sub,
      wallet_id: req.body?.walletId || req.body?.wallet_id || null,
      name: req.body?.name || 'Item',
      category: req.body?.category || '',
      import_price: Number(req.body?.importPrice || req.body?.import_price || 0),
      sell_price: Number(req.body?.sellPrice || req.body?.sell_price || 0),
      target_price: req.body?.targetPrice || req.body?.target_price || null,
      import_date: req.body?.importDate || req.body?.import_date || nowIso().slice(0, 10),
      sell_date: req.body?.sellDate || req.body?.sell_date || null,
      batch_id: batchId,
      status: req.body?.status || 'available',
      note: req.body?.note || '',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    memoryTradingItems.set(item.id, item);
    return item;
  });
  res.status(201).json({ data: rows });
});

app.patch('/trading/items/:id', authMiddleware, (req, res) => {
  const item = memoryTradingItems.get(req.params.id);
  if (!item || item.user_id !== req.user.sub) return res.status(404).json({ error: 'Trading item not found' });
  const updated = {
    ...item,
    ...(req.body?.name !== undefined ? { name: req.body.name } : {}),
    ...(req.body?.category !== undefined ? { category: req.body.category } : {}),
    ...(req.body?.importPrice !== undefined ? { import_price: Number(req.body.importPrice || 0) } : {}),
    ...(req.body?.sellPrice !== undefined ? { sell_price: Number(req.body.sellPrice || 0) } : {}),
    ...(req.body?.targetPrice !== undefined ? { target_price: req.body.targetPrice } : {}),
    ...(req.body?.importDate !== undefined ? { import_date: req.body.importDate } : {}),
    ...(req.body?.sellDate !== undefined ? { sell_date: req.body.sellDate } : {}),
    ...(req.body?.status !== undefined ? { status: req.body.status } : {}),
    ...(req.body?.note !== undefined ? { note: req.body.note } : {}),
    updated_at: nowIso(),
  };
  memoryTradingItems.set(updated.id, updated);
  res.json({ data: updated });
});

app.delete('/trading/items/:id', authMiddleware, (req, res) => {
  const item = memoryTradingItems.get(req.params.id);
  if (!item || item.user_id !== req.user.sub) return res.status(404).json({ error: 'Trading item not found' });
  memoryTradingItems.delete(req.params.id);
  res.json({ success: true });
});

app.get('/trading/stats', authMiddleware, (req, res) => {
  const rows = getOwnedRows(memoryTradingItems, req.user.sub).filter((item) => !req.query.walletId || item.wallet_id === req.query.walletId);
  const available = rows.filter((item) => item.status === 'available');
  const sold = rows.filter((item) => item.status === 'sold');
  const unsoldCapital = available.reduce((sum, item) => sum + Number(item.import_price || 0), 0);
  const realizedProfit = sold.reduce((sum, item) => sum + Number(item.sell_price || 0) - Number(item.import_price || 0), 0);
  res.json({
    data: {
      unsoldCapital,
      unsoldCount: available.length,
      realizedProfit,
      soldCount: sold.length,
    },
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
