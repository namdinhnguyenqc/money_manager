import { getDb } from '../db';
import { shouldUseApiData } from '../../services/dataMode';
import { apiInvoiceRepository } from '../../repositories/api/ApiInvoiceRepository';

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

  const existing = await db.getFirstAsync(
    `SELECT id FROM invoices WHERE contract_id=? AND month=? AND year=?`,
    [contractId, month, year]
  );
  if (existing) {
    throw new Error(`Phòng này đã có hóa đơn trong tháng ${month}/${year}.`);
  }

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

export const updateInvoice = async (invoiceId, data) => {
  if (shouldUseApiData()) {
    throw new Error('Chưa hỗ trợ sửa hóa đơn khi dùng dữ liệu API.');
  }
  const db = await getDb();
  const { roomFee, items, previousDebt = 0, elecOld, elecNew, waterOld, waterNew, invoiceNote } = data;

  const serviceFees = items.reduce((s, i) => s + i.amount, 0);
  const total = roomFee + serviceFees + previousDebt;

  await db.runAsync(
    `UPDATE invoices SET room_fee=?, total_amount=?, previous_debt=?, elec_old=?, elec_new=?, water_old=?, water_new=?, invoice_note=? WHERE id=?`,
    [roomFee, total, previousDebt, elecOld || null, elecNew || null, waterOld || null, waterNew || null, invoiceNote || null, invoiceId]
  );

  await db.runAsync(`DELETE FROM invoice_items WHERE invoice_id=?`, [invoiceId]);

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
  const inv = await db.getFirstAsync(`SELECT total_amount, paid_amount FROM invoices WHERE id=?`, [invoiceId]);
  if (!inv) return;

  const newPaidAmount = (inv.paid_amount || 0) + paidAmount;
  const status = newPaidAmount >= inv.total_amount ? 'paid' : 'partially_paid';

  await db.runAsync(
    `UPDATE invoices SET paid_amount=?, status=?, transaction_id=? WHERE id=?`,
    [newPaidAmount, status, transactionId, invoiceId]
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
