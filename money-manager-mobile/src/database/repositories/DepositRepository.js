import { getDb } from '../db';
import { shouldUseApiData } from '../../services/dataMode';

export const getDeposits = async (status = null) => {
  if (shouldUseApiData()) {
    // Gọi API tương ứng khi có backend
  }
  const db = await getDb();
  let query = `
    SELECT d.*, r.name as room_name, b.name as building_name 
    FROM deposits d
    JOIN rooms r ON d.room_id = r.id
    JOIN buildings b ON r.building_id = b.id
  `;
  const params = [];
  if (status) {
    query += ` WHERE d.status = ?`;
    params.push(status);
  }
  query += ` ORDER BY d.recorded_at DESC`;
  
  return await db.getAllAsync(query, params);
};

export const addReservation = async (data) => {
  const db = await getDb();
  const id = Math.random().toString(36).substring(7); // Tạo ID tạm thời
  
  await db.runAsync(
    `INSERT INTO deposits (id, room_id, tenant_name, tenant_phone, amount, type, status, recorded_at, payment_method, note) 
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, data.roomId, data.tenantName, data.tenantPhone, data.amount, 'reservation', 'active', data.date, data.paymentMethod, data.note]
  );

  // Cập nhật trạng thái phòng
  await db.runAsync(`UPDATE rooms SET status = 'reserved' WHERE id = ?`, [data.roomId]);
  
  return id;
};

export const getTotalDeposit = async () => {
  const db = await getDb();
  const result = await db.getFirstAsync(`SELECT SUM(amount) as total FROM deposits WHERE status IN ('active', 'transferred')`);
  return result?.total || 0;
};
