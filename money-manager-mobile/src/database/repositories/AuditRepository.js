import { getDb } from '../db';

export const logAuditAction = async (action, resourceType, resourceId, details = {}) => {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO audit_logs (action, resource_type, resource_id, details) VALUES (?, ?, ?, ?)`,
      [action, resourceType, String(resourceId), JSON.stringify(details)]
    );
  } catch (error) {
    console.warn("Local audit logging failed:", error);
  }
};
