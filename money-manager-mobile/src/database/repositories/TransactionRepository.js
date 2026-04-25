import { getDb } from '../db';
import { shouldUseApiData } from '../../services/dataMode';
import { apiWalletRepository } from '../../repositories/api/ApiWalletRepository';
import { apiTransactionRepository } from '../../repositories/api/ApiTransactionRepository';
import { apiCategoryRepository } from '../../repositories/api/ApiCategoryRepository';

// ─── WALLETS ────────────────────────────────────────────────────────────────
export const getWallets = async () => {
  if (shouldUseApiData()) return await apiWalletRepository.getWallets();
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
  if (shouldUseApiData()) return await apiWalletRepository.getAllWallets();
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

// ─── TRANSACTIONS ───────────────────────────────────────────────────────────
export const getTransactions = async ({ walletId, limit = 50, offset = 0 } = {}) => {
  if (shouldUseApiData()) return await apiTransactionRepository.getTransactions({ walletId, limit, offset });
  const db = await getDb();
  const query = walletId
    ? `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color, w.name as wallet_name, w.color as wallet_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN wallets w ON t.wallet_id = w.id
       WHERE t.wallet_id = ?
       ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`
    : `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color, w.name as wallet_name, w.color as wallet_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN wallets w ON t.wallet_id = w.id
       ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`;
  const params = walletId ? [walletId, limit, offset] : [limit, offset];
  return await db.getAllAsync(query, params);
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
  if (shouldUseApiData()) return await apiTransactionRepository.addTransaction({ type, amount, description, categoryId, walletId, imageUri, date });
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO transactions (type, amount, description, category_id, wallet_id, image_uri, date) VALUES (?,?,?,?,?,?,?)`,
    [type, amount, description || '', categoryId || null, walletId, imageUri || null, date]
  );
  return r.lastInsertRowId;
};

export const updateTransaction = async (id, { type, amount, description, categoryId, walletId, imageUri, date }) => {
  if (shouldUseApiData()) return await apiTransactionRepository.updateTransaction(id, { type, amount, description, categoryId, walletId, imageUri, date });
  const db = await getDb();
  await db.runAsync(
    `UPDATE transactions SET type=?, amount=?, description=?, category_id=?, wallet_id=?, image_uri=?, date=? WHERE id=?`,
    [type, amount, description || '', categoryId || null, walletId, imageUri || null, date, id]
  );
};

export const deleteTransaction = async (id) => {
  if (shouldUseApiData()) return await apiTransactionRepository.deleteTransaction(id);
  const db = await getDb();
  const linkedInvoice = await db.getFirstAsync(`SELECT id FROM invoices WHERE transaction_id = ?`, [id]);
  if (linkedInvoice) {
    await db.runAsync(`UPDATE invoices SET status = 'unpaid', transaction_id = NULL, paid_amount = 0 WHERE id = ?`, [linkedInvoice.id]);
  }
  await db.runAsync(`DELETE FROM transactions WHERE id=?`, [id]);
};

// ─── CATEGORIES ────────────────────────────────────────────────────────────
export const getCategories = async (type, walletId) => {
  if (shouldUseApiData()) return await apiCategoryRepository.getCategories(type, walletId);
  const db = await getDb();
  return await db.getAllAsync(`SELECT * FROM categories WHERE type=? AND wallet_id=? ORDER BY parent_id ASC, name ASC`, [type, walletId]);
};

export const addCategory = async (name, icon, color, type, walletId, parentId = null) => {
  if (shouldUseApiData()) return await apiCategoryRepository.addCategory(name, icon, color, type, walletId, parentId);
  const db = await getDb();
  const r = await db.runAsync(`INSERT INTO categories (name, icon, color, type, wallet_id, parent_id) VALUES (?,?,?,?,?,?)`, [name, icon, color, type, walletId, parentId]);
  return r.lastInsertRowId;
};

export const updateCategory = async (id, name, icon, color, parentId = null) => {
  if (shouldUseApiData()) return await apiCategoryRepository.updateCategory(id, name, icon, color, parentId);
  const db = await getDb();
  await db.runAsync(`UPDATE categories SET name=?, icon=?, color=?, parent_id=? WHERE id=?`, [name, icon, color, parentId, id]);
};

export const deleteCategory = async (id) => {
  if (shouldUseApiData()) return await apiCategoryRepository.deleteCategory(id);
  const db = await getDb();
  await db.runAsync(`UPDATE transactions SET category_id=NULL WHERE category_id=?`, [id]);
  await db.runAsync(`DELETE FROM categories WHERE id=?`, [id]);
};
