import { getDb } from '../db';
import { shouldUseApiData } from '../../services/dataMode';
import { apiTradingRepository } from '../../repositories/api/ApiTradingRepository';
import { addTransaction } from './TransactionRepository';

// ─── TRADING ────────────────────────────────────────────────────────────────
export const getTradingCategories = async () => {
  const db = await getDb();
  return await db.getAllAsync(`SELECT * FROM trading_categories ORDER BY name ASC`);
};

export const addTradingCategory = async (name, icon, color) => {
  const db = await getDb();
  const r = await db.runAsync(`INSERT INTO trading_categories (name, icon, color) VALUES (?, ?, ?)`, [name, icon, color]);
  return r.lastInsertRowId;
};

export const updateTradingCategory = async (id, name, icon, color) => {
  const db = await getDb();
  await db.runAsync(`UPDATE trading_categories SET name=?, icon=?, color=? WHERE id=?`, [name, icon, color, id]);
};

export const deleteTradingCategory = async (id) => {
  const db = await getDb();
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
  return await db.getAllAsync(`SELECT * FROM trading_items WHERE batch_id=? ORDER BY created_at ASC`, [batchId]);
};

export const addTradingItem = async ({ walletId, name, category, importPrice, importDate, targetPrice, batchId, note, quantity = 1, subItems = [] }) => {
  if (shouldUseApiData()) return await apiTradingRepository.addTradingItem({ walletId, name, category, importPrice, importDate, targetPrice, batchId, note, quantity, subItems });
  const db = await getDb();
  const txId = await addTransaction({
    type: 'expense',
    amount: importPrice,
    description: `Stock import: ${name}${quantity > 1 ? ' (x'+quantity+')' : ''}${batchId ? ' (Batch: '+batchId+')' : ''}`,
    walletId,
    date: importDate
  });
  const perItemPrice = importPrice / quantity;
  let lastId = null;
  const itemsToCreate = subItems.length > 0 
    ? subItems.map(si => ({ name: `${name} - ${si.name}`, category: si.category || category }))
    : Array.from({ length: quantity }, (_, i) => ({ name: quantity > 1 ? `${name} - item ${i + 1}` : name, category: category }));
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
    const unsold = await db.getFirstAsync(`SELECT COALESCE(SUM(import_price), 0) as total_unsold, COUNT(*) as count_unsold FROM trading_items WHERE wallet_id=? AND status='available'`, [walletId]);
    const sold = await db.getFirstAsync(`SELECT COALESCE(SUM(sell_price - import_price), 0) as total_profit, COUNT(*) as count_sold FROM trading_items WHERE wallet_id=? AND status='sold'`, [walletId]);
    return { unsoldCapital: unsold?.total_unsold || 0, unsoldCount: unsold?.count_unsold || 0, realizedProfit: sold?.total_profit || 0, soldCount: sold?.count_sold || 0 };
  } catch (e) {
    console.error("Stats error:", e);
    return { unsoldCapital: 0, unsoldCount: 0, realizedProfit: 0, soldCount: 0 };
  }
};
