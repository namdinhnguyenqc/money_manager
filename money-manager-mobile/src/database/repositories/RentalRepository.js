import { getDb } from '../db';
import { shouldUseApiData } from '../../services/dataMode';
import { apiRentalRepository } from '../../repositories/api/ApiRentalRepository';
import { addTransaction } from './TransactionRepository';

const normalizeServiceType = (type) => (type === 'meter' ? 'metered' : type);
export const normalizeServiceRow = (row) => ({ ...row, type: normalizeServiceType(row?.type) });

// ─── ROOMS ──────────────────────────────────────────────────────────────────
export const getRooms = async (walletId = null) => {
  if (shouldUseApiData()) return await apiRentalRepository.getRooms(walletId);
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
  await db.runAsync(
    `UPDATE contracts SET status='terminated', end_date=? WHERE id=?`,
    [now, id]
  );
  await db.runAsync(`UPDATE rooms SET status='vacant' WHERE id=?`, [roomId]);
  if (refundAmount > 0 && walletId) {
    const room = await db.getFirstAsync(`SELECT name FROM rooms WHERE id=?`, [roomId]);
    await addTransaction({
      type: 'expense',
      amount: refundAmount,
      description: `Deposit refund for room ${room?.name || ''}`,
      categoryId: null,
      walletId: walletId,
      imageUri: null,
      date: now,
    });
  }
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
