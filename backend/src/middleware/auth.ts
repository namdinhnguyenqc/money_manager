import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";
import type { CurrentUser } from "../types.js";
import { env } from "../config/env.js";
import { supabaseAdmin, createUserClient } from "../lib/supabase.js";
import { verifyAccessToken } from "../lib/auth.js";
import { isOwnerAutoApproveEnabled, isOwnerRequireProfileFormEnabled } from "../lib/profileStore.js";
import { createHash } from "crypto";

const extractBearer = (headerValue: string | undefined): string | null => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

const decodeJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
};

const isSupabaseAuthTokenCandidate = (token: string) => {
  const payload = decodeJwtPayload(token);
  const issuer = typeof payload?.iss === "string" ? payload.iss : "";
  return issuer === `${env.SUPABASE_URL}/auth/v1` || issuer.startsWith(`${env.SUPABASE_URL}/auth/v1`);
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const cleanupRateLimitMap = (now: number) => {
  if (rateLimitMap.size < 1000) return;
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) rateLimitMap.delete(key);
  }
};

function checkRateLimit(ip: string, endpoint: string): boolean {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = endpoint.includes("google") ? 10 : 100;

  cleanupRateLimitMap(now);

  const record = rateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

const tokenCache = new Map<string, { userContext: any; exp: number; isAppToken: boolean; dbUser?: any; preFetchedProfile?: any }>();
const revokedAccessTokens = new Map<string, number>();

const hashAccessToken = (token: string) => createHash("sha256").update(token).digest("hex");

const cleanupRevokedTokens = (now: number) => {
  if (revokedAccessTokens.size < 1000) return;
  for (const [hash, exp] of revokedAccessTokens.entries()) {
    if (exp <= now) revokedAccessTokens.delete(hash);
  }
};

export const revokeAccessToken = (token: string) => {
  const now = Date.now();
  const hash = hashAccessToken(token);
  tokenCache.delete(token);
  revokedAccessTokens.set(hash, now + env.JWT_EXPIRY_SECONDS * 1000);
  cleanupRevokedTokens(now);
};

export const clearAuthCacheForUser = (userId: string) => {
  for (const [token, cached] of tokenCache.entries()) {
    if (cached.userContext?.id === userId) {
      tokenCache.delete(token);
    }
  }
};

export const clearAuthCacheForRole = (roleId: string) => {
  // Clear cache for all users since we don't store roleId directly in cached context,
  // or clear everything if we want to be safe. Since permissions change is rare, clearing tokenCache is fine.
  tokenCache.clear();
};


const isAccessTokenRevoked = (token: string, now: number) => {
  const hash = hashAccessToken(token);
  const exp = revokedAccessTokens.get(hash);
  if (!exp) return false;
  if (exp <= now) {
    revokedAccessTokens.delete(hash);
    return false;
  }
  return true;
};

const logAuthReject = (c: any, reason: string, details: Record<string, any> = {}) => {
  console.warn(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "WARN",
    event: "AUTH_REJECT",
    reason,
    requestId: c.get("requestId"),
    method: c.req.method,
    path: c.req.path,
    ...details,
  }));
};

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  // Rate limiting for /auth/google
  if (c.req.path === "/auth/google") {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip, "/auth/google")) {
      return c.json({ error: "Too many requests. Please try again later." }, 429);
    }
  }

  const token = extractBearer(c.req.header("Authorization"));
  if (!token) {
    logAuthReject(c, "MISSING_BEARER_TOKEN");
    return c.json({ error: "Missing bearer token" }, 401);
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Token In-Memory Cache (Performance Optimization)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const now = Date.now();
  if (isAccessTokenRevoked(token, now)) {
    tokenCache.delete(token);
    logAuthReject(c, "TOKEN_REVOKED");
    return c.json({ error: "Token has been revoked", code: "TOKEN_REVOKED" }, 401);
  }

  const cachedAuth = tokenCache.get(token);
  if (cachedAuth && cachedAuth.exp > now) {
    c.set("user", cachedAuth.userContext);
    c.set("authDbQueryCount", 0);
    if (cachedAuth.dbUser) {
      c.set("authDbUser", cachedAuth.dbUser);
    }
    if (cachedAuth.preFetchedProfile) {
      c.set("authPreFetchedProfile", cachedAuth.preFetchedProfile);
    }
    // If it's an app JWT (our custom token), use supabaseAdmin
    // If it's a real Supabase token, use the user client
    if (cachedAuth.isAppToken) {
      c.set("supabase", supabaseAdmin);
    } else {
      c.set("supabase", createUserClient(token));
    }
    return await next();
  }

  const appJwt = await verifyAccessToken(token);
  if (appJwt) {
    if (appJwt.sub === "admin-builtin") {
      const userContext: CurrentUser = {
        id: "admin-builtin",
        email: "admin@moneymanager.local",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        name: "Administrator",
        avatarUrl: null,
        authProvider: "PASSWORD",
        isProfileCompleted: true,
        onboardingStep: "COMPLETE_PROFILE",
      };
      c.set("user", userContext);
      c.set("supabase", supabaseAdmin);
      tokenCache.set(token, { userContext, exp: now + 5 * 60 * 1000, isAppToken: true });
      return await next();
    }

    const userSelect = "*, user_profiles(*)";

    // Parallel fetch: session check + user data in one round-trip instead of two
    const [sessionRes, userRes] = await Promise.all([
      appJwt.sessionId
        ? supabaseAdmin
            .from("refresh_tokens")
            .select("revoked_at")
            .eq("id", appJwt.sessionId)
            .single()
        : Promise.resolve({ data: { revoked_at: null } }),
      (supabaseAdmin
        .from("users")
        .select(userSelect as any) as any)
        .eq("id", appJwt.sub)
        .single(),
    ]);

    if (appJwt.sessionId) {
      if (!sessionRes.data || sessionRes.data.revoked_at) {
        logAuthReject(c, "SESSION_REVOKED", { userId: appJwt.sub, sessionId: appJwt.sessionId });
        return c.json({ error: "Session has been revoked", code: "SESSION_REVOKED" }, 401);
      }
    }

    const dbUser = userRes.data;
    const dbError = userRes.error;
    if (dbError && dbError.code !== "PGRST116") {
      console.error("Database error fetching app JWT user:", dbError.message);
    }

    if (!dbUser) {
      logAuthReject(c, "USER_NOT_FOUND", { userId: appJwt.sub });
      return c.json({ error: "User not found in database", code: "USER_NOT_FOUND" }, 401);
    }

    const status = dbUser?.status || "ACTIVE";
    if (status === "BLOCKED") {
      logAuthReject(c, "ACCOUNT_BLOCKED", { userId: appJwt.sub });
      return c.json({ error: "Account is blocked", code: "ACCOUNT_BLOCKED" }, 403);
    }
    if (status === "REJECTED") {
      logAuthReject(c, "ACCOUNT_REJECTED", { userId: appJwt.sub });
      return c.json({ error: "Account has been rejected", code: "ACCOUNT_REJECTED" }, 403);
    }
    if (status === "DELETED") {
      logAuthReject(c, "ACCOUNT_DELETED", { userId: appJwt.sub });
      return c.json({ error: "Account is deleted", code: "ACCOUNT_DELETED" }, 403);
    }

    const userContext = {
      id: appJwt.sub,
      email: appJwt.email || null,
      role: (dbUser?.role || appJwt.role || "OWNER") as CurrentUser["role"],
      status,
      name: dbUser?.name || appJwt.name || null,
      avatarUrl: dbUser?.avatar || appJwt.avatarUrl || null,
      authProvider: dbUser?.provider || appJwt.provider || "GOOGLE",
      isProfileCompleted: (dbUser as any)?.is_profile_completed ?? appJwt.isProfileCompleted ?? false,
      onboardingStep: (dbUser as any)?.onboarding_step ?? appJwt.onboardingStep ?? "COMPLETE_PROFILE",
    };

    const preFetchedProfile = (dbUser as any)?.user_profiles
      ? (Array.isArray((dbUser as any).user_profiles) ? (dbUser as any).user_profiles[0] : (dbUser as any).user_profiles)
      : null;

    c.set("user", userContext);
    c.set("supabase", supabaseAdmin);
    c.set("authDbUser", dbUser);
    c.set("authPreFetchedProfile", preFetchedProfile);
    c.set("authDbQueryCount", appJwt.sessionId ? 2 : 1);
    tokenCache.set(token, { userContext, exp: now + 5 * 60 * 1000, isAppToken: true, dbUser, preFetchedProfile });

    if (tokenCache.size > 1000) {
      for (const [k, v] of tokenCache.entries()) {
        if (v.exp <= now) tokenCache.delete(k);
      }
    }

    return await next();
  }

  // ————————————————————————————————————————————————————————
  // Verify Supabase JWT — lấy user từ auth.users
  // ————————————————————————————————————————————————————————
  if (!isSupabaseAuthTokenCandidate(token)) {
    logAuthReject(c, "APP_JWT_INVALID_OR_EXPIRED");
    return c.json({ error: "Invalid or expired token", code: "APP_JWT_INVALID" }, 401);
  }

  const { data: { user: supaUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !supaUser) {
    console.error("Auth error:", authError?.message);
    logAuthReject(c, "SUPABASE_TOKEN_INVALID_OR_EXPIRED", { message: authError?.message });
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  // Lấy thông tin user từ bảng public.users (nếu có)
  // We select only existing columns and handle potential missing ones
  let { data: dbUser, error: dbError } = await supabaseAdmin
    .from("users")
    .select("*, user_profiles(*)") // Select all to avoid explicitly naming missing columns
    .or(`id.eq.${supaUser.id},email.eq.${supaUser.email}`)
    .single();

  if (dbError && dbError.code !== "PGRST116") {
    console.error("Database error fetching user:", dbError.message);
  }

  // Auto-create user nếu chưa có trong public.users
  if (!dbUser) {
    console.log(`User ${supaUser.id} / ${supaUser.email} missing from public.users. Auto-creating...`);
    const insertPayload: any = {
      id: supaUser.id,
      email: supaUser.email,
      role: "OWNER",
      status: "ACTIVE",
      name: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || null,
      avatar: supaUser.user_metadata?.avatar_url || null,
      provider: "GOOGLE",
    };

    const requireForm = await isOwnerRequireProfileFormEnabled();
    const autoApprove = await isOwnerAutoApproveEnabled();
    const isProfileCompleted = !requireForm;
    const onboardingStep = isProfileCompleted
      ? (autoApprove ? "DONE" : "PENDING_APPROVAL")
      : "COMPLETE_PROFILE";

    // Only add columns if they are expected to exist, or let catch handle it
    const { data: newUser, error: createError } = await supabaseAdmin.from("users").insert({
      ...insertPayload,
      is_profile_completed: isProfileCompleted,
      onboarding_step: onboardingStep,
    }).select().single();

    if (createError) {
      console.error("Error auto-creating user with extended columns:", createError.message);
      // Fallback: try inserting without extended columns if they are missing
      if (createError.code === "42703") { // Column does not exist
         console.log("Retrying user creation without profile completion columns...");
         const { data: fallbackUser, error: fallbackError } = await supabaseAdmin.from("users").insert(insertPayload).select().single();
         if (fallbackError) {
           console.error("Critical error auto-creating user:", fallbackError.message);
          return c.json({ error: "[AUTH_MID_001] Lỗi lưu thông tin người dùng: " + fallbackError.message }, 500);
        }
        return c.json({ error: "[AUTH_MID_002] Lỗi lưu thông tin người dùng: " + createError.message }, 500);
      }
    } else {
      dbUser = newUser;
    }
  } else if (dbUser.id !== supaUser.id) {
    console.log(`Linking existing public user ${dbUser.id} to new auth user ${supaUser.id}`);
    const { data: updatedUser, error: updateError } = await supabaseAdmin.from("users")
      .update({ id: supaUser.id })
      .eq("email", supaUser.email)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to link user ID:", updateError.message);
    } else {
      dbUser = updatedUser;
    }
  }

  const role = dbUser?.role || "OWNER";
  const status = dbUser?.status || "ACTIVE";

  if (status === "BLOCKED") {
    logAuthReject(c, "ACCOUNT_BLOCKED", { userId: supaUser.id });
    return c.json({ error: "Account is blocked", code: "ACCOUNT_BLOCKED" }, 403);
  }
  if (status === "REJECTED") {
    logAuthReject(c, "ACCOUNT_REJECTED", { userId: supaUser.id });
    return c.json({ error: "Account has been rejected", code: "ACCOUNT_REJECTED" }, 403);
  }
  if (status === "DELETED") {
    logAuthReject(c, "ACCOUNT_DELETED", { userId: supaUser.id });
    return c.json({ error: "Account is deleted", code: "ACCOUNT_DELETED" }, 403);
  }

  const userContext = {
    id: supaUser.id,
    email: supaUser.email || null,
    role: role as CurrentUser["role"],
    status,
    name: dbUser?.name || supaUser.user_metadata?.full_name || null,
    avatarUrl: dbUser?.avatar || supaUser.user_metadata?.avatar_url || null,
    authProvider: "GOOGLE",
    isProfileCompleted: (dbUser as any)?.is_profile_completed ?? false,
    onboardingStep: (dbUser as any)?.onboarding_step ?? "COMPLETE_PROFILE",
  };

  const preFetchedProfile = dbUser?.user_profiles
    ? (Array.isArray(dbUser.user_profiles) ? dbUser.user_profiles[0] : dbUser.user_profiles)
    : null;

  // Set user info vào context
  c.set("user", userContext);
  c.set("authDbUser", dbUser);
  c.set("authPreFetchedProfile", preFetchedProfile);

  // ————————————————————————————————————————————————————————
  // Tạo per-request Supabase client VỚI user token
  // ————————————————————————————————————————————————————————
  c.set("supabase", createUserClient(token));

  // Cache for 5 minutes
  tokenCache.set(token, { userContext, exp: now + 5 * 60 * 1000, isAppToken: false, dbUser, preFetchedProfile });

  // Cleanup old cache occasionally
  if (tokenCache.size > 1000) {
    for (const [k, v] of tokenCache.entries()) {
      if (v.exp <= now) tokenCache.delete(k);
    }
  }

  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return c.json({ error: "Forbidden: admin access required" }, 403);
  }
  await next();
});

export const requireSuperAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user || user.role !== "SUPER_ADMIN") {
    return c.json({ error: "Super admin access required" }, 403);
  }
  await next();
});

export const requireAdminPermission = (permissionKey: string) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return c.json({ error: "Forbidden: admin access required" }, 403);
    }

    if (user.role === "SUPER_ADMIN") {
      await next();
      return;
    }

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();

    if (userError || !dbUser?.role_id) {
      return c.json({
        code: "ADMIN_PERMISSION_REQUIRED",
        error: "Admin permission required",
        required_permission: permissionKey,
      }, 403);
    }

    const { data, error } = await supabaseAdmin
      .from("role_permissions")
      .select("permission_key")
      .eq("role_id", dbUser.role_id)
      .eq("permission_key", permissionKey)
      .maybeSingle();

    if (error || !data) {
      return c.json({
        code: "ADMIN_PERMISSION_REQUIRED",
        error: "Admin permission required",
        required_permission: permissionKey,
      }, 403);
    }

    await next();
  });

export const requireOwner = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }
  if (!["OWNER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return c.json({ error: "Forbidden: owner access required", code: "OWNER_REQUIRED" }, 403);
  }
  await next();
});

export const requireTenant = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }
  if (user.role !== "TENANT") {
    return c.json({ error: "Forbidden: tenant access required" }, 403);
  }
  await next();
});

export const requireTenantOrOwner = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }
  if (!["TENANT", "OWNER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return c.json({ error: "Forbidden: tenant or owner access required" }, 403);
  }
  await next();
});

export const getClientIp = (c: any): string => {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
    || c.req.header("x-real-ip")
    || "unknown";
};

export const getDeviceInfo = (c: any): string => {
  const ua = c.req.header("user-agent") || "";
  return ua.substring(0, 255);
};

export type AuthUser = {
  id: string;
  email: string;
  role: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
  status: string;
};
