import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireAdmin, requireSuperAdmin } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";

const adminRoutes = new Hono<AppEnv>();

const userStatusSchema = z.object({
  status: z.enum(["ACTIVE", "BLOCKED", "DELETED"]),
});

const userRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

// GET /admin/users - List all users with pagination
adminRoutes.get("/users", requireAuth, requireAdmin, async (c) => {
  if (env.IS_MOCK) {
    return c.json({
      data: [
        { id: "mock-google-user", email: "user@gmail.com", name: "Mock User", avatar: null, role: "USER", status: "ACTIVE", provider: "GOOGLE", created_at: new Date().toISOString(), last_login_at: new Date().toISOString() },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    });
  }

  const { page = "1", limit = "20", search = "", role = "", status = "ACTIVE", sortBy = "created_at", sortOrder = "desc" } = c.req.query();

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = supabaseAdmin.from("users").select("*", { count: "exact" });

  if (search) {
    query = query.ilike("email", `%${search}%`);
  }
  if (role) {
    query = query.eq("role", role);
  }
  if (status) {
    query = query.eq("status", status);
  }

  query = query
    .order(sortBy || "created_at", { ascending: sortOrder === "asc" })
    .range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }

  return c.json({
    data: data?.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      status: u.status,
      provider: u.provider,
      created_at: u.created_at,
      last_login_at: u.last_login_at,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
    },
  });
});

// GET /admin/users/:id - Get user detail with login logs
adminRoutes.get("/users/:id", requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param("id");

  if (env.IS_MOCK) {
    return c.json({
      id: userId,
      email: "user@gmail.com",
      name: "Mock User",
      avatar: null,
      role: "USER",
      status: "ACTIVE",
      provider: "GOOGLE",
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      loginLogs: [],
    });
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return c.json({ error: "User not found" }, 404);
  }

  const { data: loginLogs } = await supabaseAdmin
    .from("login_logs")
    .select("login_at, success, ip_address, device_info")
    .eq("user_id", userId)
    .order("login_at", { ascending: false })
    .limit(20);

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    status: user.status,
    provider: user.provider,
    created_at: user.created_at,
    last_login_at: user.last_login_at,
    loginLogs: loginLogs || [],
  });
});

// PATCH /admin/users/:id/status - Update user status
adminRoutes.patch("/users/:id/status", requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param("id");
  const currentUser = c.get("user");

  if (currentUser.id === userId) {
    return c.json({ code: "CANNOT_BLOCK_SELF", message: "Không thể tự khóa tài khoản của mình." }, 400);
  }

  const parsed = await c.req.json();
  const validation = userStatusSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Invalid status value" }, 400);
  }

  const { status } = validation.data;

  const { data: targetUser, error: findError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (findError || !targetUser) {
    return c.json({ error: "User not found" }, 404);
  }

  if (targetUser.role === "SUPER_ADMIN" && currentUser.role !== "SUPER_ADMIN") {
    return c.json({ code: "INSUFFICIENT_PERMISSION", message: "Không đủ quyền để thay đổi trạng thái của SUPER_ADMIN." }, 403);
  }

  await supabaseAdmin
    .from("users")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", userId);

  return c.json({ success: true, user: { id: userId, status } });
});

// PATCH /admin/users/:id/role - Update user role
adminRoutes.patch("/users/:id/role", requireAuth, requireSuperAdmin, async (c) => {
  const userId = c.req.param("id");

  const parsed = await c.req.json();
  const validation = userRoleSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Invalid role value" }, 400);
  }

  const { role } = validation.data;

  const { data: targetUser, error: findError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (findError || !targetUser) {
    return c.json({ error: "User not found" }, 404);
  }

  if (targetUser.role === "SUPER_ADMIN") {
    return c.json({ code: "INSUFFICIENT_PERMISSION", message: "Không thể thay đổi role của SUPER_ADMIN." }, 403);
  }

  await supabaseAdmin
    .from("users")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  return c.json({ success: true, user: { id: userId, role } });
});

// DELETE /admin/users/:id - Soft delete user
adminRoutes.delete("/users/:id", requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param("id");
  const currentUser = c.get("user");

  if (currentUser.id === userId) {
    return c.json({ code: "CANNOT_DELETE_SELF", message: "Không thể tự xóa tài khoản của mình." }, 400);
  }

  const { data: targetUser, error: findError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (findError || !targetUser) {
    return c.json({ error: "User not found" }, 404);
  }

  if (targetUser.role === "SUPER_ADMIN") {
    return c.json({ code: "INSUFFICIENT_PERMISSION", message: "Không thể xóa SUPER_ADMIN." }, 403);
  }

  if (targetUser.role === "ADMIN" && currentUser.role !== "SUPER_ADMIN") {
    return c.json({ code: "INSUFFICIENT_PERMISSION", message: "Chỉ SUPER_ADMIN mới có thể xóa ADMIN." }, 403);
  }

  await supabaseAdmin
    .from("users")
    .update({ status: "DELETED", updated_at: new Date().toISOString() })
    .eq("id", userId);

  return c.json({ success: true });
});

// GET /admin/stats - Dashboard stats
adminRoutes.get("/stats", requireAuth, requireAdmin, async (c) => {
  if (env.IS_MOCK) {
    return c.json({ total: 1, active: 1, blocked: 0, newThisMonth: 1, loginsThisMonth: 1 });
  }

  const { data: allUsers } = await supabaseAdmin.from("users").select("id, status, role, created_at");
  const { data: recentLogins } = await supabaseAdmin
    .from("login_logs")
    .select("login_at, success")
    .order("login_at", { ascending: false })
    .limit(100);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const total = allUsers?.length || 0;
  const active = allUsers?.filter((u) => u.status === "ACTIVE").length || 0;
  const blocked = allUsers?.filter((u) => u.status === "BLOCKED").length || 0;
  const newThisMonth = allUsers?.filter((u) => u.created_at && new Date(u.created_at) >= thirtyDaysAgo).length || 0;

  const loginsThisMonth = recentLogins?.filter(
    (l) => l.login_at && new Date(l.login_at) >= thirtyDaysAgo && l.success
  ).length || 0;

  return c.json({
    total,
    active,
    blocked,
    newThisMonth,
    loginsThisMonth,
  });
});

// GET /admin/boarding-houses - List all boarding houses with pagination
adminRoutes.get("/boarding-houses", requireAuth, requireAdmin, async (c) => {
  if (env.IS_MOCK) {
    return c.json({
      data: [
        { id: "mock-bh-1", name: "Mock Boarding House 1", address: "123 Main St", status: "ACTIVE", isPublic: true, ownerId: "mock-user-1", created_at: new Date().toISOString() },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    });
  }

  const { page = "1", limit = "20", search = "", status = "", isPublic = "", ownerId = "" } = c.req.query();

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = supabaseAdmin.from("boarding_houses").select("*", { count: "exact" });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (isPublic !== "") {
    query = query.eq("is_public", isPublic === "true");
  }
  if (ownerId) {
    query = query.eq("owner_id", ownerId);
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
    data: data?.map((bh) => ({
      id: bh.id,
      name: bh.name,
      address: bh.address,
      description: bh.description,
      latitude: bh.latitude,
      longitude: bh.longitude,
      status: bh.status,
      isPublic: bh.is_public,
      ownerId: bh.owner_id,
      createdAt: bh.created_at,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
    },
  });
});

// GET /admin/boarding-houses/:id - Get boarding house detail
adminRoutes.get("/boarding-houses/:id", requireAuth, requireAdmin, async (c) => {
  const bhId = c.req.param("id");

  if (env.IS_MOCK) {
    return c.json({
      id: bhId,
      name: "Mock Boarding House",
      address: "123 Main St",
      description: "Mock description",
      latitude: 10.8231,
      longitude: 106.6297,
      status: "ACTIVE",
      isPublic: true,
      ownerId: "mock-user-1",
      createdAt: new Date().toISOString(),
    });
  }

  const { data, error } = await supabaseAdmin
    .from("boarding_houses")
    .select("*")
    .eq("id", bhId)
    .single();

  if (error || !data) {
    return c.json({ error: "Boarding house not found" }, 404);
  }

  return c.json({
    id: data.id,
    name: data.name,
    address: data.address,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    isPublic: data.is_public,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  });
});

// POST /admin/boarding-houses - Create boarding house
adminRoutes.post("/boarding-houses", requireAuth, requireAdmin, async (c) => {
  const parsed = await c.req.json();

  const createSchema = z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    description: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    isPublic: z.boolean().default(false),
    ownerId: z.string().optional(),
  });

  const validation = createSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Invalid data", details: validation.error.issues }, 400);
  }

  const { name, address, description, latitude, longitude, status, isPublic, ownerId } = validation.data;

  const { data: bh, error } = await supabaseAdmin
    .from("boarding_houses")
    .insert({
      name,
      address,
      description,
      latitude,
      longitude,
      status,
      is_public: isPublic,
      owner_id: ownerId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating boarding house:", error);
    return c.json({ error: "Failed to create boarding house" }, 500);
  }

  return c.json({
    id: bh.id,
    name: bh.name,
    address: bh.address,
    description: bh.description,
    latitude: bh.latitude,
    longitude: bh.longitude,
    status: bh.status,
    isPublic: bh.is_public,
    ownerId: bh.owner_id,
    createdAt: bh.created_at,
  }, 201);
});

// PATCH /admin/boarding-houses/:id - Update boarding house
adminRoutes.patch("/boarding-houses/:id", requireAuth, requireAdmin, async (c) => {
  const bhId = c.req.param("id");
  const parsed = await c.req.json();

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    address: z.string().optional(),
    description: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    isPublic: z.boolean().optional(),
    ownerId: z.string().optional(),
  });

  const validation = updateSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Invalid data", details: validation.error.issues }, 400);
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  if (validation.data.ownerId !== undefined) {
    updateData.owner_id = validation.data.ownerId;
    delete updateData.ownerId;
  }
  if (validation.data.isPublic !== undefined) {
    updateData.is_public = validation.data.isPublic;
    delete updateData.isPublic;
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
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
    isPublic: data.is_public,
    ownerId: data.owner_id,
    createdAt: data.created_at,
  });
});

// DELETE /admin/boarding-houses/:id - Delete boarding house
adminRoutes.delete("/boarding-houses/:id", requireAuth, requireAdmin, async (c) => {
  const bhId = c.req.param("id");

  const { error } = await supabaseAdmin
    .from("boarding_houses")
    .delete()
    .eq("id", bhId);

  if (error) {
    console.error("Error deleting boarding house:", error);
    return c.json({ error: "Failed to delete boarding house" }, 500);
  }

  return c.json({ success: true });
});

// GET /admin/rooms - List all rooms with pagination
adminRoutes.get("/rooms", requireAuth, requireAdmin, async (c) => {
  if (env.IS_MOCK) {
    return c.json({
      data: [
        { id: "mock-room-1", name: "Room 101", boardingHouseId: "mock-bh-1", price: 1500000, status: "AVAILABLE", isPublic: true, created_at: new Date().toISOString() },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    });
  }

  const { page = "1", limit = "20", search = "", status = "", isPublic = "", boardingHouseId = "" } = c.req.query();

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  let query = supabaseAdmin.from("rooms").select("*", { count: "exact" });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (isPublic !== "") {
    query = query.eq("is_public", isPublic === "true");
  }
  if (boardingHouseId) {
    query = query.eq("boarding_house_id", boardingHouseId);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

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
      isPublic: r.is_public,
      createdAt: r.created_at,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
    },
  });
});

// GET /admin/rooms/:id - Get room detail
adminRoutes.get("/rooms/:id", requireAuth, requireAdmin, async (c) => {
  const roomId = c.req.param("id");

  if (env.IS_MOCK) {
    return c.json({
      id: roomId,
      name: "Mock Room",
      boardingHouseId: "mock-bh-1",
      price: 1500000,
      status: "AVAILABLE",
      isPublic: true,
      createdAt: new Date().toISOString(),
    });
  }

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (error || !data) {
    return c.json({ error: "Room not found" }, 404);
  }

  return c.json({
    id: data.id,
    name: data.name,
    boardingHouseId: data.boarding_house_id,
    price: data.price,
    status: data.status,
    isPublic: data.is_public,
    createdAt: data.created_at,
  });
});

// POST /admin/rooms - Create room
adminRoutes.post("/rooms", requireAuth, requireAdmin, async (c) => {
  const parsed = await c.req.json();

  const createSchema = z.object({
    name: z.string().min(1),
    boardingHouseId: z.string().uuid(),
    price: z.number().min(0),
    status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).default("AVAILABLE"),
    isPublic: z.boolean().default(false),
  });

  const validation = createSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Invalid data", details: validation.error.issues }, 400);
  }

  const { name, boardingHouseId, price, status, isPublic } = validation.data;

  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .insert({
      name,
      boarding_house_id: boardingHouseId,
      price,
      status,
      is_public: isPublic,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating room:", error);
    return c.json({ error: "Failed to create room" }, 500);
  }

  return c.json({
    id: room.id,
    name: room.name,
    boardingHouseId: room.boarding_house_id,
    price: room.price,
    status: room.status,
    isPublic: room.is_public,
    createdAt: room.created_at,
  }, 201);
});

// PATCH /admin/rooms/:id - Update room
adminRoutes.patch("/rooms/:id", requireAuth, requireAdmin, async (c) => {
  const roomId = c.req.param("id");
  const parsed = await c.req.json();

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    boardingHouseId: z.string().uuid().optional(),
    price: z.number().min(0).optional(),
    status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).optional(),
    isPublic: z.boolean().optional(),
  });

  const validation = updateSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Invalid data", details: validation.error.issues }, 400);
  }

  const updateData: Record<string, unknown> = { ...validation.data };
  if (validation.data.boardingHouseId !== undefined) {
    updateData.boarding_house_id = validation.data.boardingHouseId;
    delete updateData.boardingHouseId;
  }
  if (validation.data.isPublic !== undefined) {
    updateData.is_public = validation.data.isPublic;
    delete updateData.isPublic;
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .update(updateData)
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    console.error("Error updating room:", error);
    return c.json({ error: "Failed to update room" }, 500);
  }

  return c.json({
    id: data.id,
    name: data.name,
    boardingHouseId: data.boarding_house_id,
    price: data.price,
    status: data.status,
    isPublic: data.is_public,
    createdAt: data.created_at,
  });
});

// DELETE /admin/rooms/:id - Delete room
adminRoutes.delete("/rooms/:id", requireAuth, requireAdmin, async (c) => {
  const roomId = c.req.param("id");

  const { error } = await supabaseAdmin
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (error) {
    console.error("Error deleting room:", error);
    return c.json({ error: "Failed to delete room" }, 500);
  }

  return c.json({ success: true });
});

export default adminRoutes;