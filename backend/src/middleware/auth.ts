import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";
import type { CurrentUser } from "../types.js";
import { env } from "../config/env.js";
import { supabaseAdmin, createUserClient } from "../lib/supabase.js";
import { verifyAccessToken } from "../lib/auth.js";
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

function checkRateLimit(ip: string, endpoint: string): boolean {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = endpoint.includes("google") ? 10 : 100;

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

const tokenCache = new Map<string, { userContext: any; exp: number; isAppToken: boolean }>();
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
    return c.json({ error: "Missing bearer token" }, 401);
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Token In-Memory Cache (Performance Optimization)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const now = Date.now();
  if (isAccessTokenRevoked(token, now)) {
    tokenCache.delete(token);
    return c.json({ error: "Token has been revoked", code: "TOKEN_REVOKED" }, 401);
  }

  const cachedAuth = tokenCache.get(token);
  if (cachedAuth && cachedAuth.exp > now) {
    c.set("user", cachedAuth.userContext);
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
    // Parallel fetch: session check + user data in one round-trip instead of two
    const [sessionRes, userRes] = await Promise.all([
      appJwt.sessionId
        ? supabaseAdmin
            .from("refresh_tokens")
            .select("revoked_at")
            .eq("id", appJwt.sessionId)
            .single()
        : Promise.resolve({ data: { revoked_at: null } }),
      supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", appJwt.sub)
        .single(),
    ]);

    if (appJwt.sessionId) {
      if (!sessionRes.data || sessionRes.data.revoked_at) {
        return c.json({ error: "Session has been revoked", code: "SESSION_REVOKED" }, 401);
      }
    }

    const dbUser = userRes.data;
    const dbError = userRes.error;
    if (dbError && dbError.code !== "PGRST116") {
      console.error("Database error fetching app JWT user:", dbError.message);
    }

    const status = dbUser?.status || appJwt.status || "ACTIVE";
    if (status === "BLOCKED") {
      return c.json({ error: "Account is blocked", code: "ACCOUNT_BLOCKED" }, 403);
    }
    if (status === "DELETED") {
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

    c.set("user", userContext);
    c.set("supabase", supabaseAdmin);
    tokenCache.set(token, { userContext, exp: now + 5 * 60 * 1000, isAppToken: true });

    if (tokenCache.size > 1000) {
      for (const [k, v] of tokenCache.entries()) {
        if (v.exp <= now) tokenCache.delete(k);
      }
    }

    return await next();
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Verify Supabase JWT â€” láº¥y user tá»« auth.users
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!isSupabaseAuthTokenCandidate(token)) {
    return c.json({ error: "Invalid or expired token", code: "APP_JWT_INVALID" }, 401);
  }

  const { data: { user: supaUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !supaUser) {
    console.error("Auth error:", authError?.message);
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  // Láº¥y thÃ´ng tin user tá»« báº£ng public.users (náº¿u cÃ³)
  // We select only existing columns and handle potential missing ones
  let { data: dbUser, error: dbError } = await supabaseAdmin
    .from("users")
    .select("*") // Select all to avoid explicitly naming missing columns
    .or(`id.eq.${supaUser.id},email.eq.${supaUser.email}`)
    .single();

  if (dbError && dbError.code !== "PGRST116") {
    console.error("Database error fetching user:", dbError.message);
  }

  // Auto-create user náº¿u chÆ°a cÃ³ trong public.users
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

    // Only add columns if they are expected to exist, or let catch handle it
    const { data: newUser, error: createError } = await supabaseAdmin.from("users").insert({
      ...insertPayload,
      is_profile_completed: false,
      onboarding_step: "COMPLETE_PROFILE",
    }).select().single();

    if (createError) {
      console.error("Error auto-creating user with extended columns:", createError.message);
      // Fallback: try inserting without extended columns if they are missing
      if (createError.code === "42703") { // Column does not exist
         console.log("Retrying user creation without profile completion columns...");
         const { data: fallbackUser, error: fallbackError } = await supabaseAdmin.from("users").insert(insertPayload).select().single();
         if (fallbackError) {
           console.error("Critical error auto-creating user:", fallbackError.message);
          return c.json({ error: "[AUTH_MID_001] Lá»—i lÆ°u thÃ´ng tin ngÆ°á»i dÃ¹ng: " + fallbackError.message }, 500);
        }
        return c.json({ error: "[AUTH_MID_002] Lá»—i lÆ°u thÃ´ng tin ngÆ°á»i dÃ¹ng: " + createError.message }, 500);
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
    return c.json({ error: "Account is blocked", code: "ACCOUNT_BLOCKED" }, 403);
  }
  if (status === "DELETED") {
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

  // Set user info vÃ o context
  c.set("user", userContext);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Táº¡o per-request Supabase client Vá»šI user token
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  c.set("supabase", createUserClient(token));

  // Cache for 5 minutes
  tokenCache.set(token, { userContext, exp: now + 5 * 60 * 1000, isAppToken: false });

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
  // Relaxed for development: allow everyone who is authenticated
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
