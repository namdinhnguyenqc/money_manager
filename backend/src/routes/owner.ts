import { Hono } from "hono";
import { z } from "zod";

import { requireAuth, requireOwner, clearAuthCacheForUser } from "../middleware/auth.js";
import { cacheMiddleware, invalidateCache } from "../middleware/cache.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../lib/supabase.js";
import Tesseract from "tesseract.js";
import sharp from "sharp";

import { isRolePremium, limitsFromRole, getRoleId } from "../lib/roles.js";

/**
 * Resolve the plan limits for the given user.
 *
 * Single query: users JOIN roles — no hardcoded UUIDs, no two-step lookup.
 * NULL limit columns in the roles table = unlimited (Infinity).
 */
async function getPlanLimits(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("max_boarding_houses, max_rooms_per_house, roles(name, max_boarding_houses, max_rooms_per_house)")
    .eq("id", userId)
    .single();

  const role = (data as any)?.roles ?? null;
  const user = data as any;

  const maxBoardingHouses = user?.max_boarding_houses !== null && user?.max_boarding_houses !== undefined
    ? user.max_boarding_houses
    : (role?.max_boarding_houses ?? Infinity);

  const maxRoomsPerHouse = user?.max_rooms_per_house !== null && user?.max_rooms_per_house !== undefined
    ? user.max_rooms_per_house
    : (role?.max_rooms_per_house ?? Infinity);

  return {
    roleName: role?.name ?? "USER",
    isPremium: isRolePremium(role?.name),
    limits: {
      maxBoardingHouses,
      maxRoomsPerHouse,
    },
  };
}


const ownerRoutes = new Hono<AppEnv>();

ownerRoutes.use("*", requireAuth, requireOwner);

// ============================================================
// DASHBOARD BULK ENDPOINT (PHASE 4)
// ============================================================
ownerRoutes.get("/dashboard-init", async (c) => {
  const currentUser = c.get("user");
  const supabase = c.get("supabase");

  // Parallel Supabase queries for performance
  const eighteenMonthsAgo = new Date();
  eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 17, 1);
  eighteenMonthsAgo.setHours(0, 0, 0, 0);

  const [bhRes, roomsRes, walletsRes, settingsRes, transactionsRes, invoicesRes, depositsRes] = await Promise.all([
    supabase.from("boarding_houses").select(`
      id, name, address, status, created_at,
      rooms(id, status)
    `).eq("owner_id", currentUser.id),
    supabase.from("rooms").select("id, name, price, status, num_people, has_ac").eq("user_id", currentUser.id),
    supabase.from("wallets").select("*").eq("user_id", currentUser.id),
    supabase.from("users").select("id, status, is_profile_completed").eq("id", currentUser.id).single(),
    supabase
      .from("transactions")
      .select("id, type, amount, description, date, wallet_id, category_id, invoice_id")
      .eq("user_id", currentUser.id)
      .gte("date", eighteenMonthsAgo.toISOString().slice(0, 10))
      .order("date", { ascending: false })
      .limit(800),
    supabase
      .from("invoices")
      .select(`
        id, room_id, contract_id, month, year, room_fee, total_amount, paid_amount, status,
        elec_old, elec_new, water_old, water_new, created_at,
        items:invoice_items(id, name, amount, quantity, unit_price)
      `)
      .eq("user_id", currentUser.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(600),
    supabase
      .from("deposits")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  return c.json({
    boardingHouses: bhRes.data || [],
    rooms: roomsRes.data || [],
    wallets: walletsRes.data || [],
    transactions: transactionsRes.data || [],
    invoices: invoicesRes.data || [],
    deposits: depositsRes.data || [],
    tradingStats: null,
    settings: settingsRes.data || {}
  });
});

const boardingHouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

const updateBoardingHouseSchema = boardingHouseSchema.partial();

const roomSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  area: z.number().nonnegative().optional(),
  maxPeople: z.number().int().positive().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).default("AVAILABLE"),
});

const updateRoomSchema = roomSchema.partial();

const mapRentalStatusToOwner = (status?: string) => {
  if (status === "occupied") return "OCCUPIED";
  if (status === "maintenance") return "MAINTENANCE";
  return "AVAILABLE";
};

const mapOwnerStatusToRental = (status?: string) => {
  if (status === "OCCUPIED") return "occupied";
  if (status === "MAINTENANCE") return "maintenance";
  return "vacant";
};

ownerRoutes.get("/boarding-houses", cacheMiddleware(30), async (c) => {
  const currentUser = c.get("user");
  const { page = "1", limit = "20", status = "" } = c.req.query();

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = c
    .get("supabase")
    .from("boarding_houses")
    .select("*, rooms(id, status)", { count: "exact" })
    .eq("owner_id", currentUser.id);

  if (status) {
    query = query.eq("status", status);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching boarding houses:", error);
    return c.json({ error: "Failed to fetch boarding houses" }, 500);
  }

  return c.json({
    data: data?.map((bh) => {
      const rooms = Array.isArray(bh.rooms) ? bh.rooms : [];
      const countByStatus = (statuses: string[]) => rooms.filter((room: any) => {
        const statusValue = String(room.status || "").toLowerCase();
        return statuses.includes(statusValue);
      }).length;

      return {
        id: bh.id,
        name: bh.name,
        address: bh.address,
        description: bh.description,
        latitude: bh.latitude,
        longitude: bh.longitude,
        status: bh.status,
        ownerId: bh.owner_id,
        createdAt: bh.created_at,
        room_count: rooms.length,
        roomCount: rooms.length,
        vacant_count: countByStatus(["vacant", "available"]),
        vacantCount: countByStatus(["vacant", "available"]),
        occupied_count: countByStatus(["occupied", "occupied_soon"]),
        occupiedCount: countByStatus(["occupied", "occupied_soon"]),
        maintenance_count: countByStatus(["maintenance"]),
        maintenanceCount: countByStatus(["maintenance"]),
        reserved_count: countByStatus(["reserved"]),
        reservedCount: countByStatus(["reserved"]),
      };
    }),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
    },
  });
});

ownerRoutes.get("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");

  const { data, error } = await c
    .get("supabase")
    .from("boarding_houses")
    .select("*")
    .eq("id", bhId)
    .eq("owner_id", currentUser.id)
    .single();

  if (error || !data) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  return c.json({
    id: data.id,
    name: data.name,
    address: data.address,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  });
});

ownerRoutes.post("/boarding-houses", async (c) => {
  const currentUser = c.get("user");
  const parsed = await c.req.json();

  const validation = boardingHouseSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  // ── Plan limit check ───────────────────────────────────────
  const { roleName, limits } = await getPlanLimits(currentUser.id);
  if (limits.maxBoardingHouses !== Infinity) {
    const { count } = await c
      .get("supabase")
      .from("boarding_houses")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", currentUser.id);

    if ((count ?? 0) >= limits.maxBoardingHouses) {
      return c.json(
        {
          error: `Tài khoản của bạn (gói ${roleName.replace("OWNER_", "")}) chỉ cho phép tối đa ${limits.maxBoardingHouses} nhà trọ. Vui lòng nâng cấp để mở rộng giới hạn.`,
          code: "PLAN_LIMIT_REACHED",
          limit: limits.maxBoardingHouses,
          current: count,
          upgrade_required: true,
        },
        403,
      );
    }
  }
  // ──────────────────────────────────────────────────────────

  const { name, address, description, latitude, longitude, status } =
    validation.data;

  const { data: bh, error } = await c
    .get("supabase")
    .from("boarding_houses")
    .insert({
      name,
      address,
      description,
      latitude,
      longitude,
      status,
      owner_id: currentUser.id,
    })
    .select()
    .single();

  invalidateCache("/owner/boarding-houses", currentUser.id);
  invalidateCache("/owner/dashboard-init", currentUser.id);

  if (error) {
    console.error("Error creating boarding house:", error);
    return c.json({ error: "Failed to create boarding house" }, 500);
  }

  return c.json(
    {
      id: bh.id,
      name: bh.name,
      address: bh.address,
      description: bh.description,
      latitude: bh.latitude,
      longitude: bh.longitude,
      status: bh.status,
      ownerId: bh.owner_id,
      createdAt: bh.created_at,
    },
    201,
  );
});

ownerRoutes.patch("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const parsed = await c.req.json();

  const validation = updateBoardingHouseSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  const existing = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!existing.data || existing.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await c
    .get("supabase")
    .from("boarding_houses")
    .update(updateData)
    .eq("id", bhId)
    .select()
    .single();

  if (error) {
    console.error("Error updating boarding house:", error);
    return c.json({ error: "Failed to update boarding house" }, 500);
  }

  return c.json({
    id: data.id,
    name: data.name,
    address: data.address,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  });
});

ownerRoutes.delete("/boarding-houses/:id", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");

  const existing = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!existing.data || existing.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }



  const { error } = await c
    .get("supabase")
    .from("boarding_houses")
    .delete()
    .eq("id", bhId);

  if (error) {
    console.error("Error deleting boarding house:", error);
    return c.json({ error: "Failed to delete boarding house" }, 500);
  }

  return c.json({ success: true });
});

ownerRoutes.get("/boarding-houses/:id/rooms", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const { status = "" } = c.req.query();

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  let query = c
    .get("supabase")
    .from("rooms")
    .select("*")
    .eq("boarding_house_id", bhId);

  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching rooms:", error);
    return c.json({ error: "Failed to fetch rooms" }, 500);
  }

  return c.json({
    data: data?.map((r) => ({
      id: r.id,
      name: r.name,
      boardingHouseId: r.boarding_house_id,
      price: r.price,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
});

ownerRoutes.post("/boarding-houses/:id/rooms", async (c) => {
  const currentUser = c.get("user");
  const bhId = c.req.param("id");
  const parsed = await c.req.json();

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", bhId)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Boarding house not found or access denied" }, 404);
  }

  const validation = roomSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  // ── Plan limit check ───────────────────────────────────────
  const { roleName, limits } = await getPlanLimits(currentUser.id);
  if (limits.maxRoomsPerHouse !== Infinity) {
    const { count } = await c
      .get("supabase")
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("boarding_house_id", bhId)
      .eq("user_id", currentUser.id);

    if ((count ?? 0) >= limits.maxRoomsPerHouse) {
      return c.json(
        {
          error: `Tài khoản của bạn (gói ${roleName.replace("OWNER_", "")}) chỉ cho phép tối đa ${limits.maxRoomsPerHouse} phòng trên mỗi nhà trọ. Vui lòng nâng cấp để mở rộng giới hạn.`,
          code: "PLAN_LIMIT_REACHED",
          limit: limits.maxRoomsPerHouse,
          current: count,
          upgrade_required: true,
        },
        403,
      );
    }
  }
  // ──────────────────────────────────────────────────────────

  const { name, price, status } = validation.data;

  const { data: room, error } = await c
    .get("supabase")
    .from("rooms")
    .insert({
      user_id: currentUser.id,
      name,
      boarding_house_id: bhId,
      price,
      area: 0,
      max_people: 1,
      status,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating room:", error);
    return c.json({ error: "Failed to create room" }, 500);
  }

  invalidateCache("/owner/boarding-houses", currentUser.id);
  invalidateCache("/owner/dashboard-init", currentUser.id);

  return c.json(
    {
      id: room.id,
      name: room.name,
      boardingHouseId: room.boarding_house_id,
      price: room.price,
      area: room.area,
      maxPeople: room.max_people,
      status: room.status,
      createdAt: room.created_at,
    },
    201,
  );
});

ownerRoutes.patch("/rooms/:id", async (c) => {
  const currentUser = c.get("user");
  const roomId = c.req.param("id");
  const parsed = await c.req.json();

  const roomCheck = await c
    .get("supabase")
    .from("rooms")
    .select("boarding_house_id")
    .eq("id", roomId)
    .single();

  if (!roomCheck.data) {
    return c.json({ error: "Room not found" }, 404);
  }

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", roomCheck.data.boarding_house_id)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }

  const validation = updateRoomSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json(
      { error: "Invalid data", details: validation.error.issues },
      400,
    );
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await c
    .get("supabase")
    .from("rooms")
    .update(updateData)
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    console.error("Error updating room:", error);
    return c.json({ error: "Failed to update room" }, 500);
  }

  invalidateCache("/owner/boarding-houses", currentUser.id);
  invalidateCache("/owner/dashboard-init", currentUser.id);

  return c.json({
    id: data.id,
    name: data.name,
    boardingHouseId: data.boarding_house_id,
    price: data.price,
    status: data.status,
    createdAt: data.created_at,
  });
});

ownerRoutes.delete("/rooms/:id", async (c) => {
  const currentUser = c.get("user");
  const roomId = c.req.param("id");

  const roomCheck = await c
    .get("supabase")
    .from("rooms")
    .select("boarding_house_id")
    .eq("id", roomId)
    .single();

  if (!roomCheck.data) {
    return c.json({ error: "Room not found" }, 404);
  }

  const bhCheck = await c
    .get("supabase")
    .from("boarding_houses")
    .select("owner_id")
    .eq("id", roomCheck.data.boarding_house_id)
    .single();

  if (!bhCheck.data || bhCheck.data.owner_id !== currentUser.id) {
    return c.json({ error: "Access denied" }, 403);
  }



  const { error } = await c
    .get("supabase")
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (error) {
    console.error("Error deleting room:", error);
    return c.json({ error: "Failed to delete room" }, 500);
  }

  invalidateCache("/owner/boarding-houses", currentUser.id);
  invalidateCache("/owner/dashboard-init", currentUser.id);

  return c.json({ success: true });
});

ownerRoutes.get("/notifications", async (c) => {
  const currentUser = c.get("user");
  const { data, error } = await supabaseAdmin
    .from("rental_notifications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch owner notifications:", error.message);
    return c.json({ error: "Failed to fetch notifications" }, 500);
  }
  const rows = (data ?? []).map((item: any) => ({
    id: item.id,
    eventType: item.event_type,
    title: item.payload?.title ?? item.event_type,
    body: item.payload?.body ?? "",
    readAt: item.read_at,
    createdAt: item.created_at,
    payload: item.payload,
  }));

  return c.json({
    data: rows,
    unreadCount: rows.filter((item) => !item.readAt).length,
  });
});

ownerRoutes.post("/notifications/:id/read", async (c) => {
  const currentUser = c.get("user");
  const notificationId = c.req.param("id");

  const { data, error } = await supabaseAdmin
    .from("rental_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", currentUser.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to mark owner notification as read:", error.message);
    return c.json({ error: "Failed to mark notification as read" }, 500);
  }
  return c.json({ data });
});


ownerRoutes.get("/audit-logs", async (c) => {
  const currentUser = c.get("user");
  const { data, error } = await c
    .get("supabase")
    .from("rental_audit_logs")
    .select("*")
    .eq("actor_user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return c.json({ error: "Failed to fetch audit logs" }, 500);
  return c.json({
    data: (data ?? []).map((item: any) => ({
      id: String(item.id),
      actor: currentUser.email ?? currentUser.id,
      action: item.action,
      resourceType: item.resource_type,
      resourceId: item.resource_id,
      createdAt: item.created_at,
    })),
  });
});

ownerRoutes.get("/sepay/events", async (c) => {
  const currentUser = c.get("user");
  const db = c.get("supabase");

  // Get user's invoices to retrieve their payment codes
  const { data: userInvoices } = await db
    .from("invoices")
    .select("payment_code")
    .eq("user_id", currentUser.id);

  const paymentCodes = (userInvoices || [])
    .map((inv: any) => inv.payment_code)
    .filter(Boolean);

  let query = db.from("sepay_webhook_events").select("*");
  if (paymentCodes.length > 0) {
    query = query.or(`user_id.eq.${currentUser.id},payment_code.in.(${paymentCodes.map(code => `"${code}"`).join(",")})`);
  } else {
    query = query.eq("user_id", currentUser.id);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

ownerRoutes.post("/sepay/events/:id/reprocess", async (c) => {
  const user = c.get("user");
  const eventId = c.req.param("id");
  const db = c.get("supabase");

  const { data: event, error: evErr } = await db
    .from("sepay_webhook_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !event) return c.json({ error: "Không tìm thấy sự kiện." }, 404);

  // Find invoice first
  const invoiceRes = await db.from("invoices").select("*").eq("payment_code", event.payment_code).maybeSingle();
  const invoice = invoiceRes.data;

  // Verify ownership:
  // If event has user_id, it must match user.id
  // If event doesn't have user_id, the matched invoice must exist and belong to user.id
  if (event.user_id) {
    if (event.user_id !== user.id) {
      return c.json({ error: "Bạn không có quyền xử lý sự kiện này." }, 403);
    }
  } else {
    if (!invoice || invoice.user_id !== user.id) {
      return c.json({ error: "Bạn không có quyền xử lý sự kiện này hoặc không tìm thấy hóa đơn khớp mã thanh toán." }, 403);
    }
  }

  if (!["pending_wallet", "unmatched", "error"].includes(event.status)) {
    return c.json({ error: "Sự kiện này không ở trạng thái cần thử lại." }, 400);
  }

  if (!invoice) {
    return c.json({ error: "Không tìm thấy hóa đơn khớp mã thanh toán. Vui lòng kiểm tra lại mã thanh toán trong nội dung chuyển khoản." }, 404);
  }

  // Find channel (shared resolver keeps webhook + reprocess in sync)
  const { resolveSepayChannel } = await import("../services/sepayReconcile.js");
  const channel = await resolveSepayChannel(db, { invoice, accountNumber: event.account_number });

  if (!channel) {
    return c.json({ error: "Kênh thanh toán chưa được gán ví hoặc tài khoản ngân hàng chưa được cấu hình. Vui lòng kiểm tra lại thiết lập SePay." }, 400);
  }

  const { applyInvoicePayment } = await import("../services/invoicePayments.js");
  const roomRes = await db.from("rooms").select("name").eq("id", invoice.room_id).eq("user_id", user.id).maybeSingle();

  const paymentRes = await applyInvoicePayment(db, {
    invoice,
    amount: event.transfer_amount,
    walletId: String(channel.wallet_id),
    source: "sepay",
    date: event.raw_payload?.transactionDate || event.raw_payload?.transaction_date || null,
    externalRef: event.sepay_transaction_id,
    roomName: roomRes.data?.name || null,
    metadata: {
      sepay_transaction_id: event.sepay_transaction_id,
      sepay_reference_code: event.raw_payload?.referenceCode || event.raw_payload?.reference_code || null,
      account_number: event.account_number || null,
      gateway: event.raw_payload?.gateway || null,
      content: event.raw_payload?.content || null,
    },
  });

  if (paymentRes.error || !paymentRes.data) {
    await db.from("sepay_webhook_events").update({
      status: "error",
      error_message: paymentRes.error || "Thử lại thất bại",
      user_id: user.id, // Update user_id since we now matched it
      invoice_id: invoice.id,
      payment_channel_id: channel.id,
    }).eq("id", eventId);
    return c.json({ error: paymentRes.error || "Thử lại thất bại" }, 400);
  }

  const newStatus = paymentRes.data.overpaidAmount > 0 ? "overpaid" : paymentRes.data.status;
  await db.from("sepay_webhook_events").update({
    status: newStatus,
    transaction_id: paymentRes.data.transaction.id,
    payment_channel_id: channel.id,
    invoice_id: invoice.id,
    user_id: user.id, // Update user_id since we now matched it
    allocated_amount: paymentRes.data.allocatedAmount,
    overpaid_amount: paymentRes.data.overpaidAmount,
    error_message: null,
  }).eq("id", eventId);

  return c.json({ ok: true, status: newStatus });
});


ownerRoutes.get("/settings", async (c) => {
  const user = c.get("user");

  const { data, error } = await c
    .get("supabase")
    .from("system_settings")
    .select("*")
    .neq("key", "app_secret");
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ data: data ?? [] });
});

ownerRoutes.post("/settings", async (c) => {
  const user = c.get("user");

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (!body.settings || !Array.isArray(body.settings)) {
    return c.json({ error: "Invalid settings format" }, 400);
  }

  const upsertData = body.settings.map((s: any) => ({
    user_id: user.id,
    key: s.key,
    value: s.value,
    type: s.type,
    category: s.category,
  }));

  const { error } = await c
    .get("supabase")
    .from("system_settings")
    .upsert(upsertData, { onConflict: "user_id, category, key" });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

ownerRoutes.get("/permissions", async (c) => {
  const user = c.get("user");

  // Single join query fetching user's role, role permissions, and user override permissions
  const { data: dbUser, error: userError } = await supabaseAdmin
    .from("users")
    .select(`
      role_id,
      roles (
        id,
        role_permissions (
          permission_key
        )
      ),
      user_permissions (
        permission_key
      )
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (userError || !dbUser) {
    return c.json({ permissions: [] });
  }

  let rolePermissions: any[] = (dbUser.roles as any)?.role_permissions || [];

  // Fallback if role_id or roles is missing (edge case)
  if (!dbUser.role_id || !dbUser.roles) {
    const { data: fallbackRole } = await supabaseAdmin
      .from("roles")
      .select(`
        id,
        role_permissions (
          permission_key
        )
      `)
      .or("name.eq.OWNER_BASIC,name.eq.OWNER")
      .limit(1)
      .maybeSingle();
    
    if (fallbackRole) {
      rolePermissions = (fallbackRole as any).role_permissions || [];
    }
  }

  const roleKeys = rolePermissions.map((p: any) => p.permission_key);
  const userKeys = (dbUser.user_permissions || []).map((p: any) => p.permission_key);

  const combinedKeys = Array.from(new Set([...roleKeys, ...userKeys]));

  return c.json({ permissions: combinedKeys });
});

ownerRoutes.post("/simulate-upgrade", async (c) => {
  const currentUser = c.get("user");
  const { plan } = await c.req.json().catch(() => ({}));

  const targetRoleId = plan === "premium"
    ? await getRoleId("OWNER_PREMIUM")
    : await getRoleId("OWNER_BASIC");

  const planValue = plan === "premium" ? "plan:premium" : "plan:basic";

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      role_id: targetRoleId,
      admin_note: planValue,
      updated_at: new Date().toISOString()
    })
    .eq("id", currentUser.id);

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  // Clear auth caches so permissions are re-fetched correctly
  if (typeof clearAuthCacheForUser === "function") {
    clearAuthCacheForUser(currentUser.id);
  }

  return c.json({ success: true, plan: planValue });
});

ownerRoutes.post("/ocr-cccd", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    if (!file) return c.json({ error: "No file uploaded" }, 400);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Preprocess image with sharp for optimal OCR accuracy
    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(buffer)
        .resize({ width: 1500, withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .toBuffer();
    } catch (sharpErr) {
      console.warn("Sharp preprocessing failed, falling back to original buffer:", sharpErr);
      processedBuffer = buffer;
    }

    // Run OCR locally using server-side tesseract.js
    const result = await Tesseract.recognize(
      processedBuffer,
      'eng+vie',
      { logger: (m) => console.log(m) }
    );

    const text = result.data.text;
    console.log("Server OCR raw text:", text);

    // Clean text lines
    const cleanText = text.replace(/\r/g, "");
    
    // 1. Extract 12-digit CCCD (No boundary constraints)
    const cccdMatch = cleanText.match(/\d{12}/);
    const cccd = cccdMatch ? cccdMatch[0] : "";

    // 2. Extract Full name in upper case (Vietnamese names support)
    const lines = cleanText.split("\n").map((l: string) => l.trim());
    let fullName = "";
    
    // Look for names after keywords
    const lowerText = cleanText.toLowerCase();
    const nameKeywords = ["full name", "khai sinh", "họ và tên", "họ tên", "khal sinh"];
    
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      const hasKeyword = nameKeywords.some(kw => lineLower.includes(kw));
      if (hasKeyword) {
        // Search next 4 lines
        for (let j = i + 1; j <= i + 4 && j < lines.length; j++) {
          const candidate = lines[j];
          const cleanCandidate = candidate.replace(/[^A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỴỶỸ\s]/g, "").trim();
          if (cleanCandidate.length > 5 && cleanCandidate === cleanCandidate.toUpperCase() && 
              !cleanCandidate.includes("CỘNG HÒA") && !cleanCandidate.includes("ĐỘC LẬP") && !cleanCandidate.includes("VIỆT NAM") &&
              !cleanCandidate.includes("CĂN CƯỚC") && !cleanCandidate.includes("CAN CƯỚC") && !cleanCandidate.includes("IDENTITY")) {
            fullName = cleanCandidate;
            break;
          }
        }
      }
      if (fullName) break;
    }

    // Fallback: search all lines for any pure uppercase line
    if (!fullName) {
      for (const line of lines) {
        const cleanLine = line.replace(/[^A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲÝỴỶỸ\s]/g, "").trim();
        if (cleanLine.length > 5 && cleanLine === cleanLine.toUpperCase() && 
            !cleanLine.includes("CỘNG HÒA") && !cleanLine.includes("ĐỘC LẬP") && !cleanLine.includes("VIỆT NAM") && 
            !cleanLine.includes("CĂN CƯỚC") && !cleanLine.includes("CỤC TRƯỞNG") && !cleanLine.includes("SOCIALIST") &&
            !cleanLine.includes("IDENTITY")) {
          fullName = cleanLine;
          break;
        }
      }
    }

    // Clean stray single letter at the beginning (OCR artifact e.g. "E NGUYEN...")
    if (fullName) {
      fullName = fullName.replace(/^[A-Z]\s+/, "").trim();
    }

    // 3. Extract Address (Address patterns)
    const addrKeywords = ["thường trú", "thường trú:", "nơi cư trú", "quê quán", "nơi đăng ký hộ khẩu", "nơi thường trú"];
    let address = "";
    for (const kw of addrKeywords) {
      const idx = lowerText.indexOf(kw);
      if (idx !== -1) {
        const subStr = cleanText.substring(idx + kw.length, idx + kw.length + 150);
        const subLines = subStr.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 2);
        if (subLines.length > 0) {
          address = subLines.slice(0, 2).join(", ").replace(/[:,\s]+$/, "").trim();
          break;
        }
      }
    }

    return c.json({
      success: true,
      name: fullName,
      cccd: cccd,
      address: address
    });
  } catch (err: any) {
    console.error("OCR error:", err);
    return c.json({ error: err.message || "Failed to process image" }, 500);
  }
});

export default ownerRoutes;
