import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { requireCompletedProfile } from "../middleware/requireCompletedProfile.js";
import {
  saveZaloConnection,
  getZaloConnection,
  deleteZaloConnection,
  syncActiveOATemplates,
  getActiveTemplates,
  sendZBSNotification,
  ZaloNotificationLog
} from "../lib/zaloService.js";
import { encryptToken } from "../utils/crypto.js";
import { verifyAccessToken } from "../lib/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";

const zaloRoutes = new Hono<AppEnv>();

// Zalo Developers App OAuth Configuration
const ZALO_APP_ID = process.env.ZALO_APP_ID || "";
const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET || "";

const sendZaloSchema = z.object({
  phoneNumber: z.string().min(9).max(15).optional(),
});

const bulkSendZaloSchema = z.object({
  invoiceIds: z.array(z.string().uuid()),
  phonesMap: z.record(z.string(), z.string()).optional(), // invoiceId -> phoneNumber if missing
});

// Helper: Convert Hono environment parameters
function getBaseUrl(c: any): string {
  const host = c.req.header("host") || "localhost:8787";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

// -------------------------------------------------------------
// 1. ZALO LOGIN (XÁC THỰC CHỦ TRỌ)
// -------------------------------------------------------------

// GET /zalo/auth/zalo/login - Khởi chạy Zalo Login OAuth
zaloRoutes.get("/auth/zalo/login", async (c) => {
  const baseUrl = getBaseUrl(c);
  const redirectUri = `${baseUrl}/api/auth/zalo/callback`;

  // Try to get token from query param and verify it to pass owner ID in state
  let state = c.req.query("state") || "login";
  const token = c.req.query("token");
  if (token) {
    const appJwt = await verifyAccessToken(token);
    if (appJwt) {
      state = appJwt.sub;
    }
  }

  const oauthUrl = `https://oauth.zalo.me/v2.0/auth?app_id=${ZALO_APP_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}`;
  return c.redirect(oauthUrl);
});

// GET /zalo/auth/zalo/callback - Tiếp nhận callback từ Zalo OAuth
zaloRoutes.get("/auth/zalo/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) {
    return c.json({ error: "Authorization code is missing from Zalo callback" }, 400);
  }

  try {
    // Exchange code for Zalo Access Token
    const tokenResponse = await fetch("https://oauth.zalo.me/v2.0/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: ZALO_APP_SECRET,
      },
      body: new URLSearchParams({
        app_id: ZALO_APP_ID,
        code: code as string,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to fetch Zalo token");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || "";
    const expiresIn = Number(tokenData.expires_in || 3600);

    // Retrieve Zalo User Profile
    const profileResponse = await fetch("https://graph.zalo.me/v2.0/me?fields=id,name,picture", {
      headers: { access_token: accessToken },
    });
    const profileData = await profileResponse.json();
    if (profileData.error) {
      throw new Error(profileData.message || "Failed to fetch Zalo profile");
    }

    const zaloUserId = profileData.id;
    const name = profileData.name;
    const avatar = profileData.picture?.data?.url || "";

    // Generate or link session for Admin/Owner portal
    const currentUser = c.get("user");
    let ownerId = currentUser?.id;
    if (!ownerId && state && state !== "login") {
      ownerId = state;
    }

    if (ownerId) {
      await saveZaloConnection({
        owner_id: ownerId,
        connection_type: "USER",
        zalo_user_id: zaloUserId,
        access_token_encrypted: encryptToken(accessToken),
        refresh_token_encrypted: encryptToken(refreshToken),
        access_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        status: "ACTIVE",
      });
    }

    const clientRedirectUrl = `${process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3001"}/owner/settings?tab=zalo&zalo_login_success=true&name=${encodeURIComponent(name)}&zalo_id=${zaloUserId}`;
    return c.redirect(clientRedirectUrl);

  } catch (err: any) {
    console.error("Zalo Login OAuth exchange failed:", err);
    return c.json({ error: `Đăng nhập Zalo thất bại: ${err.message}` }, 500);
  }
});

// POST /zalo/auth/zalo/disconnect - Hủy liên kết đăng nhập Zalo
zaloRoutes.post("/auth/zalo/disconnect", requireAuth, async (c) => {
  const user = c.get("user");
  await deleteZaloConnection(user.id, "USER");

  // Auditing
  console.info(JSON.stringify({
    audit_event: "ZALO_DISCONNECT_SUCCESS",
    user_id: user.id,
    timestamp: new Date().toISOString(),
  }));

  return c.json({ ok: true, message: "Đã hủy liên kết đăng nhập Zalo." });
});

// -------------------------------------------------------------
// 2. ZALO OFFICIAL ACCOUNT (KẾT NỐI OA & ĐỒNG BỘ TEMPLATES)
// -------------------------------------------------------------

// GET /zalo/integrations/zalo-oa/connect - Khởi chạy liên kết Zalo OA
zaloRoutes.get("/integrations/zalo-oa/connect", async (c) => {
  let userId: string | null = null;

  // Try to get token from query param or Auth header
  let token = c.req.query("token");
  if (!token) {
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (token) {
    const appJwt = await verifyAccessToken(token);
    if (appJwt) {
      userId = appJwt.sub;
    }
  }

  // Fallback to checking logged-in user in context if middleware is ever used
  if (!userId) {
    const user = c.get("user");
    if (user) userId = user.id;
  }

  if (!userId) {
    return c.json({ error: "Unauthorized. Token is missing or invalid." }, 401);
  }

  const baseUrl = getBaseUrl(c);
  const redirectUri = `${baseUrl}/api/integrations/zalo-oa/callback`;

  const oauthUrl = `https://oauth.zalo.me/v2.0/oa/auth?app_id=${ZALO_APP_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${userId}`;
  return c.redirect(oauthUrl);
});

// GET /zalo/integrations/zalo-oa/callback - Callback nhận mã Token kết nối OA
zaloRoutes.get("/integrations/zalo-oa/callback", async (c) => {
  const code = c.req.query("code");
  const ownerId = c.req.query("state");

  if (!code || !ownerId) {
    return c.json({ error: "Code or owner state parameters are missing" }, 400);
  }

  try {
    // Exchange OA Code for Access & Refresh Tokens
    const tokenResponse = await fetch("https://oauth.zalo.me/v2.0/oa/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: ZALO_APP_SECRET,
      },
      body: new URLSearchParams({
        app_id: ZALO_APP_ID,
        code: code as string,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to exchange OA Zalo code");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || "";
    const expiresIn = Number(tokenData.expires_in || 3600);

    // Fetch OA Profile Information
    const oaResponse = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", {
      headers: { access_token: accessToken },
    });
    const oaData = await oaResponse.json();
    if (oaData.error !== 0) {
      throw new Error(oaData.message || "Failed to fetch OA Profile details");
    }

    const oaId = oaData.data?.oa_id;
    const oaName = oaData.data?.name;
    const oaAvatar = oaData.data?.avatar;

    // Encrypt tokens and save OA connection to DB
    await saveZaloConnection({
      owner_id: ownerId,
      connection_type: "OA",
      oa_id: oaId,
      oa_name: oaName,
      oa_avatar: oaAvatar,
      access_token_encrypted: encryptToken(accessToken),
      refresh_token_encrypted: encryptToken(refreshToken),
      access_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      status: "ACTIVE",
    });

    // Automatically import/sync templates
    await syncActiveOATemplates(ownerId, oaId);

    // Redirect client back to settings with success parameter
    const clientRedirectUrl = `${process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3001"}/owner/settings?tab=zalo&zalo_oa_success=true&oa_name=${encodeURIComponent(oaName)}`;
    return c.redirect(clientRedirectUrl);

  } catch (err: any) {
    console.error("Zalo OA OAuth callback failure:", err);
    return c.json({ error: `Kết nối Zalo OA thất bại: ${err.message}` }, 500);
  }
});

// GET /zalo/integrations/zalo-oa/status - Lấy trạng thái kết nối & danh sách templates & logs
zaloRoutes.get("/integrations/zalo-oa/status", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");

  const [zaloUserConn, zaloOAConn] = await Promise.all([
    getZaloConnection(user.id, "USER"),
    getZaloConnection(user.id, "OA"),
  ]);

  let templates: any[] = [];
  if (zaloOAConn && zaloOAConn.oa_id) {
    templates = await getActiveTemplates(user.id, zaloOAConn.oa_id);
  }

  // Fetch real Connection / Message Event logs for settings auditing
  const { data: dbLogs } = await db
    .from("invoice_zalo_notifications")
    .select("id, invoice_id, phone_number, template_id, send_status, error_message, sent_at, created_at, invoices(payment_code)")
    .eq("invoices.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const logs = dbLogs || [];

  return c.json({
    connectedUser: zaloUserConn
      ? {
          zaloUserId: zaloUserConn.zalo_user_id,
          status: zaloUserConn.status,
        }
      : null,
    connectedOA: zaloOAConn
      ? {
          oaId: zaloOAConn.oa_id,
          oaName: zaloOAConn.oa_name,
          oaAvatar: zaloOAConn.oa_avatar,
          status: zaloOAConn.status,
          expiresAt: zaloOAConn.access_token_expires_at,
        }
      : null,
    templates,
    logs: logs.map((log: any) => ({
      id: log.id,
      invoiceId: log.invoice_id,
      phone: log.phone_number,
      template: log.template_id,
      status: log.send_status,
      error: log.error_message,
      sentAt: log.sent_at || log.created_at,
      paymentCode: log.invoices?.payment_code || "N/A",
    })),
  });
});

// POST /zalo/integrations/zalo-oa/disconnect - Ngắt kết nối Zalo OA
zaloRoutes.post("/integrations/zalo-oa/disconnect", requireAuth, async (c) => {
  const user = c.get("user");
  await deleteZaloConnection(user.id, "OA");

  return c.json({ ok: true, message: "Đã ngắt kết nối Zalo Official Account thành công." });
});

// -------------------------------------------------------------
// 3. INVOICE MESSAGING (GỬI TIN NHẮN HÓA ĐƠN TRỌ)
// -------------------------------------------------------------

// Helper to construct invoice Zalo template message payload
async function constructInvoicePayload(db: any, invoiceId: string, user: any) {
  // Query invoice, room, contract, tenant details
  const invoice = await db.from("invoices").select("*").eq("id", invoiceId).eq("user_id", user.id).single();
  if (invoice.error || !invoice.data) throw new Error("Invoice not found");

  const inv = invoice.data;

  // Confirming invoice state check: must NOT be draft
  if (inv.status === "draft") {
    throw new Error("Không thể gửi hóa đơn ở trạng thái bản thảo (Draft). Vui lòng chốt hóa đơn trước.");
  }

  const [itemsRes, roomRes, contractRes] = await Promise.all([
    db.from("invoice_items").select("*").eq("invoice_id", invoiceId).eq("user_id", user.id),
    db.from("rooms").select("*").eq("id", inv.room_id).eq("user_id", user.id).maybeSingle(),
    db.from("contracts").select("*").eq("id", inv.contract_id).eq("user_id", user.id).maybeSingle(),
  ]);

  const contract = contractRes.data;
  if (!contract) throw new Error("Contract not found for invoice");

  const tenantRes = await db.from("tenants").select("*").eq("id", contract.tenant_id).eq("user_id", user.id).maybeSingle();
  const tenant = tenantRes.data;
  if (!tenant) throw new Error("Tenant not found for contract");

  const items = itemsRes.data || [];

  // Calculate electric and water service amounts
  const electricItem = items.find((i: any) => i.name.toLowerCase().includes("dien") || i.name.toLowerCase().includes("electric"));
  const waterItem = items.find((i: any) => i.name.toLowerCase().includes("nuoc") || i.name.toLowerCase().includes("water"));
  const otherItems = items.filter((i: any) => i.id !== electricItem?.id && i.id !== waterItem?.id);

  const electricAmount = electricItem ? Number(electricItem.amount || 0) : 0;
  const waterAmount = waterItem ? Number(waterItem.amount || 0) : 0;
  const serviceAmount = otherItems.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);

  const billingPeriod = `Tháng ${inv.month}/${inv.year}`;
  const dueDate = inv.due_date || new Date(inv.year, inv.month - 1, 5).toISOString().split("T")[0];

  // Dynamic invoice URL
  const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3001";
  const invoiceUrl = `${clientUrl}/public/invoices/${invoiceId}/receipt`;

  return {
    invoice: inv,
    tenant,
    payload: {
      customer_name: tenant.name || "Khách thuê",
      room_name: roomRes.data?.name || "N/A",
      billing_period: billingPeriod,
      room_amount: String(inv.room_fee || 0),
      electric_amount: String(electricAmount),
      water_amount: String(waterAmount),
      service_amount: String(serviceAmount),
      total_amount: String(inv.total_amount || 0),
      due_date: dueDate,
      invoice_url: invoiceUrl,
    },
  };
}

// POST /zalo/invoices/:invoiceId/send-zalo - Gửi tin nhắn hóa đơn đơn lẻ
zaloRoutes.post("/invoices/:invoiceId/send-zalo", requireAuth, async (c) => {
  const user = c.get("user");
  const invoiceId = c.req.param("invoiceId");
  const parsed = await c.req.json().catch(() => ({}));
  const body = sendZaloSchema.safeParse(parsed);
  if (!body.success) return c.json({ error: "Dữ liệu điện thoại không hợp lệ." }, 400);

  const db = c.get("supabase");

  try {
    const { invoice, tenant, payload } = await constructInvoicePayload(db, invoiceId, user);

    // Determine target phone number
    let targetPhone = body.data.phoneNumber || tenant.phone;
    if (!targetPhone) {
      return c.json({ code: "MISSING_PHONE_NUMBER", message: "Khách thuê chưa cấu hình số điện thoại." }, 400);
    }

    // Save phone number to tenant profile if dynamic phone was supplied and tenant phone was missing
    if (body.data.phoneNumber && !tenant.phone) {
      await db.from("tenants").update({ phone: body.data.phoneNumber }).eq("id", tenant.id);
    }

    const oaConn = await getZaloConnection(user.id, "OA");
    if (!oaConn || !oaConn.oa_id) {
      return c.json({ error: "Zalo Official Account chưa kết nối. Vui lòng kết nối trong Cài đặt." }, 400);
    }

    // Insert pending sending log into DB
    const logData: ZaloNotificationLog = {
      invoice_id: invoiceId,
      tenant_id: tenant.id,
      phone_number: targetPhone,
      template_id: "zbs_invoice_v1",
      message_payload: payload,
      send_status: "PENDING",
      retry_count: 0,
    };

    const { data: insertedLog, error: logErr } = await db
      .from("invoice_zalo_notifications")
      .insert(logData)
      .select("id")
      .single();
    if (logErr) throw new Error(`Lỗi tạo lịch sử gửi tin: ${logErr.message}`);
    const logId = insertedLog.id;

    // Send the notification message
    const sendResult = await sendZBSNotification(logData, user.id);

    if (sendResult.success) {
      // Update database status
      await db
        .from("invoice_zalo_notifications")
        .update({
          send_status: "SENT",
          zalo_message_id: sendResult.msgId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logId);

      return c.json({ success: true, message: "Đã gửi thông báo hóa đơn qua Zalo thành công!" });
    } else {
      // Update error status
      await db
        .from("invoice_zalo_notifications")
        .update({
          send_status: "FAILED",
          error_code: sendResult.errCode,
          error_message: sendResult.errMsg,
        })
        .eq("id", logId);

      return c.json({
        success: false,
        error: `Gửi Zalo thất bại (${sendResult.errCode}): ${sendResult.errMsg}`,
      }, 400);
    }

  } catch (err: any) {
    console.error("Single Zalo invoice sending error:", err);
    return c.json({ error: err.message || "Gửi hóa đơn thất bại." }, 500);
  }
});

// POST /zalo/invoices/:invoiceId/resend-zalo - Gửi lại hóa đơn Zalo (Retry)
zaloRoutes.post("/invoices/:invoiceId/resend-zalo", requireAuth, async (c) => {
  const user = c.get("user");
  const invoiceId = c.req.param("invoiceId");
  const db = c.get("supabase");

  try {
    const { invoice, tenant, payload } = await constructInvoicePayload(db, invoiceId, user);

    const targetPhone = tenant.phone;
    if (!targetPhone) {
      return c.json({ code: "MISSING_PHONE_NUMBER", message: "Khách thuê chưa cấu hình số điện thoại." }, 400);
    }

    const oaConn = await getZaloConnection(user.id, "OA");
    if (!oaConn || !oaConn.oa_id) {
      return c.json({ error: "Zalo Official Account chưa kết nối." }, 400);
    }

    // Get previous notification log to increment retry count
    const { data: prevLog } = await db
      .from("invoice_zalo_notifications")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const retryCount = prevLog ? (prevLog.retry_count || 0) + 1 : 1;

    const logData: ZaloNotificationLog = {
      invoice_id: invoiceId,
      tenant_id: tenant.id,
      phone_number: targetPhone,
      template_id: "zbs_invoice_v1",
      message_payload: payload,
      send_status: "PENDING",
      retry_count: retryCount,
    };

    const { data: insertedLog, error: logErr } = await db
      .from("invoice_zalo_notifications")
      .insert(logData)
      .select("id")
      .single();
    if (logErr) throw new Error(`Lỗi tạo lịch sử gửi tin: ${logErr.message}`);
    const logId = insertedLog.id;

    const sendResult = await sendZBSNotification(logData, user.id);

    if (sendResult.success) {
      await db
        .from("invoice_zalo_notifications")
        .update({
          send_status: "SENT",
          zalo_message_id: sendResult.msgId,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logId);
      return c.json({ success: true, message: "Đã gửi lại hóa đơn Zalo thành công!" });
    } else {
      await db
        .from("invoice_zalo_notifications")
        .update({
          send_status: "FAILED",
          error_code: sendResult.errCode,
          error_message: sendResult.errMsg,
        })
        .eq("id", logId);
      return c.json({
        success: false,
        error: `Gửi lại Zalo thất bại (${sendResult.errCode}): ${sendResult.errMsg}`,
      }, 400);
    }

  } catch (err: any) {
    return c.json({ error: err.message || "Gửi lại thất bại." }, 500);
  }
});

// POST /zalo/invoices/send-zalo-bulk - Gửi hàng loạt hóa đơn qua Zalo (Hỗ trợ fault-tolerance)
zaloRoutes.post("/invoices/send-zalo-bulk", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = await c.req.json().catch(() => ({}));
  const body = bulkSendZaloSchema.safeParse(parsed);
  if (!body.success) return c.json({ error: "Danh sách hóa đơn hoặc số điện thoại không hợp lệ." }, 400);

  const { invoiceIds, phonesMap = {} } = body.data;
  const db = c.get("supabase");

  const oaConn = await getZaloConnection(user.id, "OA");
  if (!oaConn || !oaConn.oa_id) {
    return c.json({ error: "Zalo Official Account chưa kết nối. Không thể gửi hàng loạt." }, 400);
  }

  const successList: string[] = [];
  const failedList: Array<{ invoiceId: string; error: string }> = [];

  // Parallel/sequential batch processing with fault tolerance: if one fails, it does not stop the others
  for (const invId of invoiceIds) {
    try {
      const { invoice, tenant, payload } = await constructInvoicePayload(db, invId, user);

      const targetPhone = phonesMap[invId] || tenant.phone;
      if (!targetPhone) {
        failedList.push({ invoiceId: invId, error: "Chưa cấu hình số điện thoại khách thuê." });
        continue;
      }

      // Update tenant phone dynamically if provided
      if (phonesMap[invId] && !tenant.phone) {
        await db.from("tenants").update({ phone: phonesMap[invId] }).eq("id", tenant.id);
      }

      const logData: ZaloNotificationLog = {
        invoice_id: invId,
        tenant_id: tenant.id,
        phone_number: targetPhone,
        template_id: "zbs_invoice_v1",
        message_payload: payload,
        send_status: "PENDING",
        retry_count: 0,
      };

      const { data: insertedLog, error: logErr } = await db
        .from("invoice_zalo_notifications")
        .insert(logData)
        .select("id")
        .single();
      if (logErr) throw new Error(`Lỗi tạo lịch sử gửi tin: ${logErr.message}`);
      const logId = insertedLog.id;

      const sendResult = await sendZBSNotification(logData, user.id);

      if (sendResult.success) {
        await db
          .from("invoice_zalo_notifications")
          .update({
            send_status: "SENT",
            zalo_message_id: sendResult.msgId,
            sent_at: new Date().toISOString(),
          })
          .eq("id", logId);
        successList.push(invId);
      } else {
        await db
          .from("invoice_zalo_notifications")
          .update({
            send_status: "FAILED",
            error_code: sendResult.errCode,
            error_message: sendResult.errMsg,
          })
          .eq("id", logId);
        failedList.push({
          invoiceId: invId,
          error: `Gửi Zalo thất bại (${sendResult.errCode}): ${sendResult.errMsg}`,
        });
      }
    } catch (err: any) {
      failedList.push({ invoiceId: invId, error: err.message || "Lỗi xử lý hóa đơn." });
    }
  }

  return c.json({
    success: true,
    totalSent: invoiceIds.length,
    successCount: successList.length,
    failedCount: failedList.length,
    successList,
    failedList,
  });
});

// GET /zalo/invoices/:invoiceId/zalo-history - Lấy lịch sử gửi tin của hóa đơn cụ thể
zaloRoutes.get("/invoices/:invoiceId/zalo-history", requireAuth, async (c) => {
  const user = c.get("user");
  const invoiceId = c.req.param("invoiceId");
  const db = c.get("supabase");

  const { data, error } = await db
    .from("invoice_zalo_notifications")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data || [] });
});

export default zaloRoutes;
