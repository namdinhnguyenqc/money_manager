import { getDb } from '../db';
import { shouldUseApiData } from '../../services/dataMode';
import { apiBankConfigRepository } from '../../repositories/api/ApiBankConfigRepository';
import { apiWalletRepository } from '../../repositories/api/ApiWalletRepository';
import { apiTradingRepository } from '../../repositories/api/ApiTradingRepository';
import { apiTransactionRepository } from '../../repositories/api/ApiTransactionRepository';

// Helper for API transactions
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
    if (total === null) total = await apiTransactionRepository.getTransactionCount(walletId);
  }
  return rows;
};

const fetchAllApiTradingItems = async () => {
  const wallets = await apiWalletRepository.getWallets();
  const tradingWallets = wallets.filter((w) => w.type === 'trading');
  if (tradingWallets.length === 0) return [];
  const chunks = await Promise.all(tradingWallets.map((wallet) => apiTradingRepository.getTradingItems(wallet.id)));
  return chunks.flat();
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
    await db.runAsync(`UPDATE bank_config SET bank_id=?, account_no=?, account_name=?, qr_uri=? WHERE id=?`, [bank_id, account_no, account_name, qr_uri || null, existing.id]);
  } else {
    await db.runAsync(`INSERT INTO bank_config (bank_id, account_no, account_name, qr_uri, active) VALUES (?,?,?,?,1)`, [bank_id, account_no, account_name, qr_uri || null]);
  }
};

// ─── STATS ──────────────────────────────────────────────────────────────────
export const getWalletStats = async (walletId) => {
  if (shouldUseApiData()) return await apiWalletRepository.getWalletStats(walletId);
  const db = await getDb();
  const income = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id=? AND type='income'`, [walletId]);
  const expense = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id=? AND type='expense'`, [walletId]);
  return { income: income.total, expense: expense.total, balance: income.total - expense.total };
};

export const getMonthlyWalletStats = async (walletId, month, year) => {
  if (shouldUseApiData()) return await apiWalletRepository.getMonthlyWalletStats(walletId, month, year);
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  const income = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id=? AND type='income' AND date LIKE ?`, [walletId, `${prefix}%`]);
  const expense = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE wallet_id=? AND type='expense' AND date LIKE ?`, [walletId, `${prefix}%`]);
  return { income: income.total, expense: expense.total, balance: income.total - expense.total };
};

export const getTotalStats = async () => {
  if (shouldUseApiData()) return await apiWalletRepository.getTotalStats();
  const db = await getDb();
  const income = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income'`);
  const expense = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense'`);
  return { income: income.total, expense: expense.total, balance: income.total - expense.total };
};

export const getMonthlyStats = async (month, year) => {
  if (shouldUseApiData()) return await apiWalletRepository.getMonthlyStats(month, year);
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  const income = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND date LIKE ?`, [`${prefix}%`]);
  const expense = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND date LIKE ?`, [`${prefix}%`]);
  return { income: income.total, expense: expense.total, balance: income.total - expense.total };
};

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
      const income = monthRows.filter((x) => x.type === 'income').reduce((sum, x) => sum + Number(x.amount || 0), 0);
      const expense = monthRows.filter((x) => x.type === 'expense').reduce((sum, x) => sum + Number(x.amount || 0), 0);
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
    const income = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND date LIKE ?`, [`${prefix}%`]);
    const expense = await db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND date LIKE ?`, [`${prefix}%`]);
    results.push({ month: m, year: y, label: `T${m}`, income: income.total || 0, expense: expense.total || 0 });
  }
  return results;
};

export const getCategoryBreakdown = async (type, month, year) => {
  if (shouldUseApiData()) {
    const prefix = `${year}-${String(month).padStart(2,'0')}`;
    const [activeWallets, rows] = await Promise.all([apiWalletRepository.getWallets(), fetchAllApiTransactions()]);
    const activeWalletIds = new Set(activeWallets.map((w) => Number(w.id)));
    const filtered = rows.filter((x) => x.type === type && String(x.date || '').startsWith(prefix) && activeWalletIds.has(Number(x.wallet_id)));
    const grouped = new Map();
    filtered.forEach((tx) => {
      const key = tx.category_id == null ? 'null' : String(tx.category_id);
      const prev = grouped.get(key) || { name: tx.category_name || 'Other', icon: tx.category_icon || '💬', color: tx.category_color || '#64748b', total: 0 };
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

export const getGlobalNetWorth = async () => {
  if (shouldUseApiData()) {
    const [activeWallets, txRows, tradingRows] = await Promise.all([apiWalletRepository.getWallets(), fetchAllApiTransactions(), fetchAllApiTradingItems()]);
    const activeWalletIds = new Set(activeWallets.map((w) => Number(w.id)));
    const cashBalance = txRows.filter((x) => activeWalletIds.has(Number(x.wallet_id))).reduce((sum, x) => sum + (x.type === 'income' ? Number(x.amount || 0) : -Number(x.amount || 0)), 0);
    const inventoryValue = tradingRows.filter((x) => x.status === 'available' && activeWalletIds.has(Number(x.wallet_id))).reduce((sum, x) => sum + Number(x.import_price || 0), 0);
    return { cashBalance, inventoryValue, totalNetWorth: cashBalance + inventoryValue };
  }
  const db = await getDb();
  const txResult = await db.getFirstAsync(`SELECT COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE -t.amount END), 0) as net FROM transactions t JOIN wallets w ON t.wallet_id = w.id WHERE w.active = 1 OR w.active IS NULL`);
  const tradingResult = await db.getFirstAsync(`SELECT COALESCE(SUM(ti.import_price), 0) as total FROM trading_items ti JOIN wallets w ON ti.wallet_id = w.id WHERE ti.status='available' AND (w.active = 1 OR w.active IS NULL)`);
  return { cashBalance: txResult?.net || 0, inventoryValue: tradingResult?.total || 0, totalNetWorth: (txResult?.net || 0) + (tradingResult?.total || 0) };
};

export const getTodayStats = async () => {
  if (shouldUseApiData()) {
    const today = new Date().toISOString().split('T')[0];
    const [activeWallets, rows] = await Promise.all([apiWalletRepository.getWallets(), fetchAllApiTransactions()]);
    const activeWalletIds = new Set(activeWallets.map((w) => Number(w.id)));
    const todayRows = rows.filter((x) => String(x.date || '') === today && activeWalletIds.has(Number(x.wallet_id)));
    const income = todayRows.filter((x) => x.type === 'income').reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const expense = todayRows.filter((x) => x.type === 'expense').reduce((sum, x) => sum + Number(x.amount || 0), 0);
    return { income, expense, balance: income - expense };
  }
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const res = await db.getFirstAsync(`SELECT COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) as expense FROM transactions t JOIN wallets w ON t.wallet_id = w.id WHERE t.date = ? AND w.active = 1`, [today]);
  return { income: res?.income || 0, expense: res?.expense || 0, balance: (res?.income || 0) - (res?.expense || 0) };
};

export const getNetWorthTrend = async (limit = 6) => {
  if (shouldUseApiData()) {
    const [activeWallets, txRows, tradingRows] = await Promise.all([apiWalletRepository.getWallets(), fetchAllApiTransactions(), fetchAllApiTradingItems()]);
    const activeWalletIds = new Set(activeWallets.map((w) => Number(w.id)));
    const filteredTx = txRows.filter((x) => activeWalletIds.has(Number(x.wallet_id)));
    const filteredTrading = tradingRows.filter((x) => activeWalletIds.has(Number(x.wallet_id)));
    const results = [];
    const now = new Date();
    for (let i = limit - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const cutoff = d.toISOString().split('T')[0];
      const monthLabel = `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
      const cash = filteredTx.filter((x) => String(x.date || '') <= cutoff).reduce((sum, x) => sum + (x.type === 'income' ? Number(x.amount || 0) : -Number(x.amount || 0)), 0);
      const inventory = filteredTrading.filter((x) => String(x.import_date || '') <= cutoff && (!x.sell_date || String(x.sell_date) > cutoff)).reduce((sum, x) => sum + Number(x.import_price || 0), 0);
      results.push({ label: monthLabel, value: cash + inventory });
    }
    return results;
  }
  const db = await getDb();
  const results = [];
  const now = new Date();
  for (let i = limit - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); 
    const cutoff = d.toISOString().split('T')[0];
    const monthLabel = `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
    const cashRes = await db.getFirstAsync(`SELECT COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount ELSE -t.amount END), 0) as net FROM transactions t JOIN wallets w ON t.wallet_id = w.id WHERE t.date <= ? AND (w.active = 1 OR w.active IS NULL)`, [cutoff]);
    const inventoryRes = await db.getFirstAsync(`SELECT COALESCE(SUM(ti.import_price), 0) as total FROM trading_items ti JOIN wallets w ON ti.wallet_id = w.id WHERE ti.import_date <= ? AND (ti.sell_date IS NULL OR ti.sell_date > ?) AND (w.active = 1 OR w.active IS NULL)`, [cutoff, cutoff]);
    results.push({ label: monthLabel, value: (cashRes?.net || 0) + (inventoryRes?.total || 0) });
  }
  return results;
};
