import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { clearAuthCacheForUser, requireAuth, requireAdmin, requireAdminPermission, requireSuperAdmin } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";

const adminRoutes = new Hono<AppEnv>();



const userStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING_APPROVAL", "REJECTED", "BLOCKED", "DELETED"]),
});

const ownerApprovalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().optional(),
});

const userRoleSchema = z.object({
  role: z.enum(["USER", "OWNER", "ADMIN"]),
});

const reasonSchema = z.object({
  reason: z.string().trim().min(1, "Reason is required"),
});

const listParams = (c: any) => {
  const page = Math.max(parseInt(c.req.query("page") || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "20", 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const toPagination = (page: number, limit: number, total = 0) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const jsonDbError = (c: any, error: any, fallback: string, status = 500) => {
  console.error(fallback, error);
  return c.json({ error: fallback, detail: error?.message, code: error?.code }, status);
};

const getAdminDisplayStatus = (user: any) => {
  const hasCompletedProfile =
    user?.is_profile_completed === true ||
    user?.onboarding_step === "PENDING_APPROVAL" ||
    user?.onboarding_step === "DONE";

  if (user?.role === "OWNER" && hasCompletedProfile && user?.onboarding_step !== "DONE") {
    return "PENDING_APPROVAL";
  }

  return user?.status || "ACTIVE";
};

const withAdminDisplayStatus = (user: any) => ({
  ...user,
  raw_status: user?.status,
  status: getAdminDisplayStatus(user),
  approvalStatus: getAdminDisplayStatus(user),
});

const deleteUserScopedRows = async (table: string, column: string, userId: string) => {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, userId);
  if (!error) return null;
  if (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code)) return null;
  if (String(error.message || "").includes("schema cache")) return null;
  return { table, column, error };
};

const purgeUserData = async (userId: string) => {
  const errors: Array<{ table: string; column: string; error: any }> = [];
  const run = async (table: string, column = "user_id") => {
    const err = await deleteUserScopedRows(table, column, userId);
    if (err) errors.push(err);
  };

  // Child/detail rows first. Many tables have FK cascades, but explicit deletes
  // keep this route compatible with older schemas that missed ON DELETE CASCADE.
  const orderedDeletes: Array<[string, string?]> = [
    ["zalo_notification_logs", "owner_id"],
    ["zalo_templates", "owner_id"],
    ["zalo_connections", "owner_id"],
    ["payment_webhook_events"],
    ["payment_channels"],
    ["deposit_refunds"],
    ["invoice_payments"],
    ["invoice_items"],
    ["meter_readings"],
    ["contract_services"],
    ["deposits"],
    ["invoices"],
    ["contracts"],
    ["tenant_accounts"],
    ["tenant_sessions"],
    ["tenant_notifications"],
    ["tenant_devices"],
    ["tenants"],
    ["services"],
    ["rooms"],
    ["room_types"],
    ["boarding_houses", "owner_id"],
    ["rental_messages"],
    ["rental_conversations"],
    ["rental_bookings"],
    ["rental_leads"],
    ["rental_utility_readings"],
    ["rental_utility_meters"],
    ["rental_room_amenities"],
    ["rental_rooms"],
    ["rental_buildings", "owner_id"],
    ["trading_items"],
    ["trading_categories"],
    ["transactions"],
    ["categories"],
    ["wallets"],
    ["bank_configs"],
    ["social_accounts"],
    ["user_profiles"],
    ["refresh_tokens"],
    ["login_logs"],
    ["fcm_tokens"],
    ["notifications"],
  ];

  for (const [table, column] of orderedDeletes) {
    await run(table, column || "user_id");
  }

  return errors;
};

const getMissingSchemaColumn = (error: any) => {
  const message = String(error?.message || "");
  if (!message.includes("schema cache")) return null;
  return message.match(/'([^']+)' column/)?.[1] || null;
};

const isMissingSchemaTable = (error: any, table: string) => {
  const message = String(error?.message || "");
  return message.includes("schema cache") && message.includes(`'public.${table}'`);
};

const updateRowWithSchemaFallback = async (
  table: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<{
  data: any;
  error: any;
  omitted: string[];
  appliedKeys: string[];
}> => {
  const nextPayload = { ...payload };
  const omitted: string[] = [];

  while (Object.keys(nextPayload).length > 0) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .update(nextPayload)
      .eq("id", id)
      .select("*")
      .single();

    if (!error) {
      return { data, error: null, omitted, appliedKeys: Object.keys(nextPayload) };
    }

    const column = getMissingSchemaColumn(error);
    if (!column || !(column in nextPayload)) {
      return { data, error, omitted, appliedKeys: Object.keys(nextPayload) };
    }

    omitted.push(column);
    delete nextPayload[column];
  }

  return {
    data: null,
    error: { message: "No compatible columns remain for this database schema", code: "ADMIN_SCHEMA_INCOMPLETE" },
    omitted,
    appliedKeys: [],
  };
};

const getActor = (c: any) => c.get("user");

const writeAudit = async (
  c: any,
  input: {
    action: string;
    resourceType: string;
    resourceId?: string | null;
    module?: string;
    objectType?: string;
    beforeValue?: unknown;
    afterValue?: unknown;
    reason?: string | null;
    riskLevel?: "low" | "medium" | "high" | "critical";
  }
) => {
  const actor = getActor(c);
  const payload: Record<string, unknown> = {
    user_id: actor?.id,
    actor_id: actor?.id,
    actor_name: actor?.name || actor?.email || null,
    actor_role: actor?.role || null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId || null,
    module: input.module || input.resourceType,
    object_type: input.objectType || input.resourceType,
    object_id: input.resourceId || null,
    before_value: input.beforeValue ?? null,
    after_value: input.afterValue ?? null,
    reason: input.reason || null,
    risk_level: input.riskLevel || "low",
    details: {
      before: input.beforeValue ?? null,
      after: input.afterValue ?? null,
      reason: input.reason || null,
    },
    ip_address: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || null,
    user_agent: c.req.header("user-agent") || null,
  };
  const { error } = await supabaseAdmin.from("audit_logs").insert(payload);
  if (error) console.error("Failed to write admin audit log:", error.message);
};

const applyUserSearch = (query: any, keyword?: string) => {
  if (!keyword) return query;
  return query.or(`email.ilike.%${keyword}%,name.ilike.%${keyword}%,full_name.ilike.%${keyword}%,phone.ilike.%${keyword}%`);
};

const normalizeRole = (role: string) => role.toUpperCase();

const adminOnly = [requireAuth, requireAdmin] as const;
const adminWithPermission = (permission: string) => [requireAuth, requireAdmin, requireAdminPermission(permission)] as const;

// GET /admin/users - List all users with pagination
adminRoutes.get("/users", requireAuth, requireAdmin, async (c) => {


  const { page = "1", limit = "20", search = "", role = "", status = "", sortBy = "created_at", sortOrder = "desc" } = c.req.query();

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
    data: data?.map((u) => {
      const displayUser = withAdminDisplayStatus(u);
      return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      status: displayUser.status,
      raw_status: displayUser.raw_status,
      approvalStatus: displayUser.approvalStatus,
      is_profile_completed: u.is_profile_completed,
      onboarding_step: u.onboarding_step,
      provider: u.provider,
      created_at: u.created_at,
      last_login_at: u.last_login_at,
      };
    }),
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

  const displayUser = withAdminDisplayStatus(user);

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    status: displayUser.status,
    raw_status: displayUser.raw_status,
    approvalStatus: displayUser.approvalStatus,
    is_profile_completed: user.is_profile_completed,
    onboarding_step: user.onboarding_step,
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
  clearAuthCacheForUser(userId);

  return c.json({ success: true, user: { id: userId, status } });
});

// GET /admin/owner-approvals - Owners waiting for admin approval
adminRoutes.get("/owner-approvals", requireAuth, requireAdmin, async (c) => {
  const { status = "PENDING_APPROVAL" } = c.req.query();

  let query = supabaseAdmin
    .from("users")
    .select("id,email,name,avatar,role,status,provider,is_profile_completed,onboarding_step,created_at,updated_at,last_login_at,user_profiles(*)")
    .eq("role", "OWNER")
    .order("updated_at", { ascending: false });

  if (status !== "PENDING_APPROVAL") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) return jsonDbError(c, error, "Failed to fetch owner approvals");

  const rows = status === "PENDING_APPROVAL"
    ? (data ?? []).filter((user: any) => {
        const profile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
        const hasProfile = Boolean(profile);
        const isPending = user.status === "PENDING_APPROVAL" || user.onboarding_step === "PENDING_APPROVAL";
        const hasLegacyCompletedProfile = hasProfile && user.is_profile_completed !== true && user.onboarding_step !== "DONE";
        return hasProfile && (isPending || hasLegacyCompletedProfile);
      })
    : (data ?? []);

  return c.json({
    data: rows.map((user: any) => {
      const profile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
      const hasLegacyCompletedProfile = Boolean(profile) && user.is_profile_completed !== true && user.onboarding_step !== "DONE";
      const approvalStatus = user.onboarding_step === "PENDING_APPROVAL" || hasLegacyCompletedProfile ? "PENDING_APPROVAL" : user.status;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        status: approvalStatus,
        approvalStatus,
        provider: user.provider,
        isProfileCompleted: user.is_profile_completed,
        onboardingStep: hasLegacyCompletedProfile ? "PENDING_APPROVAL" : user.onboarding_step,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_login_at,
        profile: profile ? {
          fullName: profile.full_name,
          phone: profile.phone,
          fullAddress: profile.full_address,
          provinceName: profile.province_name,
          districtName: profile.district_name,
          addressLine: profile.address_line,
        } : null,
      };
    }),
  });
});

// PATCH /admin/owner-approvals/:id - Approve or reject an owner account
adminRoutes.patch("/owner-approvals/:id", requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param("id");
  const currentUser = c.get("user");
  const parsed = await c.req.json().catch(() => ({}));
  const validation = ownerApprovalSchema.safeParse(parsed);
  if (!validation.success) return c.json({ error: "Invalid approval action" }, 400);

  const { data: targetUser, error: findError } = await supabaseAdmin
    .from("users")
    .select("id,email,role,status,is_profile_completed")
    .eq("id", userId)
    .single();

  if (findError || !targetUser) return c.json({ error: "User not found" }, 404);
  if (targetUser.role !== "OWNER") return c.json({ error: "Only OWNER accounts require approval" }, 400);
  if (currentUser.id === userId) return c.json({ error: "Cannot approve/reject yourself" }, 400);

  const nextStatus = validation.data.action === "approve" ? "ACTIVE" : "REJECTED";
  const payload = {
    status: nextStatus,
    is_profile_completed: true,
    onboarding_step: validation.data.action === "approve" ? "DONE" : "PENDING_APPROVAL",
    updated_at: new Date().toISOString(),
  };

  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from("users")
    .update(payload)
    .eq("id", userId)
    .select("id,email,role,status,is_profile_completed,onboarding_step")
    .single();

  if (updateError) return jsonDbError(c, updateError, "Failed to update owner approval", 400);

  if (nextStatus === "REJECTED") {
    await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("revoked_at", null);
  }
  clearAuthCacheForUser(userId);

  await writeAudit(c, {
    action: validation.data.action === "approve" ? "owner_approved" : "owner_rejected",
    resourceType: "user",
    resourceId: userId,
    beforeValue: { status: targetUser.status },
    afterValue: { status: nextStatus },
    reason: validation.data.reason || null,
    riskLevel: validation.data.action === "reject" ? "medium" : "low",
  });

  return c.json({ success: true, user: updatedUser });
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

// DELETE /admin/users/:id - Purge account data so the same email can sign up again.
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

  const purgeErrors = await purgeUserData(userId);
  if (purgeErrors.length > 0) {
    console.error("Failed to purge user data:", purgeErrors.map((item) => ({
      table: item.table,
      column: item.column,
      message: item.error?.message,
      code: item.error?.code,
    })));
    return c.json({
      error: "Không thể xóa sạch dữ liệu tài khoản.",
      details: purgeErrors.map((item) => ({ table: item.table, column: item.column, message: item.error?.message, code: item.error?.code })),
    }, 500);
  }

  await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", userId);

  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (error) {
    console.warn("Unable to delete auth.users record. Public user data was already purged.", error);
  }

  clearAuthCacheForUser(userId);

  return c.json({ success: true });
});

// GET /admin/stats - Dashboard stats
adminRoutes.get("/stats", requireAuth, requireAdmin, async (c) => {


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
adminRoutes.get("/rooms", ...adminWithPermission("room.view"), async (c) => {


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
adminRoutes.get("/rooms/:id", ...adminWithPermission("room.view"), async (c) => {
  const roomId = c.req.param("id");
  // Single embedded query: fetch room + contracts + invoices in one round-trip
  const { data: room, error } = await supabaseAdmin
    .from("rooms")
    .select("*, contracts(id, tenant_id, status, start_date, end_date, deposit, created_at), invoices(id, contract_id, status, total_amount, paid_amount, due_date, month, year, created_at)")
    .eq("id", roomId)
    .single();

  if (error || !room) {
    return c.json({ error: "Room not found" }, 404);
  }

  const { contracts: roomContracts, invoices: roomInvoices, ...roomData } = room as any;
  return c.json({
    data: roomData,
    id: roomData.id,
    name: roomData.name,
    boardingHouseId: roomData.boarding_house_id,
    price: roomData.price,
    status: roomData.status,
    isPublic: roomData.is_public,
    createdAt: roomData.created_at,
    contracts: roomContracts ?? [],
    invoices: roomInvoices ?? [],
  });
});

// POST /admin/rooms - Create room
adminRoutes.post("/rooms", ...adminWithPermission("room.update"), async (c) => {
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
adminRoutes.patch("/rooms/:id", ...adminWithPermission("room.update"), async (c) => {
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
adminRoutes.delete("/rooms/:id", ...adminWithPermission("room.update"), async (c) => {
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

// ---------------------------------------------------------------------------
// Phase 1: Account status + lock/unlock
// ---------------------------------------------------------------------------

adminRoutes.get("/accounts", ...adminWithPermission("account.view"), async (c) => {
  const { page, limit, offset } = listParams(c);
  const {
    keyword = "",
    type = "",
    role = "",
    status = "",
    sortBy = "created_at",
    sortOrder = "desc",
  } = c.req.query();

  let query = supabaseAdmin.from("users").select("*", { count: "exact" });
  query = applyUserSearch(query, keyword);
  if (type) query = query.eq("user_type", type.toLowerCase());
  if (role) query = query.eq("role", normalizeRole(role));
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  if (error) return jsonDbError(c, error, "Failed to fetch admin accounts");
  return c.json({
    data: (data ?? []).map(withAdminDisplayStatus),
    pagination: toPagination(page, limit, count || 0),
  });
});

adminRoutes.get("/accounts/summary", ...adminWithPermission("account.view"), async (c) => {
  const { data, error } = await supabaseAdmin.from("users").select("id, role, user_type, status, is_profile_completed, onboarding_step, created_at, last_login_at");
  if (error) return jsonDbError(c, error, "Failed to fetch account summary");

  const rows = (data ?? []).map(withAdminDisplayStatus);
  const byStatus = rows.reduce<Record<string, number>>((acc, row: any) => {
    const key = String(row.status || "UNKNOWN");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byRole = rows.reduce<Record<string, number>>((acc, row: any) => {
    const key = String(row.role || row.user_type || "UNKNOWN");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return c.json({
    total: rows.length,
    active: rows.filter((x: any) => x.status === "ACTIVE" || x.status === "active").length,
    blocked: rows.filter((x: any) => x.status === "BLOCKED" || x.status === "locked").length,
    deleted: rows.filter((x: any) => x.status === "DELETED" || x.status === "soft_deleted").length,
    byStatus,
    byRole,
  });
});

adminRoutes.post("/accounts/:id/lock", ...adminWithPermission("account.lock"), async (c) => {
  const id = c.req.param("id");
  const actor = getActor(c);
  const parsed = reasonSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ code: "REASON_REQUIRED", error: "Reason is required" }, 400);
  if (actor.id === id) return c.json({ code: "CANNOT_LOCK_SELF", error: "Cannot lock your own account" }, 400);

  const before = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  if (before.error || !before.data) return c.json({ error: "Account not found" }, 404);

  const payload = {
    status: "BLOCKED",
    locked_at: new Date().toISOString(),
    locked_by: actor.id,
    locked_reason: parsed.data.reason,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin.from("users").update(payload).eq("id", id).select("*").single();
  if (error) return jsonDbError(c, error, "Failed to lock account", 400);

  await writeAudit(c, {
    action: "account.lock",
    resourceType: "account",
    resourceId: id,
    beforeValue: before.data,
    afterValue: data,
    reason: parsed.data.reason,
    riskLevel: "high",
  });
  return c.json({ success: true, data });
});

adminRoutes.post("/accounts/:id/unlock", ...adminWithPermission("account.unlock"), async (c) => {
  const id = c.req.param("id");
  const actor = getActor(c);
  const parsed = reasonSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ code: "REASON_REQUIRED", error: "Reason is required" }, 400);

  const before = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  if (before.error || !before.data) return c.json({ error: "Account not found" }, 404);

  const payload = {
    status: "ACTIVE",
    unlocked_at: new Date().toISOString(),
    unlocked_by: actor.id,
    unlocked_reason: parsed.data.reason,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin.from("users").update(payload).eq("id", id).select("*").single();
  if (error) return jsonDbError(c, error, "Failed to unlock account", 400);

  await writeAudit(c, {
    action: "account.unlock",
    resourceType: "account",
    resourceId: id,
    beforeValue: before.data,
    afterValue: data,
    reason: parsed.data.reason,
    riskLevel: "high",
  });
  return c.json({ success: true, data });
});

// ---------------------------------------------------------------------------
// Phase 2-3: Audit, roles and permissions
// ---------------------------------------------------------------------------

adminRoutes.get("/audit-logs", ...adminWithPermission("audit_log.view"), async (c) => {
  const { page, limit, offset } = listParams(c);
  const { module = "", action = "", riskLevel = "", resourceType = "", objectId = "" } = c.req.query();
  let query = supabaseAdmin.from("audit_logs").select("*", { count: "exact" });
  if (module) query = query.eq("module", module);
  if (action) query = query.eq("action", action);
  if (riskLevel) query = query.eq("risk_level", riskLevel);
  if (resourceType) query = query.eq("resource_type", resourceType);
  if (objectId) query = query.or(`object_id.eq.${objectId},resource_id.eq.${objectId}`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return jsonDbError(c, error, "Failed to fetch audit logs");
  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

adminRoutes.get("/audit-logs/:id", ...adminWithPermission("audit_log.view"), async (c) => {
  const { data, error } = await supabaseAdmin.from("audit_logs").select("*").eq("id", c.req.param("id")).single();
  if (error || !data) return c.json({ error: "Audit log not found" }, 404);
  return c.json({ data });
});

adminRoutes.get("/me/permissions", ...adminOnly, async (c) => {
  const user = getActor(c);
  const { data: dbUser } = await supabaseAdmin.from("users").select("role_id, role").eq("id", user.id).single();
  if (dbUser?.role_id) {
    const { data, error } = await supabaseAdmin
      .from("role_permissions")
      .select("permission_key")
      .eq("role_id", dbUser.role_id);
    if (error) return jsonDbError(c, error, "Failed to fetch permissions");
    return c.json({ role: dbUser.role, permissions: (data ?? []).map((x: any) => x.permission_key) });
  }
  return c.json({
    role: dbUser?.role || user.role,
    permissions: user.role === "SUPER_ADMIN" ? ["*"] : [],
  });
});

adminRoutes.get("/admin-users", ...adminWithPermission("admin_user.view"), async (c) => {
  const { page, limit, offset } = listParams(c);
  const { data, error, count } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact" })
    .in("role", ["ADMIN", "SUPER_ADMIN"])
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return jsonDbError(c, error, "Failed to fetch admin users");
  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

adminRoutes.get("/roles", ...adminWithPermission("role.view"), async (c) => {
  const { data, error } = await supabaseAdmin.from("roles").select("*").order("name", { ascending: true });
  if (error) return jsonDbError(c, error, "Failed to fetch roles");
  return c.json({ data: data ?? [] });
});

adminRoutes.get("/roles/:id", ...adminWithPermission("role.view"), async (c) => {
  const id = c.req.param("id");
  const [roleRes, permissionsRes] = await Promise.all([
    supabaseAdmin.from("roles").select("*").eq("id", id).single(),
    supabaseAdmin.from("role_permissions").select("permission_key").eq("role_id", id),
  ]);
  if (roleRes.error || !roleRes.data) return c.json({ error: "Role not found" }, 404);
  if (permissionsRes.error) return jsonDbError(c, permissionsRes.error, "Failed to fetch role permissions");
  return c.json({ data: { ...roleRes.data, permissions: (permissionsRes.data ?? []).map((x: any) => x.permission_key) } });
});

adminRoutes.patch("/roles/:id/permissions", ...adminWithPermission("role.update"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = z.object({
    permissions: z.array(z.string()),
    reason: z.string().trim().min(1),
  }).safeParse(body);
  if (!parsed.success) return c.json({ code: "INVALID_ROLE_PERMISSION_UPDATE", error: parsed.error.flatten() }, 400);

  const before = await supabaseAdmin.from("role_permissions").select("permission_key").eq("role_id", id);
  await supabaseAdmin.from("role_permissions").delete().eq("role_id", id);
  if (parsed.data.permissions.length > 0) {
    const rows = parsed.data.permissions.map((permission_key) => ({ role_id: id, permission_key }));
    const insert = await supabaseAdmin.from("role_permissions").insert(rows);
    if (insert.error) return jsonDbError(c, insert.error, "Failed to update role permissions", 400);
  }
  await writeAudit(c, {
    action: "role.update",
    resourceType: "role",
    resourceId: id,
    beforeValue: before.data,
    afterValue: parsed.data.permissions,
    reason: parsed.data.reason,
    riskLevel: "critical",
  });
  return c.json({ success: true, permissions: parsed.data.permissions });
});

// ---------------------------------------------------------------------------
// Phase 4-8: Owner, tenant, property, room, contract, invoice operations
// ---------------------------------------------------------------------------

adminRoutes.get("/owners", ...adminWithPermission("owner.view"), async (c) => {
  const { page, limit, offset } = listParams(c);
  const { keyword = "", status = "" } = c.req.query();
  let query = supabaseAdmin.from("users").select("*", { count: "exact" }).eq("role", "OWNER");
  query = applyUserSearch(query, keyword);
  if (status) query = query.eq("status", status);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return jsonDbError(c, error, "Failed to fetch owners");
  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

adminRoutes.get("/owners/:id", ...adminWithPermission("owner.view"), async (c) => {
  const id = c.req.param("id");
  const [owner, houses, rooms, tenants, contracts, invoices] = await Promise.all([
    supabaseAdmin.from("users").select("*").eq("id", id).single(),
    supabaseAdmin.from("boarding_houses").select("id, name, address, status, is_public, created_at").eq("owner_id", id),
    supabaseAdmin.from("rooms").select("id, name, price, status, boarding_house_id, created_at").eq("user_id", id),
    supabaseAdmin.from("tenants").select("id, name, phone, email, status, created_at").eq("user_id", id),
    supabaseAdmin.from("contracts").select("id, room_id, tenant_id, status, start_date, end_date, created_at").eq("user_id", id),
    supabaseAdmin.from("invoices").select("id, room_id, contract_id, status, total_amount, paid_amount, due_date, month, year, created_at").eq("user_id", id),
  ]);
  if (owner.error || !owner.data) return c.json({ error: "Owner not found" }, 404);
  return c.json({
    data: owner.data,
    summary: {
      properties: houses.data?.length || 0,
      rooms: rooms.data?.length || 0,
      tenants: tenants.data?.length || 0,
      activeContracts: contracts.data?.filter((x: any) => x.status === "active").length || 0,
      openInvoices: invoices.data?.filter((x: any) => x.status !== "paid").length || 0,
    },
    properties: houses.data ?? [],
    rooms: rooms.data ?? [],
    tenants: tenants.data ?? [],
    contracts: contracts.data ?? [],
    invoices: invoices.data ?? [],
  });
});

const lockableUserAction = async (c: any, role: "OWNER" | "USER", action: "lock" | "unlock") => {
  const id = c.req.param("id");
  const parsed = reasonSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ code: "REASON_REQUIRED", error: "Reason is required" }, 400);
  const status = action === "lock" ? "BLOCKED" : "ACTIVE";
  const actor = getActor(c);
  const before = await supabaseAdmin.from("users").select("*").eq("id", id).single();
  if (before.error || !before.data) return c.json({ error: `${role} not found` }, 404);
  const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (action === "lock") Object.assign(payload, { locked_at: new Date().toISOString(), locked_by: actor.id, locked_reason: parsed.data.reason });
  else Object.assign(payload, { unlocked_at: new Date().toISOString(), unlocked_by: actor.id, unlocked_reason: parsed.data.reason });
  const { data, error } = await supabaseAdmin.from("users").update(payload).eq("id", id).select("*").single();
  if (error) return jsonDbError(c, error, `Failed to ${action} ${role}`, 400);
  await writeAudit(c, {
    action: `${role.toLowerCase()}.${action}`,
    resourceType: role.toLowerCase(),
    resourceId: id,
    beforeValue: before.data,
    afterValue: data,
    reason: parsed.data.reason,
    riskLevel: "high",
  });
  return c.json({ success: true, data });
};

adminRoutes.post("/owners/:id/lock", ...adminWithPermission("owner.lock"), (c) => lockableUserAction(c, "OWNER", "lock"));
adminRoutes.post("/owners/:id/unlock", ...adminWithPermission("owner.unlock"), (c) => lockableUserAction(c, "OWNER", "unlock"));

adminRoutes.get("/tenants", ...adminWithPermission("tenant.view"), async (c) => {
  const { page, limit, offset } = listParams(c);
  const { keyword = "", ownerId = "", status = "" } = c.req.query();
  let query = supabaseAdmin.from("tenants").select("*", { count: "exact" });
  if (keyword) query = query.or(`name.ilike.%${keyword}%,phone.ilike.%${keyword}%,email.ilike.%${keyword}%`);
  if (ownerId) query = query.eq("user_id", ownerId);
  if (status) query = query.eq("status", status);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return jsonDbError(c, error, "Failed to fetch tenants");
  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

adminRoutes.get("/tenants/:id", ...adminWithPermission("tenant.view"), async (c) => {
  const id = c.req.param("id");
  const [tenant, contracts] = await Promise.all([
    supabaseAdmin.from("tenants").select("*").eq("id", id).single(),
    supabaseAdmin.from("contracts").select("*").eq("tenant_id", id),
  ]);
  if (tenant.error || !tenant.data) return c.json({ error: "Tenant not found" }, 404);
  return c.json({ data: tenant.data, contracts: contracts.data ?? [] });
});

const lockTableRow = async (c: any, table: string, resourceType: string, action: "lock" | "unlock", status?: string) => {
  const id = c.req.param("id");
  const parsed = reasonSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ code: "REASON_REQUIRED", error: "Reason is required" }, 400);
  const actor = getActor(c);
  const before = await supabaseAdmin.from(table).select("*").eq("id", id).single();
  if (before.error || !before.data) return c.json({ error: `${resourceType} not found` }, 404);
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) payload.status = status;
  if (action === "lock") Object.assign(payload, { locked_at: new Date().toISOString(), locked_by: actor.id, locked_reason: parsed.data.reason });
  if (action === "unlock") Object.assign(payload, { locked_reason: null });
  const { data, error, omitted, appliedKeys } = await updateRowWithSchemaFallback(table, id, payload);
  if (error) return jsonDbError(c, error, `Failed to ${action} ${resourceType}`, 400);
  if (!appliedKeys.some((key) => ["status", "locked_at", "locked_reason"].includes(key))) {
    return c.json({
      error: `Cannot ${action} ${resourceType}: admin lock columns are not available in this database schema`,
      code: "ADMIN_SCHEMA_INCOMPLETE",
      omitted,
    }, 409);
  }
  await writeAudit(c, {
    action: `${resourceType}.${action}`,
    resourceType,
    resourceId: id,
    beforeValue: before.data,
    afterValue: data,
    reason: parsed.data.reason,
    riskLevel: "high",
  });
  return c.json({ success: true, data, schemaFallback: omitted.length ? { omittedColumns: omitted } : undefined });
};

adminRoutes.post("/tenants/:id/lock", ...adminWithPermission("tenant.lock"), (c) => lockTableRow(c, "tenants", "tenant", "lock", "locked"));
adminRoutes.post("/tenants/:id/unlock", ...adminWithPermission("tenant.unlock"), (c) => lockTableRow(c, "tenants", "tenant", "unlock", "active"));
adminRoutes.post("/properties/:id/lock", ...adminWithPermission("property.lock"), (c) => lockTableRow(c, "boarding_houses", "property", "lock", "INACTIVE"));
adminRoutes.post("/properties/:id/unlock", ...adminWithPermission("property.unlock"), (c) => lockTableRow(c, "boarding_houses", "property", "unlock", "ACTIVE"));

adminRoutes.get("/properties", ...adminWithPermission("property.view"), async (c) => {
  const { page, limit, offset } = listParams(c);
  const { keyword = "", ownerId = "", status = "" } = c.req.query();
  let query = supabaseAdmin.from("boarding_houses").select("*", { count: "exact" });
  if (keyword) query = query.or(`name.ilike.%${keyword}%,address.ilike.%${keyword}%`);
  if (ownerId) query = query.eq("owner_id", ownerId);
  if (status) query = query.eq("status", status);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return jsonDbError(c, error, "Failed to fetch properties");
  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

adminRoutes.get("/properties/:id", ...adminWithPermission("property.view"), async (c) => {
  const id = c.req.param("id");
  const [property, rooms, contracts, invoices] = await Promise.all([
    supabaseAdmin.from("boarding_houses").select("*").eq("id", id).single(),
    supabaseAdmin.from("rooms").select("*").eq("boarding_house_id", id),
    supabaseAdmin.from("contracts").select("*"),
    supabaseAdmin.from("invoices").select("*"),
  ]);
  if (property.error || !property.data) return c.json({ error: "Property not found" }, 404);
  const roomIds = new Set((rooms.data ?? []).map((x: any) => x.id));
  return c.json({
    data: property.data,
    rooms: rooms.data ?? [],
    contracts: (contracts.data ?? []).filter((x: any) => roomIds.has(x.room_id)),
    invoices: (invoices.data ?? []).filter((x: any) => roomIds.has(x.room_id)),
  });
});

adminRoutes.get("/contracts", ...adminWithPermission("contract.view"), async (c) => {
  const { page, limit, offset } = listParams(c);
  const { ownerId = "", roomId = "", tenantId = "", status = "", nearExpiry = "" } = c.req.query();
  let query = supabaseAdmin.from("contracts").select("*", { count: "exact" });
  if (ownerId) query = query.eq("user_id", ownerId);
  if (roomId) query = query.eq("room_id", roomId);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  if (status) query = query.eq("status", status);
  if (nearExpiry === "true") {
    const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    query = query.eq("status", "active").lte("end_date", cutoff);
  }
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return jsonDbError(c, error, "Failed to fetch contracts");
  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

adminRoutes.get("/contracts/:id", ...adminWithPermission("contract.view"), async (c) => {
  const id = c.req.param("id");
  const [contract, invoices, services] = await Promise.all([
    supabaseAdmin.from("contracts").select("*").eq("id", id).single(),
    supabaseAdmin.from("invoices").select("*").eq("contract_id", id),
    supabaseAdmin.from("contract_services").select("*").eq("contract_id", id),
  ]);
  if (contract.error || !contract.data) return c.json({ error: "Contract not found" }, 404);
  return c.json({ data: contract.data, invoices: invoices.data ?? [], services: services.data ?? [] });
});

adminRoutes.post("/contracts/:id/cancel", ...adminWithPermission("contract.cancel"), async (c) => {
  const id = c.req.param("id");
  const parsed = reasonSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ code: "REASON_REQUIRED", error: "Reason is required" }, 400);
  const before = await supabaseAdmin.from("contracts").select("*").eq("id", id).single();
  if (before.error || !before.data) return c.json({ error: "Contract not found" }, 404);
  let payload: Record<string, unknown> = {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancelled_by: getActor(c).id,
    cancel_reason: parsed.data.reason,
    updated_at: new Date().toISOString(),
  };
  let { data, error, omitted, appliedKeys } = await updateRowWithSchemaFallback("contracts", id, payload);
  if (error?.code === "23514") {
    payload = { ...payload, status: "terminated" };
    ({ data, error, omitted, appliedKeys } = await updateRowWithSchemaFallback("contracts", id, payload));
  }
  if (error) return jsonDbError(c, error, "Failed to cancel contract", 400);
  if (!appliedKeys.includes("status")) {
    return c.json({ error: "Cannot cancel contract: status column is not available", code: "ADMIN_SCHEMA_INCOMPLETE", omitted }, 409);
  }
  await writeAudit(c, { action: "contract.cancel", resourceType: "contract", resourceId: id, beforeValue: before.data, afterValue: data, reason: parsed.data.reason, riskLevel: "high" });
  return c.json({ success: true, data, schemaFallback: omitted.length ? { omittedColumns: omitted } : undefined });
});

adminRoutes.get("/invoices", ...adminWithPermission("invoice.view"), async (c) => {
  const { page, limit, offset } = listParams(c);
  const { ownerId = "", roomId = "", contractId = "", status = "", overdue = "" } = c.req.query();
  let query = supabaseAdmin.from("invoices").select("*", { count: "exact" });
  if (ownerId) query = query.eq("user_id", ownerId);
  if (roomId) query = query.eq("room_id", roomId);
  if (contractId) query = query.eq("contract_id", contractId);
  if (status) query = query.eq("status", status);
  if (overdue === "true") query = query.neq("status", "paid").lt("due_date", new Date().toISOString().slice(0, 10));
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return jsonDbError(c, error, "Failed to fetch invoices");
  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

adminRoutes.get("/invoices/:id", ...adminWithPermission("invoice.view"), async (c) => {
  const id = c.req.param("id");
  const [invoice, items] = await Promise.all([
    supabaseAdmin.from("invoices").select("*").eq("id", id).single(),
    supabaseAdmin.from("invoice_items").select("*").eq("invoice_id", id),
  ]);
  if (invoice.error || !invoice.data) return c.json({ error: "Invoice not found" }, 404);
  return c.json({ data: invoice.data, items: items.data ?? [] });
});

adminRoutes.post("/invoices/:id/mark-paid", ...adminWithPermission("invoice.mark_paid"), async (c) => {
  const id = c.req.param("id");
  const parsed = z.object({
    amount: z.coerce.number().nonnegative(),
    paidAt: z.string().optional(),
    paymentMethod: z.string().optional(),
    reason: z.string().trim().min(1),
  }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid payment payload", details: parsed.error.flatten() }, 400);
  const before = await supabaseAdmin.from("invoices").select("*").eq("id", id).single();
  if (before.error || !before.data) return c.json({ error: "Invoice not found" }, 404);
  const total = Number(before.data.total_amount || 0);
  const status = parsed.data.amount >= total ? "paid" : "partial";
  let payload: Record<string, unknown> = {
    paid_amount: parsed.data.amount,
    status,
    paid_at: parsed.data.paidAt || new Date().toISOString(),
    paid_by: getActor(c).id,
    payment_method: parsed.data.paymentMethod || null,
    updated_at: new Date().toISOString(),
  };
  let { data, error, omitted, appliedKeys } = await updateRowWithSchemaFallback("invoices", id, payload);
  if (error?.code === "23514" && status === "partial") {
    payload = { ...payload, status: "partially_paid" };
    ({ data, error, omitted, appliedKeys } = await updateRowWithSchemaFallback("invoices", id, payload));
  }
  if (error) return jsonDbError(c, error, "Failed to mark invoice paid", 400);
  if (!appliedKeys.some((key) => ["status", "paid_amount"].includes(key))) {
    return c.json({ error: "Cannot mark invoice paid: payment columns are not available", code: "ADMIN_SCHEMA_INCOMPLETE", omitted }, 409);
  }
  await writeAudit(c, { action: "invoice.mark_paid", resourceType: "invoice", resourceId: id, beforeValue: before.data, afterValue: data, reason: parsed.data.reason, riskLevel: "high" });
  return c.json({ success: true, data, schemaFallback: omitted.length ? { omittedColumns: omitted } : undefined });
});

adminRoutes.post("/invoices/:id/cancel", ...adminWithPermission("invoice.cancel"), async (c) => {
  const id = c.req.param("id");
  const parsed = reasonSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ code: "REASON_REQUIRED", error: "Reason is required" }, 400);
  const before = await supabaseAdmin.from("invoices").select("*").eq("id", id).single();
  if (before.error || !before.data) return c.json({ error: "Invoice not found" }, 404);
  const payload = {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancelled_by: getActor(c).id,
    cancel_reason: parsed.data.reason,
    updated_at: new Date().toISOString(),
  };
  const { data, error, omitted, appliedKeys } = await updateRowWithSchemaFallback("invoices", id, payload);
  if (error) return jsonDbError(c, error, "Failed to cancel invoice", 400);
  if (!appliedKeys.includes("status")) {
    return c.json({ error: "Cannot cancel invoice: status column is not available", code: "ADMIN_SCHEMA_INCOMPLETE", omitted }, 409);
  }
  await writeAudit(c, { action: "invoice.cancel", resourceType: "invoice", resourceId: id, beforeValue: before.data, afterValue: data, reason: parsed.data.reason, riskLevel: "high" });
  return c.json({ success: true, data, schemaFallback: omitted.length ? { omittedColumns: omitted } : undefined });
});

// ---------------------------------------------------------------------------
// Phase 9-13: Dashboard, reports, config, notifications
// ---------------------------------------------------------------------------

adminRoutes.get("/dashboard/summary", ...adminWithPermission("dashboard.view"), async (c) => {
  const [users, tenants, houses, rooms, contracts, invoices] = await Promise.all([
    supabaseAdmin.from("users").select("id, role, status, last_login_at"),
    supabaseAdmin.from("tenants").select("id"),
    supabaseAdmin.from("boarding_houses").select("id"),
    supabaseAdmin.from("rooms").select("id, status"),
    supabaseAdmin.from("contracts").select("id, status, end_date"),
    supabaseAdmin.from("invoices").select("id, status, due_date, total_amount, paid_amount"),
  ]);
  const anyError = [users, tenants, houses, rooms, contracts, invoices].find((x) => x.error);
  if (anyError?.error) return jsonDbError(c, anyError.error, "Failed to fetch dashboard summary");
  const invRows = invoices.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return c.json({
    totalOwners: (users.data ?? []).filter((x: any) => x.role === "OWNER").length,
    activeOwners: (users.data ?? []).filter((x: any) => x.role === "OWNER" && x.status === "ACTIVE").length,
    lockedOwners: (users.data ?? []).filter((x: any) => x.role === "OWNER" && x.status === "BLOCKED").length,
    totalTenants: tenants.data?.length || 0,
    totalProperties: houses.data?.length || 0,
    totalRooms: rooms.data?.length || 0,
    occupiedRooms: (rooms.data ?? []).filter((x: any) => String(x.status).toLowerCase() === "occupied").length,
    vacantRooms: (rooms.data ?? []).filter((x: any) => ["vacant", "available"].includes(String(x.status).toLowerCase())).length,
    nearExpiryContracts: (contracts.data ?? []).filter((x: any) => x.status === "active" && x.end_date && x.end_date <= cutoff).length,
    unpaidInvoices: invRows.filter((x: any) => x.status !== "paid").length,
    overdueInvoices: invRows.filter((x: any) => x.status !== "paid" && x.due_date && x.due_date < today).length,
    totalDebtAmount: invRows.reduce((sum: number, x: any) => sum + Math.max(Number(x.total_amount || 0) - Number(x.paid_amount || 0), 0), 0),
  });
});

adminRoutes.get("/dashboard/charts", ...adminWithPermission("dashboard.view"), async (c) => {
  const [users, rooms, invoices] = await Promise.all([
    supabaseAdmin.from("users").select("role, created_at"),
    supabaseAdmin.from("rooms").select("status"),
    supabaseAdmin.from("invoices").select("status, month, year"),
  ]);
  if (users.error) return jsonDbError(c, users.error, "Failed to fetch chart users");
  if (rooms.error) return jsonDbError(c, rooms.error, "Failed to fetch chart rooms");
  if (invoices.error) return jsonDbError(c, invoices.error, "Failed to fetch chart invoices");
  return c.json({
    ownersByMonth: users.data?.filter((x: any) => x.role === "OWNER").reduce((acc: Record<string, number>, x: any) => {
      const month = String(x.created_at || "").slice(0, 7) || "unknown";
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {}),
    roomsByStatus: rooms.data?.reduce((acc: Record<string, number>, x: any) => {
      const key = String(x.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    invoicesByStatus: invoices.data?.reduce((acc: Record<string, number>, x: any) => {
      const key = String(x.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  });
});

adminRoutes.get("/dashboard/alerts", ...adminWithPermission("dashboard.view"), async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [contracts, invoices, owners] = await Promise.all([
    supabaseAdmin.from("contracts").select("id, room_id, tenant_id, status, start_date, end_date").eq("status", "active").lte("end_date", cutoff),
    supabaseAdmin.from("invoices").select("id, room_id, contract_id, status, due_date, total_amount, paid_amount, month, year").neq("status", "paid"),
    supabaseAdmin.from("users").select("id, email, name, last_login_at").eq("role", "OWNER"),
  ]);
  if (contracts.error) return jsonDbError(c, contracts.error, "Failed to fetch contract alerts");
  if (invoices.error) return jsonDbError(c, invoices.error, "Failed to fetch invoice alerts");
  if (owners.error) return jsonDbError(c, owners.error, "Failed to fetch owner alerts");
  const staleLoginCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return c.json({
    nearExpiryContracts: contracts.data ?? [],
    overdueInvoices: (invoices.data ?? []).filter((x: any) => x.due_date ? x.due_date < today : false),
    inactiveOwners: (owners.data ?? []).filter((x: any) => !x.last_login_at || x.last_login_at < staleLoginCutoff),
  });
});

adminRoutes.get("/reports/owners", ...adminWithPermission("report.view"), async (c) => {
  const { data, error } = await supabaseAdmin.from("users").select("*").eq("role", "OWNER");
  if (error) return jsonDbError(c, error, "Failed to fetch owner report");
  return c.json({ data: data ?? [], total: data?.length || 0 });
});

adminRoutes.get("/reports/tenants", ...adminWithPermission("report.view"), async (c) => {
  const { data, error } = await supabaseAdmin.from("tenants").select("*");
  if (error) return jsonDbError(c, error, "Failed to fetch tenant report");
  return c.json({ data: data ?? [], total: data?.length || 0 });
});

adminRoutes.get("/reports/rooms", ...adminWithPermission("report.view"), async (c) => {
  const { data, error } = await supabaseAdmin.from("rooms").select("*");
  if (error) return jsonDbError(c, error, "Failed to fetch room report");
  return c.json({ data: data ?? [], total: data?.length || 0 });
});

adminRoutes.get("/reports/contracts", ...adminWithPermission("report.view"), async (c) => {
  const { data, error } = await supabaseAdmin.from("contracts").select("*");
  if (error) return jsonDbError(c, error, "Failed to fetch contract report");
  return c.json({ data: data ?? [], total: data?.length || 0 });
});

adminRoutes.get("/reports/invoices", ...adminWithPermission("report.view"), async (c) => {
  const { data, error } = await supabaseAdmin.from("invoices").select("id, room_id, contract_id, status, total_amount, paid_amount, due_date, month, year, created_at");
  if (error) return jsonDbError(c, error, "Failed to fetch invoice report");
  const rows = data ?? [];
  return c.json({
    data: rows,
    total: rows.length,
    totalAmount: rows.reduce((sum: number, x: any) => sum + Number(x.total_amount || 0), 0),
    paidAmount: rows.reduce((sum: number, x: any) => sum + Number(x.paid_amount || 0), 0),
    debtAmount: rows.reduce((sum: number, x: any) => sum + Math.max(Number(x.total_amount || 0) - Number(x.paid_amount || 0), 0), 0),
  });
});

adminRoutes.get("/system-config", ...adminWithPermission("system_config.view"), async (c) => {
  const { data, error } = await supabaseAdmin.from("admin_system_configs").select("*").order("key", { ascending: true });
  if (error && isMissingSchemaTable(error, "admin_system_configs")) {
    const fallback = await supabaseAdmin
      .from("system_settings")
      .select("*")
      .eq("category", "admin")
      .order("key", { ascending: true });
    if (fallback.error) return jsonDbError(c, fallback.error, "Failed to fetch system config");
    return c.json({
      data: (fallback.data ?? []).map((item: any) => ({
        id: item.id,
        key: item.key,
        value: item.value,
        value_type: item.type,
        description: null,
        is_public: false,
        updated_by: item.user_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        schemaFallback: "system_settings",
      })),
      schemaFallback: "system_settings",
    });
  }
  if (error) return jsonDbError(c, error, "Failed to fetch system config");
  return c.json({ data: data ?? [] });
});

adminRoutes.patch("/system-config", ...adminWithPermission("system_config.update"), async (c) => {
  const parsed = z.object({
    key: z.string().min(1),
    value: z.unknown(),
    valueType: z.string().optional(),
    reason: z.string().trim().min(1),
  }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid system config payload", details: parsed.error.flatten() }, 400);
  const before = await supabaseAdmin.from("admin_system_configs").select("*").eq("key", parsed.data.key).maybeSingle();
  if (before.error && isMissingSchemaTable(before.error, "admin_system_configs")) {
    const actor = getActor(c);
    const fallbackBefore = await supabaseAdmin
      .from("system_settings")
      .select("*")
      .eq("user_id", actor.id)
      .eq("category", "admin")
      .eq("key", parsed.data.key)
      .maybeSingle();

    const fallback = await supabaseAdmin.from("system_settings").upsert({
      user_id: actor.id,
      category: "admin",
      key: parsed.data.key,
      value: parsed.data.value,
      type: parsed.data.valueType || typeof parsed.data.value,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,category,key" }).select("*").single();

    if (fallback.error) return jsonDbError(c, fallback.error, "Failed to update system config", 400);
    await writeAudit(c, {
      action: "system_config.update",
      resourceType: "system_config",
      resourceId: fallback.data.id,
      beforeValue: fallbackBefore.data,
      afterValue: fallback.data,
      reason: parsed.data.reason,
      riskLevel: "critical",
    });
    return c.json({
      success: true,
      data: {
        id: fallback.data.id,
        key: fallback.data.key,
        value: fallback.data.value,
        value_type: fallback.data.type,
        updated_by: fallback.data.user_id,
        created_at: fallback.data.created_at,
        updated_at: fallback.data.updated_at,
      },
      schemaFallback: "system_settings",
    });
  }
  const { data, error } = await supabaseAdmin.from("admin_system_configs").upsert({
    key: parsed.data.key,
    value: parsed.data.value,
    value_type: parsed.data.valueType || typeof parsed.data.value,
    updated_by: getActor(c).id,
    updated_reason: parsed.data.reason,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" }).select("*").single();
  if (error) return jsonDbError(c, error, "Failed to update system config", 400);
  await writeAudit(c, { action: "system_config.update", resourceType: "system_config", resourceId: data.id, beforeValue: before.data, afterValue: data, reason: parsed.data.reason, riskLevel: "critical" });
  return c.json({ success: true, data });
});

adminRoutes.get("/notifications", ...adminWithPermission("notification.view"), async (c) => {
  const { page, limit, offset } = listParams(c);
  const { status = "" } = c.req.query();
  let query = supabaseAdmin.from("admin_notifications").select("*", { count: "exact" });
  if (status) query = query.eq("status", status);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return jsonDbError(c, error, "Failed to fetch notifications");
  return c.json({ data: data ?? [], pagination: toPagination(page, limit, count || 0) });
});

adminRoutes.post("/notifications", ...adminWithPermission("notification.create"), async (c) => {
  const parsed = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    notificationType: z.string().default("feature_update"),
    targetType: z.string().default("all_owners"),
    targetIds: z.array(z.string()).default([]),
    channels: z.array(z.string()).default(["in_app"]),
    scheduledAt: z.string().optional(),
  }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid notification payload", details: parsed.error.flatten() }, 400);
  const { data, error } = await supabaseAdmin.from("admin_notifications").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    notification_type: parsed.data.notificationType,
    target_type: parsed.data.targetType,
    target_ids: parsed.data.targetIds,
    channels: parsed.data.channels,
    status: parsed.data.scheduledAt ? "scheduled" : "draft",
    scheduled_at: parsed.data.scheduledAt || null,
    created_by: getActor(c).id,
  }).select("*").single();
  if (error) return jsonDbError(c, error, "Failed to create notification", 400);
  await writeAudit(c, { action: "notification.create", resourceType: "notification", resourceId: data.id, afterValue: data, riskLevel: "medium" });
  return c.json({ data }, 201);
});

adminRoutes.post("/notifications/:id/send", ...adminWithPermission("notification.send"), async (c) => {
  const id = c.req.param("id");
  const before = await supabaseAdmin.from("admin_notifications").select("*").eq("id", id).single();
  if (before.error || !before.data) return c.json({ error: "Notification not found" }, 404);
  if (before.data.status === "sent") return c.json({ error: "Notification already sent" }, 409);

  const channels = Array.isArray(before.data.channels) && before.data.channels.length
    ? before.data.channels
    : ["in_app"];
  const targetIds = Array.isArray(before.data.target_ids) ? before.data.target_ids : [];
  const targetType = String(before.data.target_type || "all_owners");
  let recipients: Array<{ recipient_user_id?: string; recipient_tenant_id?: string }> = [];

  if (targetType === "all_owners") {
    const owners = await supabaseAdmin.from("users").select("id").eq("role", "OWNER");
    if (owners.error) return jsonDbError(c, owners.error, "Failed to resolve notification owners", 400);
    recipients = (owners.data ?? []).map((owner: any) => ({ recipient_user_id: owner.id }));
  } else if (targetType === "selected_owners" || targetType === "one_owner") {
    recipients = targetIds.map((recipient_user_id: string) => ({ recipient_user_id }));
  } else if (targetType === "all_tenants") {
    const tenants = await supabaseAdmin.from("tenants").select("id");
    if (tenants.error) return jsonDbError(c, tenants.error, "Failed to resolve notification tenants", 400);
    recipients = (tenants.data ?? []).map((tenant: any) => ({ recipient_tenant_id: tenant.id }));
  } else if (targetType === "selected_tenants" || targetType === "one_tenant") {
    recipients = targetIds.map((recipient_tenant_id: string) => ({ recipient_tenant_id }));
  }

  const deliveries = recipients.flatMap((recipient) =>
    channels.map((channel: string) => ({
      notification_id: id,
      ...recipient,
      channel,
      status: channel === "in_app" ? "delivered" : "pending",
      delivered_at: channel === "in_app" ? new Date().toISOString() : null,
    }))
  );
  if (deliveries.length > 0) {
    const deliveryInsert = await supabaseAdmin.from("admin_notification_deliveries").insert(deliveries);
    if (deliveryInsert.error) return jsonDbError(c, deliveryInsert.error, "Failed to create notification deliveries", 400);
  }

  const { data, error } = await supabaseAdmin.from("admin_notifications").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single();
  if (error) return jsonDbError(c, error, "Failed to send notification", 400);
  await writeAudit(c, { action: "notification.send", resourceType: "notification", resourceId: id, beforeValue: before.data, afterValue: data, riskLevel: "high" });
  return c.json({ success: true, data, deliveriesCreated: deliveries.length });
});

adminRoutes.post("/notifications/:id/cancel", ...adminWithPermission("notification.cancel"), async (c) => {
  const id = c.req.param("id");
  const parsed = reasonSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ code: "REASON_REQUIRED", error: "Reason is required" }, 400);
  const before = await supabaseAdmin.from("admin_notifications").select("*").eq("id", id).single();
  if (before.error || !before.data) return c.json({ error: "Notification not found" }, 404);
  if (before.data.status === "sent") return c.json({ error: "Cannot cancel sent notification" }, 400);
  const { data, error } = await supabaseAdmin.from("admin_notifications").update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancelled_by: getActor(c).id,
    cancel_reason: parsed.data.reason,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single();
  if (error) return jsonDbError(c, error, "Failed to cancel notification", 400);
  await writeAudit(c, { action: "notification.cancel", resourceType: "notification", resourceId: id, beforeValue: before.data, afterValue: data, reason: parsed.data.reason, riskLevel: "high" });
  return c.json({ success: true, data });
});

export default adminRoutes;
