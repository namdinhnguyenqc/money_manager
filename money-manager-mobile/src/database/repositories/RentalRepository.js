import { getDb } from '../db';
import { shouldUseApiData } from '../../services/dataMode';
import { apiRentalRepository } from '../../repositories/api/ApiRentalRepository';
import { addTransaction } from './TransactionRepository';
import { logAuditAction } from './AuditRepository';

const normalizeServiceType = (type) => (type === 'meter' ? 'metered' : type);
export const normalizeServiceRow = (row) => ({ ...row, type: normalizeServiceType(row?.type) });

/**
 * Tính số ngày trong tháng của một chuỗi ngày (YYYY-MM-DD)
 */
export const getDaysInMonth = (dateStr) => {
  const date = new Date(dateStr);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

/**
 * Tính tiền thuê thực tế (Prorated) cho tháng đầu/cuối
 */
export const calculateProratedAmount = (monthlyRent, startDateStr, endDateStr) => {
  const daysInMonth = getDaysInMonth(startDateStr);
  const dailyRent = monthlyRent / daysInMonth;
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.abs(end - start);
  const stayedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return {
    dailyRent,
    stayedDays,
    total: Math.round(dailyRent * stayedDays),
    daysInMonth
  };
};

// ─── ROOMS ──────────────────────────────────────────────────────────────────
export const getRooms = async (walletId = null) => {
  if (shouldUseApiData()) return await apiRentalRepository.getRooms(walletId);
  const db = await getDb();
  let query = `
    SELECT r.*, c.id as contract_id, c.deposit, c.start_date, c.end_date,
           t.id as tenant_id, t.name as tenant_name, t.phone as tenant_phone, 
           t.id_card as tenant_id_card, t.address as tenant_address,
           (SELECT tenant_name FROM deposits WHERE room_id = r.id AND status = 'active' LIMIT 1) as res_tenant_name,
           (SELECT tenant_phone FROM deposits WHERE room_id = r.id AND status = 'active' LIMIT 1) as res_tenant_phone
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
  const activeContract = await db.getFirstAsync(
    `SELECT id FROM contracts WHERE room_id = ? AND status = 'active'`, 
    [id]
  );
  if (activeContract) {
    throw new Error('Không thể xóa phòng đang có người thuê. Vui lòng trả phòng trước.');
  }
  await db.runAsync(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE room_id = ?)`, [id]);
  await db.runAsync(`DELETE FROM invoices WHERE room_id = ?`, [id]);
  await db.runAsync(`DELETE FROM contract_services WHERE contract_id IN (SELECT id FROM contracts WHERE room_id = ?)`, [id]);
  await db.runAsync(`DELETE FROM contracts WHERE room_id = ?`, [id]);
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
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO tenants (name, phone, id_card, address) VALUES (?,?,?,?)`,
    [name, phone || '', idCard || '', address || '']
  );
  return r.lastInsertRowId;
};

export const updateTenant = async (id, data) => {
  if (shouldUseApiData()) return await apiRentalRepository.updateTenant(id, data);
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
  const db = await getDb();

  // 1. Check for existing active contract
  const existing = await db.getFirstAsync(
    `SELECT id FROM contracts WHERE room_id=? AND status='active'`,
    [roomId]
  );
  if (existing) {
    throw new Error("Phòng này đã có hợp đồng đang hoạt động.");
  }

  const r = await db.runAsync(
    `INSERT INTO contracts (room_id, tenant_id, start_date, deposit) VALUES (?,?,?,?)`,
    [roomId, tenantId, startDate, deposit]
  );
  const contractId = r.lastInsertRowId;
  await db.runAsync(`UPDATE rooms SET status='occupied' WHERE id=?`, [roomId]);
  for (const sid of serviceIds) {
    await db.runAsync(`INSERT INTO contract_services (contract_id, service_id) VALUES (?,?)`, [contractId, sid]);
  }
  await logAuditAction('contract_created', 'contract', contractId, { roomId, deposit });
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

export const terminateContract = async (id, roomId, refundData) => {
  if (shouldUseApiData()) return await apiRentalRepository.terminateContract(id, roomId, refundData);
  const db = await getDb();
  const now = new Date().toISOString().split('T')[0];
  
  // 1. End contract
  // NEW RULE: We should check settlement status before ending
  const settlementContract = await db.getFirstAsync(`SELECT settlement_status FROM contracts WHERE id=?`, [id]);
  if (settlementContract?.settlement_status !== 'paid' && refundData.forceTerminate !== true) {
     throw new Error("Vui lòng hoàn tất thanh toán thanh lý trước khi kết thúc hợp đồng.");
  }

  await db.runAsync(
    `UPDATE contracts SET status='ended', end_date=?, settlement_status='paid' WHERE id=?`,
    [now, id]
  );
  
  // 2. Clear room
  await db.runAsync(`UPDATE rooms SET status='vacant' WHERE id=?`, [roomId]);
  
  // 3. Fetch contract info for refund record
  const contractInfo = await db.getFirstAsync(
    `SELECT room_id, tenant_id, deposit FROM contracts WHERE id=?`, [id]
  );
  
  if (contractInfo) {
    const refundAmount = Number(refundData.refundAmount || 0);
    const deduction = Math.max(0, Number(contractInfo.deposit || 0) - refundAmount);
    
    // 4. Save refund record
    await db.runAsync(
      `INSERT INTO deposit_refunds (contract_id, tenant_id, room_id, original_deposit_amount, refund_amount, deduction_amount, refund_date, refund_method, note)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, contractInfo.tenant_id, contractInfo.room_id, contractInfo.deposit, refundAmount, deduction, refundData.refundDate || now, refundData.refundMethod, refundData.note]
    );

    // 5. Create transaction if refund > 0
    if (refundAmount > 0 && refundData.walletId) {
      const room = await db.getFirstAsync(`SELECT name FROM rooms WHERE id=?`, [roomId]);
      await addTransaction({
        type: 'expense',
        amount: refundAmount,
        description: `Trả tiền cọc - Phòng ${room?.name || ''}`,
        categoryId: null,
        walletId: refundData.walletId,
        imageUri: null,
        date: refundData.refundDate || now,
      });
    }
    await logAuditAction('contract_terminated', 'contract', id, { 
      roomId, 
      refundAmount, 
      deduction: Number(contractInfo.deposit || 0) - refundAmount 
    });
  }
};

export const getDepositRefund = async (contractId) => {
  if (shouldUseApiData()) return await apiRentalRepository.getDepositRefund(contractId);
  const db = await getDb();
  return await db.getFirstAsync(`SELECT * FROM deposit_refunds WHERE contract_id=?`, [contractId]);
};

// ─── SERVICES ───────────────────────────────────────────────────────────────
export const getServices = async () => {
  if (shouldUseApiData()) {
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
  const db = await getDb();
  await db.runAsync(
    `UPDATE services SET unit_price=?, unit_price_ac=?, active=? WHERE id=?`,
    [unitPrice, unitPriceAc || 0, active ? 1 : 0, id]
  );
};

export const deleteService = async (id) => {
  if (shouldUseApiData()) return await apiRentalRepository.deleteService(id);
  const db = await getDb();
  await db.runAsync(`DELETE FROM services WHERE id=?`, [id]);
};
