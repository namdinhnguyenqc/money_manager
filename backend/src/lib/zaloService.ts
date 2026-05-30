import { supabaseAdmin } from "./supabase.js";
import { encryptToken, decryptToken } from "../utils/crypto.js";

// Zalo developer app config (read from env variables)
const ZALO_APP_ID = process.env.ZALO_APP_ID || "";
const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET || "";

export type ZaloConnection = {
  id?: string;
  owner_id: string;
  connection_type: "USER" | "OA";
  zalo_user_id?: string;
  oa_id?: string;
  oa_name?: string;
  oa_avatar?: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  status: "ACTIVE" | "INACTIVE";
  created_at?: string;
  updated_at?: string;
};

export type ZaloTemplate = {
  id?: string;
  owner_id: string;
  oa_id: string;
  template_id: string;
  template_name: string;
  template_type?: string;
  status: "ACTIVE" | "INACTIVE";
};

export type ZaloNotificationLog = {
  id?: string;
  invoice_id: string;
  tenant_id: string;
  phone_number: string;
  template_id: string;
  message_payload: any;
  send_status: "PENDING" | "SENT" | "FAILED";
  zalo_message_id?: string;
  error_code?: number;
  error_message?: string;
  retry_count: number;
  sent_at?: string;
  created_at?: string;
};

/**
 * Saves Zalo connection to DB
 */
export async function saveZaloConnection(conn: ZaloConnection): Promise<void> {
  const { error } = await supabaseAdmin.from("zalo_connections").upsert({
    owner_id: conn.owner_id,
    connection_type: conn.connection_type,
    zalo_user_id: conn.zalo_user_id || null,
    oa_id: conn.oa_id || null,
    oa_name: conn.oa_name || null,
    oa_avatar: conn.oa_avatar || null,
    access_token_encrypted: conn.access_token_encrypted,
    refresh_token_encrypted: conn.refresh_token_encrypted,
    access_token_expires_at: conn.access_token_expires_at,
    refresh_token_expires_at: conn.refresh_token_expires_at,
    status: conn.status,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_id, connection_type" });

  if (error) {
    console.error("Failed to save Zalo connection:", error);
    throw new Error(`Unable to save Zalo connection: ${error.message}`);
  }
}

/**
 * Gets Zalo connection by owner & type
 */
export async function getZaloConnection(
  ownerId: string,
  type: "USER" | "OA"
): Promise<ZaloConnection | null> {
  const { data, error } = await supabaseAdmin
    .from("zalo_connections")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("connection_type", type)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error loading Zalo connection:", error);
    return null;
  }
  return data;
}

/**
 * Removes connection
 */
export async function deleteZaloConnection(ownerId: string, type: "USER" | "OA"): Promise<void> {
  await supabaseAdmin
    .from("zalo_connections")
    .delete()
    .eq("owner_id", ownerId)
    .eq("connection_type", type);
}

/**
 * Sync active ZBS templates for an OA
 */
export async function syncActiveOATemplates(ownerId: string, oaId: string): Promise<void> {
  const defaultTemplates: ZaloTemplate[] = [
    {
      owner_id: ownerId,
      oa_id: oaId,
      template_id: "zbs_invoice_v1",
      template_name: "Thông báo Hóa đơn Tiền trọ TroCare",
      status: "ACTIVE",
    },
    {
      owner_id: ownerId,
      oa_id: oaId,
      template_id: "zbs_payment_remind",
      template_name: "Nhắc nhở Đóng tiền phòng hàng tháng",
      status: "ACTIVE",
    }
  ];

  for (const t of defaultTemplates) {
    await supabaseAdmin.from("zalo_message_templates").upsert({
      owner_id: ownerId,
      oa_id: oaId,
      template_id: t.template_id,
      template_name: t.template_name,
      status: t.status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id, oa_id, template_id" });
  }
}

/**
 * Lists active templates
 */
export async function getActiveTemplates(ownerId: string, oaId: string): Promise<ZaloTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from("zalo_message_templates")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("oa_id", oaId)
    .eq("status", "ACTIVE");

  if (error) {
    console.error("Error getting templates:", error);
    return [];
  }
  return data || [];
}

/**
 * Refreshes OA access token automatically if it expired or is close to expiring
 */
export async function refreshOATokenIfNeeded(ownerId: string): Promise<string> {
  const conn = await getZaloConnection(ownerId, "OA");
  if (!conn) throw new Error("Zalo OA is not connected.");

  const now = new Date();
  const expiresAt = new Date(conn.access_token_expires_at);
  const timeDifferenceMs = expiresAt.getTime() - now.getTime();

  // If token is valid for more than 5 minutes, decrypt and return it
  if (timeDifferenceMs > 5 * 60 * 1000) {
    return decryptToken(conn.access_token_encrypted);
  }

  const decryptedRefresh = decryptToken(conn.refresh_token_encrypted);

  // Call real Zalo OAuth token refresh endpoint
  try {
    const response = await fetch("https://oauth.zalo.me/v2.0/oa/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: ZALO_APP_SECRET,
      },
      body: new URLSearchParams({
        app_id: ZALO_APP_ID,
        grant_type: "refresh_token",
        refresh_token: decryptedRefresh,
      }),
    });

    const data = await response.json();
    if (data.error || !data.access_token) {
      throw new Error(data.error_description || data.message || "Failed to refresh Zalo OA Token.");
    }

    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token || decryptedRefresh; // fallback to old refresh if not provided
    const newExpiresIn = Number(data.expires_in || 3600);

    await saveZaloConnection({
      ...conn,
      access_token_encrypted: encryptToken(newAccessToken),
      refresh_token_encrypted: encryptToken(newRefreshToken),
      access_token_expires_at: new Date(Date.now() + newExpiresIn * 1000).toISOString(),
    });

    return newAccessToken;
  } catch (error: any) {
    console.error("Failed to refresh Zalo OA token:", error);
    throw new Error(`Phiên kết nối Zalo OA hết hạn, vui lòng kết nối lại: ${error.message}`);
  }
}

/**
 * Triggers sending ZBS template message
 */
export async function sendZBSNotification(
  log: ZaloNotificationLog,
  ownerId: string
): Promise<{ success: boolean; msgId?: string; errCode?: number; errMsg?: string }> {

  // Format phone number to standard international format (84...)
  let cleanPhone = log.phone_number.replace(/\s+/g, "").replace(/\+/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "84" + cleanPhone.slice(1);
  }
  if (!cleanPhone.startsWith("84")) {
    return { success: false, errCode: -2, errMsg: "Số điện thoại không đúng định dạng Việt Nam." };
  }

  // Get active access token
  let token = "";
  try {
    token = await refreshOATokenIfNeeded(ownerId);
  } catch (err: any) {
    return { success: false, errCode: -1, errMsg: err.message };
  }

  // Call Real Zalo OA ZBS Template API
  try {
    const payload = {
      phone: cleanPhone,
      template_id: log.template_id,
      template_data: log.message_payload,
    };

    const response = await fetch("https://openapi.zalo.me/v3.0/oa/message/template", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: token,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Zalo API returns success code 0
    if (data.error === 0) {
      const msgId = data.data?.message_id;
      return { success: true, msgId };
    } else {
      return {
        success: false,
        errCode: data.error,
        errMsg: data.message || "Unknown Zalo API Error",
      };
    }
  } catch (error: any) {
    console.error("Zalo API Template sending request failed:", error);
    return {
      success: false,
      errCode: -99,
      errMsg: `Network error or connection failed: ${error.message}`,
    };
  }
}
