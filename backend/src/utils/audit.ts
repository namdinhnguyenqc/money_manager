import { SupabaseClient } from "@supabase/supabase-js";

export async function logAuditAction(
  db: SupabaseClient,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: any = {}
) {
  try {
    const { error } = await db.from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    });
    if (error) console.error("Audit logging failed:", error.message);
  } catch (err) {
    console.error("Audit logging error:", err);
  }
}
