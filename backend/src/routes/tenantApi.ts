import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireTenant } from "../middleware/auth.js";
import { registerFcmToken, unregisterFcmToken } from "../services/firebaseService.js";
import { parseJson, toId } from "../utils/validation.js";
import type { AppEnv } from "../types.js";

const tenantApiRoutes = new Hono<AppEnv>();

// Protect all routes under this file
tenantApiRoutes.use("*", requireAuth, requireTenant);

// ─────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────
const transactionSchema = z.object({
  categoryId: z.string().nullable().optional(),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  description: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày yyyy-mm-dd"),
  source: z.string().optional().default("manual"),
});

const categorySchema = z.object({
  name: z.string().min(1, "Tên danh mục không được để trống"),
  type: z.enum(["income", "expense"]),
  icon: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Mã màu Hex không hợp lệ").nullable().optional(),
});

const registerFcmSchema = z.object({
  token: z.string().min(10, "Token không hợp lệ"),
  deviceType: z.enum(["ios", "android", "web"]),
  deviceName: z.string().optional(),
});

// ─────────────────────────────────────────────────────────
// Profile & Room Info
// ─────────────────────────────────────────────────────────
tenantApiRoutes.get("/me", async (c) => {
  const user = c.get("user");

  try {
    // Fetch tenant account, tenants profile, active contract, room, and boarding house in a single optimized query
    const { data: tenantAccount, error: taError } = await supabaseAdmin
      .from("tenant_accounts")
      .select(`
        linked_at,
        tenants (
          id,
          name,
          phone,
          id_card,
          address,
          contracts (
            id,
            start_date,
            end_date,
            deposit,
            rent_amount,
            status,
            applied_services_snapshot,
            rooms (
              id,
              name,
              price,
              has_ac,
              boarding_houses (
                id,
                name,
                address
              )
            )
          )
        )
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (taError) return c.json({ error: taError.message }, 500);
    if (!tenantAccount || !tenantAccount.tenants) {
      return c.json({ error: "Không tìm thấy hồ sơ người thuê liên kết." }, 404);
    }

    const tenant = tenantAccount.tenants as any;
    
    // Extract the active contract — prefer the one with highest rent_amount if multiple exist
    const activeContracts = (tenant.contracts || []).filter((ctr: any) => ctr.status === "active");
    const activeContract = activeContracts.sort((a: any, b: any) => 
      Number(b.rent_amount || 0) - Number(a.rent_amount || 0)
    )[0] || null;

    return c.json({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        name: tenant.name,
        phone: tenant.phone || user.phone,
        idCard: tenant.id_card,
        address: tenant.address,
        linkedAt: tenantAccount.linked_at,
        activeContractsCount: activeContracts.length,
        contract: activeContract ? {
          id: activeContract.id,
          startDate: activeContract.start_date,
          endDate: activeContract.end_date,
          deposit: activeContract.deposit,
          rentAmount: activeContract.rent_amount,
          status: activeContract.status,
          appliedServices: activeContract.applied_services_snapshot,
          room: activeContract.rooms ? {
            id: activeContract.rooms.id,
            name: activeContract.rooms.name,
            price: activeContract.rooms.price,
            hasAc: activeContract.rooms.has_ac,
            boardingHouse: activeContract.rooms.boarding_houses ? {
              id: activeContract.rooms.boarding_houses.id,
              name: activeContract.rooms.boarding_houses.name,
              address: activeContract.rooms.boarding_houses.address,
            } : null,
          } : null,
        } : null,
      },
    });
  } catch (err: any) {
    console.error("[/tenant/me] Error:", err.message, err);
    return c.json({ error: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// Dashboard Info
// ─────────────────────────────────────────────────────────
tenantApiRoutes.get("/dashboard", async (c) => {
  const user = c.get("user");

  try {
    // Get tenant account first
    const { data: tenantAccount } = await supabaseAdmin
      .from("tenant_accounts")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tenantAccount) {
      return c.json({ error: "Renter profile not linked." }, 404);
    }

    const tenantId = tenantAccount.tenant_id;

    // 1. Fetch ALL active contracts for tenant
    const { data: allContracts } = await supabaseAdmin
      .from("contracts")
      .select("id, room_id, rent_amount")
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    let unpaidInvoiceCount = 0;
    let unpaidInvoiceAmount = 0;
    let latestInvoice = null;

    if (allContracts && allContracts.length > 0) {
      const allContractIds = allContracts.map((c) => c.id);

      // Fetch all unpaid invoices across all contracts
      const { data: unpaidInvoices } = await supabaseAdmin
        .from("invoices")
        .select("id, total_amount, paid_amount, month, year, contract_id")
        .in("contract_id", allContractIds)
        .neq("status", "paid");

      if (unpaidInvoices) {
        unpaidInvoiceCount = unpaidInvoices.length;
        unpaidInvoiceAmount = unpaidInvoices.reduce(
          (sum, inv) => sum + (Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)),
          0
        );
      }

      // Fetch latest invoice across all contracts (for dashboard preview)
      const { data: latest } = await supabaseAdmin
        .from("invoices")
        .select("*, rooms(name)")
        .in("contract_id", allContractIds)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      latestInvoice = latest || null;
    }

    // 2. Fetch current month personal expenses
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

    const { data: txs } = await supabaseAdmin
      .from("tenant_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", startOfMonthStr);

    const monthlyPersonalExpense = txs ? txs.reduce((sum, t) => sum + Number(t.amount || 0), 0) : 0;

    return c.json({
      data: {
        unpaidInvoiceCount,
        unpaidInvoiceAmount,
        monthlyPersonalExpense,
        latestInvoice,
        activeContractsCount: allContracts?.length || 0,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// Invoices List & Details
// ─────────────────────────────────────────────────────────
tenantApiRoutes.get("/invoices", async (c) => {
  const user = c.get("user");

  try {
    const { data: tenantAccount } = await supabaseAdmin
      .from("tenant_accounts")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tenantAccount) return c.json({ data: [] });

    const { data: invoices, error } = await supabaseAdmin
      .from("invoices")
      .select(`
        id, month, year, status, total_amount, paid_amount,
        room_fee, previous_debt,
        payment_code, payment_channel_id, due_date,
        elec_old, elec_new, water_old, water_new,
        created_at, updated_at, contract_id,
        contracts!inner ( tenant_id ),
        rooms ( id, name, boarding_houses ( name, address ) ),
        invoice_items ( id, name, amount, quantity, unit_price )
      `)
      .eq("contracts.tenant_id", tenantAccount.tenant_id)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) return c.json({ error: error.message }, 500);

    return c.json({ data: invoices || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

tenantApiRoutes.get("/invoices/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "ID hóa đơn không hợp lệ" }, 400);

  try {
    const { data: tenantAccount } = await supabaseAdmin
      .from("tenant_accounts")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tenantAccount) return c.json({ error: "Access denied" }, 403);

    const { data: invoice, error } = await supabaseAdmin
      .from("invoices")
      .select("*, rooms(*, boarding_houses(*)), contracts(*, tenants(*))")
      .eq("id", id)
      .single();

    if (error || !invoice) return c.json({ error: "Không tìm thấy hóa đơn." }, 404);

    // Verify tenant owns this contract
    if (invoice.contracts.tenant_id !== tenantAccount.tenant_id) {
      return c.json({ error: "Unauthorized access to invoice" }, 403);
    }

    // Fetch invoice items
    const { data: items } = await supabaseAdmin
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id);

    // Fetch payment channel details
    let paymentChannel = null;
    if (invoice.payment_channel_id) {
      const { data: pc } = await supabaseAdmin
        .from("payment_channels")
        .select("*")
        .eq("id", invoice.payment_channel_id)
        .maybeSingle();
      paymentChannel = pc || null;
    }

    return c.json({
      data: {
        ...invoice,
        items: items || [],
        paymentChannel,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// Utility readings (Điện, nước)
// ─────────────────────────────────────────────────────────
tenantApiRoutes.get("/utilities", async (c) => {
  const user = c.get("user");

  try {
    const { data: tenantAccount } = await supabaseAdmin
      .from("tenant_accounts")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tenantAccount) return c.json({ data: [] });

    const { data: contracts } = await supabaseAdmin
      .from("contracts")
      .select("id")
      .eq("tenant_id", tenantAccount.tenant_id);

    if (!contracts || contracts.length === 0) return c.json({ data: [] });
    const contractIds = contracts.map((c) => c.id);

    // Fetch invoices to get readings history
    const { data: invoices, error } = await supabaseAdmin
      .from("invoices")
      .select("id, month, year, elec_old, elec_new, water_old, water_new, rooms(name)")
      .in("contract_id", contractIds)
      .order("year", { ascending: true })
      .order("month", { ascending: true });

    if (error) return c.json({ error: error.message }, 500);

    return c.json({ data: invoices || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// Personal Finance: Transactions CRUD
// ─────────────────────────────────────────────────────────
tenantApiRoutes.get("/transactions", async (c) => {
  const user = c.get("user");
  const limit = Number(c.req.query("limit") || 50);

  try {
    const { data, error } = await supabaseAdmin
      .from("tenant_transactions")
      .select("*, tenant_categories(name, icon, color)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

tenantApiRoutes.post("/transactions", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, transactionSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("tenant_transactions")
      .insert({
        user_id: user.id,
        category_id: parsed.data.categoryId || null,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description || null,
        date: parsed.data.date,
        source: parsed.data.source,
      })
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

tenantApiRoutes.patch("/transactions/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Giao dịch không hợp lệ" }, 400);

  const parsed = await parseJson(c, transactionSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("tenant_transactions")
      .update({
        category_id: parsed.data.categoryId || null,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description || null,
        date: parsed.data.date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 400);
    if (!data) return c.json({ error: "Không tìm thấy giao dịch hoặc không có quyền." }, 404);

    return c.json({ data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

tenantApiRoutes.delete("/transactions/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Giao dịch không hợp lệ" }, 400);

  try {
    const { data, error } = await supabaseAdmin
      .from("tenant_transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error) return c.json({ error: error.message }, 400);
    if (!data) return c.json({ error: "Giao dịch không tồn tại hoặc không có quyền." }, 404);

    return c.json({ success: true, message: "Đã xóa giao dịch thành công." });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// Personal Finance: Categories CRUD
// ─────────────────────────────────────────────────────────
tenantApiRoutes.get("/categories", async (c) => {
  const user = c.get("user");

  try {
    // Get both user custom categories AND system presets (where user_id is the zero UUID or current user)
    const systemUuid = "00000000-0000-0000-0000-000000000000";
    const { data, error } = await supabaseAdmin
      .from("tenant_categories")
      .select("*")
      .or(`user_id.eq.${user.id},user_id.eq.${systemUuid}`)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

tenantApiRoutes.post("/categories", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, categorySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("tenant_categories")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        type: parsed.data.type,
        icon: parsed.data.icon || null,
        color: parsed.data.color || null,
        is_system: false,
      })
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 400);
    return c.json({ data }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

tenantApiRoutes.patch("/categories/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Danh mục không hợp lệ" }, 400);

  const parsed = await parseJson(c, categorySchema);
  if (!parsed.ok) return parsed.response;

  try {
    // Only allow updating custom categories, not system ones
    const { data, error } = await supabaseAdmin
      .from("tenant_categories")
      .update({
        name: parsed.data.name,
        type: parsed.data.type,
        icon: parsed.data.icon || null,
        color: parsed.data.color || null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_system", false)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 400);
    if (!data) return c.json({ error: "Không tìm thấy danh mục tùy chỉnh hoặc không có quyền." }, 404);

    return c.json({ data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

tenantApiRoutes.delete("/categories/:id", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "Danh mục không hợp lệ" }, 400);

  try {
    // Soft delete or hard delete custom category
    const { data, error } = await supabaseAdmin
      .from("tenant_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_system", false)
      .select()
      .maybeSingle();

    if (error) return c.json({ error: error.message }, 400);
    if (!data) return c.json({ error: "Danh mục không tồn tại hoặc không thể xóa danh mục hệ thống." }, 404);

    return c.json({ success: true, message: "Đã xóa danh mục thành công." });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// In-app Notifications List
// ─────────────────────────────────────────────────────────
tenantApiRoutes.get("/notifications", async (c) => {
  const user = c.get("user");
  const limit = Number(c.req.query("limit") || 50);

  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ data: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

tenantApiRoutes.post("/notifications/read-all", async (c) => {
  const user = c.get("user");

  try {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, message: "Đã đánh dấu đọc tất cả thông báo." });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

tenantApiRoutes.patch("/notifications/:id/read", async (c) => {
  const user = c.get("user");
  const id = toId(c.req.param("id"));
  if (!id) return c.json({ error: "ID thông báo không hợp lệ" }, 400);

  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error) return c.json({ error: error.message }, 400);
    if (!data) return c.json({ error: "Không tìm thấy thông báo hoặc không có quyền." }, 404);

    return c.json({ data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// Firebase Push Token Registration
// ─────────────────────────────────────────────────────────
tenantApiRoutes.post("/fcm/register", async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, registerFcmSchema);
  if (!parsed.ok) return parsed.response;

  const result = await registerFcmToken(
    user.id,
    parsed.data.token,
    parsed.data.deviceType,
    parsed.data.deviceName,
    "tenant"
  );

  if (!result.success) {
    return c.json({ error: result.error || "Không thể đăng ký thiết bị nhận thông báo" }, 400);
  }

  return c.json({ success: true, message: "Đăng ký thiết bị nhận thông báo thành công." });
});

tenantApiRoutes.delete("/fcm/unregister", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const token = body?.token;

  if (!token) {
    return c.json({ error: "Thiếu token để hủy đăng ký" }, 400);
  }

  const result = await unregisterFcmToken(user.id, token);

  if (!result.success) {
    return c.json({ error: result.error || "Không thể hủy đăng ký thiết bị" }, 400);
  }

  return c.json({ success: true, message: "Hủy đăng ký nhận thông báo thành công." });
});

export default tenantApiRoutes;
