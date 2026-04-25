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

export default adminRoutes;