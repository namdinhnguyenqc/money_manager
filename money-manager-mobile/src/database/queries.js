import { getDb } from '../database/db';
import { shouldUseApiData } from '../services/dataMode';
import { apiWalletRepository } from '../repositories/api/ApiWalletRepository';
import { apiTransactionRepository } from '../repositories/api/ApiTransactionRepository';
import { apiInvoiceRepository } from '../repositories/api/ApiInvoiceRepository';
import { apiCategoryRepository } from '../repositories/api/ApiCategoryRepository';
import { apiBankConfigRepository } from '../repositories/api/ApiBankConfigRepository';
import { apiTradingRepository } from '../repositories/api/ApiTradingRepository';
import { apiRentalRepository } from '../repositories/api/ApiRentalRepository';

const DEFAULT_WALLETS = [
  { name: 'Tài chính cá nhân', type: 'personal' },
  { name: 'Quản lý nhà trọ', type: 'rental' },
  { name: 'Kinh doanh / Tồn kho', type: 'trading' },
];

const DEFAULT_CATEGORIES_BY_WALLET_TYPE = {
  personal: {
    expense: [
      { name: 'Ăn uống', icon: '🍔', color: '#ef4444' },
      { name: 'Di chuyển', icon: '🚗', color: '#3b82f6' },
      { name: 'Hóa đơn', icon: '📄', color: '#6366f1' },
    ],
    income: [
      { name: 'Lương', icon: '💼', color: '#10b981' },
      { name: 'Thưởng', icon: '🎁', color: '#0ea5e9' },
    ],
  },
  rental: {
    expense: [{ name: 'Bảo trì', icon: '🔧', color: '#f59e0b' }],
    income: [{ name: 'Thu tiền phòng', icon: '🏠', color: '#10b981' }],
  },
  trading: {
    expense: [{ name: 'Nhập hàng', icon: '📦', color: '#f97316' }],
    income: [{ name: 'Bán hàng', icon: '💰', color: '#16a34a' }],
  },
};

const DEFAULT_RENTAL_SERVICES = [
  { name: 'Điện', type: 'metered', unitPrice: 3500, unitPriceAc: 4000, unit: 'kWh', icon: '⚡' },
  { name: 'Nước', type: 'metered', unitPrice: 15000, unitPriceAc: 0, unit: 'm3', icon: '💧' },
  { name: 'Rác', type: 'fixed', unitPrice: 30000, unitPriceAc: 0, unit: 'month', icon: '🗑️' },
  { name: 'Wifi', type: 'fixed', unitPrice: 70000, unitPriceAc: 0, unit: 'month', icon: '📶' },
];

let apiBootstrapPromise = null;
let apiServicesBootstrapPromise = null;
const normalizeServiceType = (type) => (type === 'meter' ? 'metered' : type);
const normalizeServiceRow = (row) => ({ ...row, type: normalizeServiceType(row?.type) });

// ─── WALLETS ────────────────────────────────────────────────────────────────
const fetchAllApiTransactions = async ({ walletId = null } = {}) => {
  const limit = 200;
  let offset = 0;
  let total = null;
  const rows = [];

  while (total === null || rows.length < total) {
    const page = await apiTransactionRepository.getTransactions({ walletId, limit, offset });
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < limit) break;
    offset += limit;
    if (total === null) {
      total = await apiTransactionRepository.getTransactionCount(walletId);
    }
  }

  return rows;
};

const fetchAllApiTradingItems = async () => {
  const wallets = await apiWalletRepository.getWallets();
  const tradingWallets = wallets.filter((w) => w.type === 'trading');
  if (tradingWallets.length === 0) return [];

  const chunks = await Promise.all(
    tradingWallets.map((wallet) => apiTradingRepository.getTradingItems(wallet.id))
  );
  return chunks.flat();
};

const ensureApiBootstrapData = async () => {
  if (!shouldUseApiData()) return;
  if (apiBootstrapPromise) return apiBootstrapPromise;

  apiBootstrapPromise = (async () => {
    let allWallets = await apiWalletRepository.getAllWallets();
    if (allWallets.length === 0) {
      await Promise.all(
        DEFAULT_WALLETS.map((wallet) => apiWalletRepository.addWallet(wallet.name, wallet.type))
      );
      allWallets = await apiWalletRepository.getAllWallets();
    }

    await Promise.all(
      allWallets.map(async (wallet) => {
        const walletType = String(wallet.type || '');
        const defaults = DEFAULT_CATEGORIES_BY_WALLET_TYPE[walletType];
        if (!defaults) return;

        const [expenseCats, incomeCats] = await Promise.all([
          apiCategoryRepository.getCategories('expense', wallet.id),
          apiCategoryRepository.getCategories('income', wallet.id),
        ]);

        const expenseNames = new Set(expenseCats.map((x) => String(x.name).toLowerCase()));
        const incomeNames = new Set(incomeCats.map((x) => String(x.name).toLowerCase()));

        for (const cat of defaults.expense) {
          if (!expenseNames.has(cat.name.toLowerCase())) {
            await apiCategoryRepository.addCategory(cat.name, cat.icon, cat.color, 'expense', wallet.id, null);
          }
        }
        for (const cat of defaults.income) {
          if (!incomeNames.has(cat.name.toLowerCase())) {
            await apiCategoryRepository.addCategory(cat.name, cat.icon, cat.color, 'income', wallet.id, null);
          }
        }
      })
    );
  })();

  try {
    await apiBootstrapPromise;
  } catch (error) {
    apiBootstrapPromise = null;
    throw error;
  }
};

const ensureApiRentalServices = async () => {
  if (!shouldUseApiData()) return;
  if (apiServicesBootstrapPromise) return apiServicesBootstrapPromise;

  apiServicesBootstrapPromise = (async () => {
    const services = await apiRentalRepository.getServices(false);
    if (services.length > 0) return;

    for (const service of DEFAULT_RENTAL_SERVICES) {
      await apiRentalRepository.addService(service);
    }
  })();

  try {
    await apiServicesBootstrapPromise;
  } catch (error) {
    apiServicesBootstrapPromise = null;
    throw error;
  }
};

export const getWallets = async () => {
  if (shouldUseApiData()) {
    await ensureApiBootstrapData();
    return await apiWalletRepository.getWallets();
  }
  const db = await getDb();
  return await db.getAllAsync(`
    SELECT * FROM wallets 
    WHERE active=1 
    ORDER BY 
      CASE 
        WHEN type='personal' THEN 1 
        WHEN type='rental' THEN 2 
        WHEN type='trading' THEN 3 
        ELSE 4 
      END
  `);
};

export const getAllWallets = async () => {
  if (shouldUseApiData()) {
    await ensureApiBootstrapData();
    return await apiWalletRepository.getAllWallets();
  }
  const db = await getDb();
  return await db.getAllAsync(`
    SELECT * FROM wallets 
    ORDER BY 
      CASE 
        WHEN type='personal' THEN 1 
        WHEN type='rental' THEN 2 
        WHEN type='trading' THEN 3 
        ELSE 4 
      END
  `);
};

export const toggleWalletStatus = async (id, active) => {
  if (shouldUseApiData()) return await apiWalletRepository.toggleWalletStatus(id, active);
  const db = await getDb();
  await db.runAsync(`UPDATE wallets SET active=? WHERE id=?`, [active ? 1 : 0, id]);
};

export const addWallet = async (name, typeStr) => {
  if (shouldUseApiData()) return await apiWalletRepository.addWallet(name, typeStr);
  const db = await getDb();
  let icon = '👛';
  let color = '#3b82f6';
  if (typeStr === 'rental') { icon = '🏠'; color = '#10b981'; }
  if (typeStr === 'trading') { icon = '📦'; color = '#f59e0b'; }
  const r = await db.runAsync(
    `INSERT INTO wallets (name, icon, color, type, active) VALUES (?,?,?,?,1)`,
    [name, icon, color, typeStr]
  );
  return r.lastInsertRowId;
};

export const updateWallet = async (id, name, typeStr) => {
  if (shouldUseApiData()) return await apiWalletRepository.updateWallet(id, name, typeStr);
  const db = await getDb();
  let icon = '👛';
  let color = '#3b82f6';
  if (typeStr === 'rental') { icon = '🏠'; color = '#10b981'; }
  if (typeStr === 'trading') { icon = '🏍️'; color = '#ef4444'; }
  
  await db.runAsync(
    `UPDATE wallets SET name=?, type=?, icon=?, color=? WHERE id=?`,
    [name, typeStr, icon, color, id]
  );
};

export const getWalletStats = async (walletId) => {
  if (shouldUseApiData()) return await apiWalletRepository.getWalletStats(walletId);
  const db = await getDb();
  const income = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id=? AND type='income'`,
    [walletId]
  );
  const expense = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id=? AND type='expense'`,
    [walletId]
  );
  return { income: income.total, expense: expense.total, balance: income.total - expense.total };
};

export const getMonthlyWalletStats = async (walletId, month, year) => {
  if (shouldUseApiData()) return await apiWalletRepository.getMonthlyWalletStats(walletId, month, year);
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  const income = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id=? AND type='income' AND date LIKE ?`,
    [walletId, `${prefix}%`]
  );
  const expense = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id=? AND type='expense' AND date LIKE ?`,
    [walletId, `${prefix}%`]
  );
  return { income: income.total, expense: expense.total, balance: income.total - expense.total };
};

export const getTotalStats = async () => {
  if (shouldUseApiData()) return await apiWalletRepository.getTotalStats();
  const db = await getDb();
  const income = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income'`
  );
  const expense = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense'`
  );
  return { income: income.total, expense: expense.total, balance: income.total - expense.total };
};

// Monthly stats for analytics
export const getMonthlyStats = async (month, year) => {
  if (shouldUseApiData()) return await apiWalletRepository.getMonthlyStats(month, year);
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  const income = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND date LIKE ?`,
    [`${prefix}%`]
  );
  const expense = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND date LIKE ?`,
    [`${prefix}%`]
  );
  return { income: income.total, expense: expense.total, balance: income.total - expense.total };
};

// ─── NEW: 6-month chart data ────────────────────────────────────────────────
export const getLast6MonthsStats = async () => {
  if (shouldUseApiData()) {
    const rows = await fetchAllApiTransactions();
    const results = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const prefix = `${y}-${String(m).padStart(2, '0')}`;
      const monthRows = rows.filter((x) => String(x.date || '').startsWith(prefix));
      const income = monthRows
        .filter((x) => x.type === 'income')
        .reduce((sum, x) => sum + Number(x.amount || 0), 0);
      const expense = monthRows
        .filter((x) => x.type === 'expense')
        .reduce((sum, x) => sum + Number(x.amount || 0), 0);
      results.push({ month: m, year: y, label: `T${m}`, income, expense });
    }
    return results;
  }
  const db = await getDb();
  const results = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const income = await db.getFirstAsync(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND date LIKE ?`,
      [`${prefix}%`]
    );
    const expense = await db.getFirstAsync(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND date LIKE ?`,
      [`${prefix}%`]
    );
    results.push({
      month: m,
      year: y,
      label: `T${m}`,
      income: income.total || 0,
      expense: expense.total || 0,
    });
  }
  return results;
};

export const getCategoryBreakdown = async (type, month, year) => {
  if (shouldUseApiData()) {
    const prefix = `${year}-${String(month).padStart(2,'0')}`;
    const [activeWallets, rows] = await Promise.all([
      apiWalletRepository.getWallets(),
      fetchAllApiTransactions(),
    ]);
    const activeWalletIds = new Set(activeWallets.map((w) => Number(w.id)));
    const filtered = rows.filter(
      (x) =>
        x.type === type &&
        String(x.date || '').startsWith(prefix) &&
        activeWalletIds.has(Number(x.wallet_id))
    );

    const grouped = new Map();
    filtered.forEach((tx) => {
      const key = tx.category_id == null ? 'null' : String(tx.category_id);
      const prev = grouped.get(key) || {
        name: tx.category_name || 'Other',
        icon: tx.category_icon || '💬',
        color: tx.category_color || '#64748b',
        total: 0,
      };
      prev.total += Number(tx.amount || 0);
      grouped.set(key, prev);
    });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  return await db.getAllAsync(`
    SELECT c.name, c.icon, c.color, COALESCE(SUM(t.amount),0) as total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    JOIN wallets w ON t.wallet_id = w.id
    WHERE t.type = ? AND t.date LIKE ? AND (w.active = 1 OR w.active IS NULL)
    GROUP BY t.category_id
    ORDER BY total DESC
  `, [type, `${prefix}%`]);
};

// ─── CATEGORIES ────────────────────────────────────────────────────────────
export const getCategories = async (type, walletId) => {
  if (shouldUseApiData()) {
    await ensureApiBootstrapData();
    return await apiCategoryRepository.getCategories(type, walletId);
  }
  const db = await getDb();
  return await db.getAllAsync(
    `SELECT * FROM categories WHERE type=? AND wallet_id=? ORDER BY parent_id ASC, name ASC`,
    [type, walletId]
  );
};

export const addCategory = async (name, icon, color, type, walletId, parentId = null) => {
  if (shouldUseApiData()) return await apiCategoryRepository.addCategory(name, icon, color, type, walletId, parentId);
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO categories (name, icon, color, type, wallet_id, parent_id) VALUES (?,?,?,?,?,?)`,
    [name, icon, color, type, walletId, parentId]
  );
  return r.lastInsertRowId;
};

export const updateCategory = async (id, name, icon, color, parentId = null) => {
  if (shouldUseApiData()) return await apiCategoryRepository.updateCategory(id, name, icon, color, parentId);
  const db = await getDb();
  await db.runAsync(
    `UPDATE categories SET name=?, icon=?, color=?, parent_id=? WHERE id=?`,
    [name, icon, color, parentId, id]
  );
};

export const deleteCategory = async (id) => {
  if (shouldUseApiData()) return await apiCategoryRepository.deleteCategory(id);
  const db = await getDb();
  await db.runAsync(`UPDATE transactions SET category_id=NULL WHERE category_id=?`, [id]);
  await db.runAsync(`DELETE FROM categories WHERE id=?`, [id]);
};


// ─── TRANSACTIONS ───────────────────────────────────────────────────────────
export const getTransactions = async ({ walletId, limit = 50, offset = 0 } = {}) => {
  if (shouldUseApiData()) return await apiTransactionRepository.getTransactions({ walletId, limit, offset });
  const db = await getDb();
  if (walletId) {
    return await db.getAllAsync(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             w.name as wallet_name, w.color as wallet_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      WHERE t.wallet_id = ?
      ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?
    `, [walletId, limit, offset]);
  }
  return await db.getAllAsync(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           w.name as wallet_name, w.color as wallet_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN wallets w ON t.wallet_id = w.id
    ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?
  `, [limit, offset]);
};

export const getTransactionCount = async (walletId) => {
  if (shouldUseApiData()) return await apiTransactionRepository.getTransactionCount(walletId || null);
  const db = await getDb();
  const res = walletId
    ? await db.getFirstAsync(`SELECT COUNT(*) as c FROM transactions WHERE wallet_id=?`, [walletId])
    : await db.getFirstAsync(`SELECT COUNT(*) as c FROM transactions`);
  return res.c;
};

export const addTransaction = async ({ type, amount, description, categoryId, walletId, imageUri, date }) => {
  if (shouldUseApiData()) {
    return await apiTransactionRepository.addTransaction({ type, amount, description, categoryId, walletId, imageUri, date });
  }
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO transactions (type, amount, description, category_id, wallet_id, image_uri, date) VALUES (?,?,?,?,?,?,?)`,
    [type, amount, description || '', categoryId || null, walletId, imageUri || null, date]
  );
  return r.lastInsertRowId;
};

export const updateTransaction = async (id, { type, amount, description, categoryId, walletId, imageUri, date }) => {
  if (shouldUseApiData()) {
    return await apiTransactionRepository.updateTransaction(id, { type, amount, description, categoryId, walletId, imageUri, date });
  }
  const db = await getDb();
  await db.runAsync(
    `UPDATE transactions SET type=?, amount=?, description=?, category_id=?, wallet_id=?, image_uri=?, date=? WHERE id=?`,
    [type, amount, description || '', categoryId || null, walletId, imageUri || null, date, id]
  );
};

export const deleteTransaction = async (id) => {
  if (shouldUseApiData()) {
    await apiTransactionRepository.deleteTransaction(id);
    return;
  }
  const db = await getDb();
  
  // Data Integrity: Check if this transaction is linked to an invoice
  const linkedInvoice = await db.getFirstAsync(`SELECT id FROM invoices WHERE transaction_id = ?`, [id]);
  if (linkedInvoice) {
    await db.runAsync(
      `UPDATE invoices SET status = 'unpaid', transaction_id = NULL, paid_amount = 0 WHERE id = ?`,
      [linkedInvoice.id]
    );
  }

  await db.runAsync(`DELETE FROM transactions WHERE id=?`, [id]);
};

// ─── ROOMS ──────────────────────────────────────────────────────────────────
export const getRooms = async (walletId = null) => {
  if (shouldUseApiData()) return await apiRentalRepository.getRooms(walletId);
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return await cloud.getRooms();
  const db = await getDb();
  let query = `
    SELECT r.*, c.id as contract_id, c.deposit, c.start_date, c.end_date,
           t.id as tenant_id, t.name as tenant_name, t.phone as tenant_phone, 
           t.id_card as tenant_id_card, t.address as tenant_address
    FROM rooms r
    LEFT JOIN contracts c ON r.id = c.room_id AND c.status = 'active'
    LEFT JOIN tenants t ON c.tenant_id = t.id
  `;
  const params = [];
  if (walletId) {
    query += ` WHERE r.wallet_id = ? `;
    params.push(walletId);
  }
  query += ` ORDER BY r.name ASC `;
  
  return await db.getAllAsync(query, params);
};

export const addRoom = async (name, price, hasAc = false, numPeople = 1, walletId = null) => {
  if (shouldUseApiData()) return await apiRentalRepository.addRoom(name, price, hasAc, numPeople, walletId);
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return await cloud.addRoom(name, price, hasAc, numPeople);
  if (!name) throw new Error('Tên phòng không được để trống');
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO rooms (wallet_id, name, price, has_ac, num_people, status) VALUES (?,?,?,?,?, 'vacant')`,
    [walletId, name.trim(), price || 0, hasAc ? 1 : 0, numPeople || 1]
  );
  return r.lastInsertRowId;
};

export const updateRoom = async (id, name, price, hasAc, numPeople) => {
  if (shouldUseApiData()) return await apiRentalRepository.updateRoom(id, name, price, hasAc, numPeople);
  if (!name) throw new Error('Tên phòng không được để trống');
  const db = await getDb();
  await db.runAsync(
    `UPDATE rooms SET name=?, price=?, has_ac=?, num_people=? WHERE id=?`,
    [name.trim(), price || 0, hasAc ? 1 : 0, numPeople || 1, id]
  );
};

export const deleteRoom = async (id) => {
  if (shouldUseApiData()) return await apiRentalRepository.deleteRoom(id);
  const db = await getDb();
  
  // 1. Check for ACTIVE contract
  const activeContract = await db.getFirstAsync(
    `SELECT id FROM contracts WHERE room_id = ? AND status = 'active'`, 
    [id]
  );
  
  if (activeContract) {
    throw new Error('Không thể xóa phòng đang có người thuê. Vui lòng trả phòng trước.');
  }

  // 2. Perform manual cascading delete for history (SQLite fallback)
  console.log(`Cascade deleting history for room ${id}...`);
  await db.runAsync(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE room_id = ?)`, [id]);
  await db.runAsync(`DELETE FROM invoices WHERE room_id = ?`, [id]);
  await db.runAsync(`DELETE FROM contract_services WHERE contract_id IN (SELECT id FROM contracts WHERE room_id = ?)`, [id]);
  await db.runAsync(`DELETE FROM contracts WHERE room_id = ?`, [id]);
  
  // 3. Xóa phòng itself
  const result = await db.runAsync(`DELETE FROM rooms WHERE id=?`, [id]);
  if (result.changes === 0) {
    throw new Error('Failed to delete room or room does not exist.');
  }
};

// ─── TENANTS ────────────────────────────────────────────────────────────────
export const getTenants = async () => {
  if (shouldUseApiData()) return await apiRentalRepository.getTenants();
  const db = await getDb();
  return await db.getAllAsync(`SELECT * FROM tenants ORDER BY name ASC`);
};

export const addTenant = async (name, phone, idCard, address) => {
  if (shouldUseApiData()) return await apiRentalRepository.addTenant(name, phone, idCard, address);
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return await cloud.addTenant(name, phone, idCard, address);
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO tenants (name, phone, id_card, address) VALUES (?,?,?,?)`,
    [name, phone || '', idCard || '', address || '']
  );
  return r.lastInsertRowId;
};

export const updateTenant = async (id, data) => {
  if (shouldUseApiData()) return await apiRentalRepository.updateTenant(id, data);
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return await cloud.updateTenant(String(id), data);
  const db = await getDb();
  await db.runAsync(
    `UPDATE tenants SET name=?, phone=?, id_card=?, address=? WHERE id=?`,
    [data.name, data.phone || '', data.idCard || '', data.address || '', id]
  );
};

// ─── CONTRACTS ──────────────────────────────────────────────────────────────
export const getActiveContracts = async () => {
  if (shouldUseApiData()) return await apiRentalRepository.getActiveContracts();
  const db = await getDb();
  return await db.getAllAsync(`
    SELECT c.*, r.name as room_name, r.price as room_price,
           r.has_ac, r.num_people,
           t.name as tenant_name, t.phone as tenant_phone
    FROM contracts c
    JOIN rooms r ON c.room_id = r.id
    JOIN tenants t ON c.tenant_id = t.id
    WHERE c.status = 'active'
    ORDER BY r.name ASC
  `);
};

export const addContract = async (roomId, tenantId, startDate, deposit, serviceIds = []) => {
  if (shouldUseApiData()) return await apiRentalRepository.addContract(roomId, tenantId, startDate, deposit, serviceIds);
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return await cloud.addContract(String(roomId), String(tenantId), startDate, deposit, serviceIds);
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO contracts (room_id, tenant_id, start_date, deposit) VALUES (?,?,?,?)`,
    [roomId, tenantId, startDate, deposit]
  );
  const contractId = r.lastInsertRowId;
  
  await db.runAsync(`UPDATE rooms SET status='occupied' WHERE id=?`, [roomId]);

  for (const sid of serviceIds) {
    await db.runAsync(`INSERT INTO contract_services (contract_id, service_id) VALUES (?,?)`, [contractId, sid]);
  }

  return contractId;
};

export const updateContract = async (id, { startDate, deposit, serviceIds = [] }) => {
  if (shouldUseApiData()) return await apiRentalRepository.updateContract(id, { startDate, deposit, serviceIds });
  const db = await getDb();
  await db.runAsync(
    `UPDATE contracts SET start_date=?, deposit=? WHERE id=?`,
    [startDate, deposit, id]
  );
  
  await db.runAsync(`DELETE FROM contract_services WHERE contract_id=?`, [id]);
  for (const sid of serviceIds) {
    await db.runAsync(`INSERT INTO contract_services (contract_id, service_id) VALUES (?,?)`, [id, sid]);
  }
};

export const getContractServices = async (contractId) => {
  if (shouldUseApiData()) {
    const rows = await apiRentalRepository.getContractServices(contractId);
    return rows.map(normalizeServiceRow);
  }
  const db = await getDb();
  const rows = await db.getAllAsync(`
    SELECT s.* FROM services s
    JOIN contract_services cs ON s.id = cs.service_id
    WHERE cs.contract_id=?
  `, [contractId]);
  return rows.map(normalizeServiceRow);
};

export const terminateContract = async (id, roomId, refundAmount = 0, walletId = null) => {
  if (shouldUseApiData()) return await apiRentalRepository.terminateContract(id, roomId, refundAmount, walletId);
  const db = await getDb();
  const now = new Date().toISOString().split('T')[0];
  
  // 1. Cập nhật hợp đồng status
  await db.runAsync(
    `UPDATE contracts SET status='terminated', end_date=? WHERE id=?`,
    [now, id]
  );
  
  // 2. Set room to vacant
  await db.runAsync(`UPDATE rooms SET status='vacant' WHERE id=?`, [roomId]);

  // 3. Handle Refund Transaction (If any)
  if (refundAmount > 0 && walletId) {
    const room = await db.getFirstAsync(`SELECT name FROM rooms WHERE id=?`, [roomId]);
    await addTransaction({
      type: 'expense',
      amount: refundAmount,
      description: `Deposit refund for room ${room?.name || ''}`,
      categoryId: null, // Optional: could link to a 'Refund' category
      walletId: walletId,
      imageUri: null,
      date: now,
    });
  }
};

// ─── SERVICES ───────────────────────────────────────────────────────────────
export const getServices = async () => {
  if (shouldUseApiData()) {
    await ensureApiRentalServices();
    const rows = await apiRentalRepository.getServices(true);
    return rows.map(normalizeServiceRow);
  }
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT * FROM services WHERE active=1 ORDER BY id ASC`);
  return rows.map(normalizeServiceRow);
};

export const addService = async ({ name, type, unitPrice, unitPriceAc = 0, unit, icon }) => {
  if (shouldUseApiData()) return await apiRentalRepository.addService({ name, type, unitPrice, unitPriceAc, unit, icon });
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO services (name, type, unit_price, unit_price_ac, unit, icon, active) VALUES (?,?,?,?,?,?,1)`,
    [name, type, unitPrice, unitPriceAc, unit, icon || '⚙️']
  );
  return r.lastInsertRowId;
};

export const updateService = async (id, { unitPrice, unitPriceAc, active }) => {
  if (shouldUseApiData()) return await apiRentalRepository.updateService(id, { unitPrice, unitPriceAc, active });
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return; // Note: Cloud updates for services usually handled in migration or specific sheet
  const db = await getDb();
  await db.runAsync(
    `UPDATE services SET unit_price=?, unit_price_ac=?, active=? WHERE id=?`,
    [unitPrice, unitPriceAc || 0, active ? 1 : 0, id]
  );
};

export const deleteService = async (id) => {
  if (shouldUseApiData()) return await apiRentalRepository.deleteService(id);
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return;
  const db = await getDb();
  await db.runAsync(`DELETE FROM services WHERE id=?`, [id]);
};

// ─── INVOICES ───────────────────────────────────────────────────────────────
export const getInvoices = async (month, year) => {
  if (shouldUseApiData()) return await apiInvoiceRepository.getInvoices(month, year);
  const db = await getDb();
  return await db.getAllAsync(`
    SELECT i.*, r.name as room_name, t.name as tenant_name, t.phone as tenant_phone, i.invoice_note
    FROM invoices i
    JOIN contracts c ON i.contract_id = c.id
    JOIN rooms r ON c.room_id = r.id
    JOIN tenants t ON c.tenant_id = t.id
    WHERE i.month=? AND i.year=?
    ORDER BY r.name ASC
  `, [month, year]);
};

export const getInvoiceDetails = async (invoiceId) => {
  if (shouldUseApiData()) return await apiInvoiceRepository.getInvoiceDetails(invoiceId);
  const db = await getDb();
  const invoice = await db.getFirstAsync(`
    SELECT i.*, r.name as room_name, r.price as contract_price,
           t.name as tenant_name, t.phone as tenant_phone
    FROM invoices i
    JOIN contracts c ON i.contract_id = c.id
    JOIN rooms r ON c.room_id = r.id
    JOIN tenants t ON c.tenant_id = t.id
    WHERE i.id=?
  `, [invoiceId]);
  const items = await db.getAllAsync(`SELECT * FROM invoice_items WHERE invoice_id=?`, [invoiceId]);
  return { ...invoice, items };
};

export const createInvoice = async (data) => {
  if (shouldUseApiData()) return await apiInvoiceRepository.createInvoice(data);
  const db = await getDb();
  const { roomId, contractId, month, year, roomFee, items, previousDebt = 0, elecOld, elecNew, waterOld, waterNew, invoiceNote } = data;
  const serviceFees = items.reduce((s, i) => s + i.amount, 0);
  const total = roomFee + serviceFees + previousDebt;

  const r = await db.runAsync(
    `INSERT INTO invoices (room_id, contract_id, month, year, room_fee, total_amount, previous_debt, elec_old, elec_new, water_old, water_new, invoice_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [roomId, contractId, month, year, roomFee, total, previousDebt, elecOld || null, elecNew || null, waterOld || null, waterNew || null, invoiceNote || null]
  );
  const invoiceId = r.lastInsertRowId;

  for (const item of items) {
    await db.runAsync(
      `INSERT INTO invoice_items (invoice_id, service_id, name, detail, amount) VALUES (?,?,?,?,?)`,
      [invoiceId, item.serviceId || null, item.name, item.detail || '', item.amount]
    );
  }
  return invoiceId;
};

export const markInvoicePaid = async (invoiceId, paidAmount, transactionId = null) => {
  if (shouldUseApiData()) {
    return await apiInvoiceRepository.markInvoicePaid(invoiceId, { paidAmount, transactionId });
  }
  const db = await getDb();
  await db.runAsync(
    `UPDATE invoices SET paid_amount=?, status='paid', transaction_id=? WHERE id=?`,
    [paidAmount, transactionId, invoiceId]
  );
};

export const deleteInvoice = async (invoiceId) => {
  if (shouldUseApiData()) return await apiInvoiceRepository.deleteInvoice(invoiceId);
  const db = await getDb();
  const inv = await db.getFirstAsync(`SELECT * FROM invoices WHERE id=?`, [invoiceId]);
  if (inv) {
    if (inv.transaction_id) {
      await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [inv.transaction_id]);
    } else if (inv.status === 'paid') {
      // Fallback for older records
      const desc = `Thu tiền phòng ${inv.room_name} T${inv.month}/${inv.year}`;
      await db.runAsync(`DELETE FROM transactions WHERE description = ? AND amount = ?`, [desc, inv.total_amount]);
    }
  }
  await db.runAsync(`DELETE FROM invoice_items WHERE invoice_id=?`, [invoiceId]);
  await db.runAsync(`DELETE FROM invoices WHERE id=?`, [invoiceId]);
};

export const getInvoiceHistory = async (contractId) => {
  if (shouldUseApiData()) return await apiInvoiceRepository.getInvoiceHistory(contractId);
  const db = await getDb();
  return await db.getAllAsync(`
    SELECT * FROM invoices 
    WHERE contract_id=? 
    ORDER BY year DESC, month DESC
  `, [contractId]);
};

export const getPreviousDebt = async (roomId, month, year) => {
  if (shouldUseApiData()) return await apiInvoiceRepository.getPreviousDebt(roomId, month, year);
  const db = await getDb();
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
  const prev = await db.getFirstAsync(`
    SELECT total_amount, paid_amount FROM invoices 
    WHERE room_id=? AND month=? AND year=? AND status != 'paid'
  `, [roomId, prevMonth, prevYear]);
  if (!prev) return 0;
  return (prev.total_amount || 0) - (prev.paid_amount || 0);
};

export const getLatestMeterReadings = async (roomId) => {
  if (shouldUseApiData()) return await apiInvoiceRepository.getLatestMeterReadings(roomId);
  const db = await getDb();
  return await db.getFirstAsync(`
    SELECT elec_new as elec_old, water_new as water_old 
    FROM invoices 
    WHERE room_id=? AND elec_new IS NOT NULL 
    ORDER BY year DESC, month DESC 
    LIMIT 1
  `, [roomId]);
};

// ─── BANK CONFIG ────────────────────────────────────────────────────────────
export const getBankConfig = async () => {
  if (shouldUseApiData()) return await apiBankConfigRepository.getBankConfig();
  const db = await getDb();
  return await db.getFirstAsync(`SELECT * FROM bank_config WHERE active=1 LIMIT 1`);
};

export const updateBankConfig = async (data) => {
  if (shouldUseApiData()) return await apiBankConfigRepository.updateBankConfig(data);
  const { bank_id, account_no, account_name, qr_uri } = data;
  const db = await getDb();
  const existing = await db.getFirstAsync(`SELECT id FROM bank_config WHERE active=1`);
  if (existing) {
    await db.runAsync(
      `UPDATE bank_config SET bank_id=?, account_no=?, account_name=?, qr_uri=? WHERE id=?`,
      [bank_id, account_no, account_name, qr_uri || null, existing.id]
    );
  } else {
    await db.runAsync(
      `INSERT INTO bank_config (bank_id, account_no, account_name, qr_uri, active) VALUES (?,?,?,?,1)`,
      [bank_id, account_no, account_name, qr_uri || null]
    );
  }
};

// ─── TRADING ────────────────────────────────────────────────────────────────
export const getTradingCategories = async () => {
  const db = await getDb();
  return await db.getAllAsync(`SELECT * FROM trading_categories ORDER BY name ASC`);
};

export const addTradingCategory = async (name, icon, color) => {
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO trading_categories (name, icon, color) VALUES (?, ?, ?)`,
    [name, icon, color]
  );
  return r.lastInsertRowId;
};

export const updateTradingCategory = async (id, name, icon, color) => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE trading_categories SET name=?, icon=?, color=? WHERE id=?`,
    [name, icon, color, id]
  );
};

export const deleteTradingCategory = async (id) => {
  const db = await getDb();
  // Safe delete: items using this category can be updated later or kept as text
  await db.runAsync(`DELETE FROM trading_categories WHERE id=?`, [id]);
};

export const getTradingItems = async (walletId) => {
  if (shouldUseApiData()) return await apiTradingRepository.getTradingItems(walletId);
  const db = await getDb();
  return await db.getAllAsync(
    `SELECT t.*, 
       (SELECT COUNT(*) FROM trading_items t2 WHERE t2.batch_id = t.batch_id AND t.batch_id IS NOT NULL) as batch_total,
       (SELECT COUNT(*) FROM trading_items t3 WHERE t3.batch_id = t.batch_id AND t3.status = 'sold' AND t.batch_id IS NOT NULL) as batch_sold
     FROM trading_items t 
     WHERE wallet_id=? 
     ORDER BY import_date DESC`,
    [walletId]
  );
};

export const getTradingItemsByBatch = async (batchId) => {
  if (shouldUseApiData()) return await apiTradingRepository.getTradingItemsByBatch(batchId);
  const db = await getDb();
  return await db.getAllAsync(
    `SELECT * FROM trading_items WHERE batch_id=? ORDER BY created_at ASC`,
    [batchId]
  );
};

export const addTradingItem = async ({ walletId, name, category, importPrice, importDate, targetPrice, batchId, note, quantity = 1, subItems = [] }) => {
  if (shouldUseApiData()) return await apiTradingRepository.addTradingItem({ walletId, name, category, importPrice, importDate, targetPrice, batchId, note, quantity, subItems });
  const db = await getDb();
  
  // 1. Create Transaction for Cash Outflow (Total amount)
  const txId = await addTransaction({
    type: 'expense',
    amount: importPrice,
    description: `Stock import: ${name}${quantity > 1 ? ' (x'+quantity+')' : ''}${batchId ? ' (Batch: '+batchId+')' : ''}`,
    walletId,
    date: importDate
  });

  // 2. Add Item(s)
  const perItemPrice = importPrice / quantity;
  let lastId = null;
  
  // Use subItems if provided (contains {name, category}), else fallback to sequential
  const itemsToCreate = subItems.length > 0 
    ? subItems.map(si => ({ name: `${name} - ${si.name}`, category: si.category || category }))
    : Array.from({ length: quantity }, (_, i) => ({ 
        name: quantity > 1 ? `${name} - item ${i + 1}` : name,
        category: category 
      }));

  for (const it of itemsToCreate) {
    const r = await db.runAsync(
      `INSERT INTO trading_items (wallet_id, name, category, import_price, target_price, import_date, batch_id, transaction_id, note, status) 
       VALUES (?,?,?,?,?,?,?,?,?,'available')`,
      [walletId, it.name, it.category || '', perItemPrice, targetPrice ? targetPrice / quantity : null, importDate, batchId || null, txId, note || '']
    );
    lastId = r.lastInsertRowId;
  }
  
  return lastId;
};

export const updateTradingItem = async (id, data) => {
  if (shouldUseApiData()) return await apiTradingRepository.updateTradingItem(String(id), data);
  const db = await getDb();
  await db.runAsync(
    `UPDATE trading_items SET name=?, category=?, import_price=?, sell_price=?, target_price=?, import_date=?, sell_date=?, status=?, note=? WHERE id=?`,
    [data.name, data.category || '', data.importPrice, data.sellPrice || 0, data.targetPrice || null, data.importDate, data.sellDate || null, data.status, data.note || '', id]
  );
};

export const deleteTradingItem = async (id) => {
  if (shouldUseApiData()) return await apiTradingRepository.deleteTradingItem(String(id));
  const db = await getDb();
  await db.runAsync(`DELETE FROM trading_items WHERE id=?`, [id]);
};

export const getTradingStats = async (walletId) => {
  if (shouldUseApiData()) return await apiTradingRepository.getTradingStats(walletId);
  const db = await getDb();
  try {
    const unsold = await db.getFirstAsync(
      `SELECT COALESCE(SUM(import_price), 0) as total_unsold, COUNT(*) as count_unsold FROM trading_items WHERE wallet_id=? AND status='available'`,
      [walletId]
    );
    const sold = await db.getFirstAsync(
      `SELECT COALESCE(SUM(sell_price - import_price), 0) as total_profit, COUNT(*) as count_sold FROM trading_items WHERE wallet_id=? AND status='sold'`,
      [walletId]
    );
    return { 
      unsoldCapital: unsold?.total_unsold || 0, 
      unsoldCount: unsold?.count_unsold || 0,
      realizedProfit: sold?.total_profit || 0,
      soldCount: sold?.count_sold || 0
    };
  } catch (e) {
    console.error("Stats error:", e);
    return { unsoldCapital: 0, unsoldCount: 0, realizedProfit: 0, soldCount: 0 };
  }
};

export const getGlobalNetWorth = async () => {
  if (shouldUseApiData()) {
    const [activeWallets, txRows, tradingRows] = await Promise.all([
      apiWalletRepository.getWallets(),
      fetchAllApiTransactions(),
      fetchAllApiTradingItems(),
    ]);
    const activeWalletIds = new Set(activeWallets.map((w) => Number(w.id)));

    const cashBalance = txRows
      .filter((x) => activeWalletIds.has(Number(x.wallet_id)))
      .reduce((sum, x) => sum + (x.type === 'income' ? Number(x.amount || 0) : -Number(x.amount || 0)), 0);

    const inventoryValue = tradingRows
      .filter((x) => x.status === 'available' && activeWalletIds.has(Number(x.wallet_id)))
      .reduce((sum, x) => sum + Number(x.import_price || 0), 0);

    return {
      cashBalance,
      inventoryValue,
      totalNetWorth: cashBalance + inventoryValue,
    };
  }
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return await cloud.getTotalStats(); 
  const db = await getDb();
  
  const txResult = await db.getFirstAsync(
    `SELECT COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE -t.amount END), 0) as net 
     FROM transactions t
     JOIN wallets w ON t.wallet_id = w.id
     WHERE w.active = 1 OR w.active IS NULL`
  );
  
  const tradingResult = await db.getFirstAsync(
    `SELECT COALESCE(SUM(ti.import_price), 0) as total 
     FROM trading_items ti
     JOIN wallets w ON ti.wallet_id = w.id
     WHERE ti.status='available' AND (w.active = 1 OR w.active IS NULL)`
  );

  return {
    cashBalance: txResult?.net || 0,
    inventoryValue: tradingResult?.total || 0,
    totalNetWorth: (txResult?.net || 0) + (tradingResult?.total || 0)
  };
};

export const getTodayStats = async () => {
  if (shouldUseApiData()) {
    const today = new Date().toISOString().split('T')[0];
    const [activeWallets, rows] = await Promise.all([
      apiWalletRepository.getWallets(),
      fetchAllApiTransactions(),
    ]);
    const activeWalletIds = new Set(activeWallets.map((w) => Number(w.id)));

    const todayRows = rows.filter(
      (x) => String(x.date || '') === today && activeWalletIds.has(Number(x.wallet_id))
    );

    const income = todayRows
      .filter((x) => x.type === 'income')
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const expense = todayRows
      .filter((x) => x.type === 'expense')
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
    return { income, expense, balance: income - expense };
  }
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return await cloud.getTodayStats();
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const res = await db.getFirstAsync(
    `SELECT 
      COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) as expense
    FROM transactions t
    JOIN wallets w ON t.wallet_id = w.id
    WHERE t.date = ? AND w.active = 1`,
    [today]
  );
  return {
    income: res?.income || 0,
    expense: res?.expense || 0,
    balance: (res?.income || 0) - (res?.expense || 0)
  };
};

export const getNetWorthTrend = async (limit = 6) => {
  if (shouldUseApiData()) {
    const [activeWallets, txRows, tradingRows] = await Promise.all([
      apiWalletRepository.getWallets(),
      fetchAllApiTransactions(),
      fetchAllApiTradingItems(),
    ]);
    const activeWalletIds = new Set(activeWallets.map((w) => Number(w.id)));
    const filteredTx = txRows.filter((x) => activeWalletIds.has(Number(x.wallet_id)));
    const filteredTrading = tradingRows.filter((x) => activeWalletIds.has(Number(x.wallet_id)));

    const results = [];
    const now = new Date();
    for (let i = limit - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const cutoff = d.toISOString().split('T')[0];
      const monthLabel = `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;

      const cash = filteredTx
        .filter((x) => String(x.date || '') <= cutoff)
        .reduce((sum, x) => sum + (x.type === 'income' ? Number(x.amount || 0) : -Number(x.amount || 0)), 0);

      const inventory = filteredTrading
        .filter(
          (x) =>
            String(x.import_date || '') <= cutoff &&
            (!x.sell_date || String(x.sell_date) > cutoff)
        )
        .reduce((sum, x) => sum + Number(x.import_price || 0), 0);

      results.push({ label: monthLabel, value: cash + inventory });
    }
    return results;
  }
  // TODO: Refactor adapter pattern for dual backend  if (auth.currentUser) return []; // Cloud aggregation pending
  const db = await getDb();
  const results = [];
  const now = new Date();
  
  for (let i = limit - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); 
    const cutoff = d.toISOString().split('T')[0];
    const monthLabel = `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
    
    const cashRes = await db.getFirstAsync(
      `SELECT COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE -t.amount END), 0) as net 
       FROM transactions t
       JOIN wallets w ON t.wallet_id = w.id
       WHERE t.date <= ? AND (w.active = 1 OR w.active IS NULL)`,
      [cutoff]
    );
    
    const inventoryRes = await db.getFirstAsync(
      `SELECT COALESCE(SUM(ti.import_price), 0) as total 
       FROM trading_items ti
       JOIN wallets w ON ti.wallet_id = w.id
       WHERE ti.import_date <= ? AND (ti.sell_date IS NULL OR ti.sell_date > ?) AND (w.active = 1 OR w.active IS NULL)`,
      [cutoff, cutoff]
    );
    
    results.push({ label: monthLabel, value: (cashRes?.net || 0) + (inventoryRes?.total || 0) });
  }
  return results;
};
