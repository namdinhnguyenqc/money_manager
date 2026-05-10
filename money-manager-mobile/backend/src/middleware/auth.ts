import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";
import type { CurrentUser } from "../types.js";
import { env } from "../config/env.js";
import { supabaseAdmin, createUserClient } from "../lib/supabase.js";
import { verifyAccessToken } from "../lib/auth.js";

const extractBearer = (headerValue: string | undefined): string | null => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
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

  // ──────────────────────────────────────────────
  // Token In-Memory Cache (Performance Optimization)
  // ──────────────────────────────────────────────
  const now = Date.now();
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
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", appJwt.sub)
      .single();

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

  // ──────────────────────────────────────────────
  // Verify Supabase JWT — lấy user từ auth.users
  // ──────────────────────────────────────────────
  const { data: { user: supaUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !supaUser) {
    console.error("Auth error:", authError?.message);
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  // Lấy thông tin user từ bảng public.users (nếu có)
  // We select only existing columns and handle potential missing ones
  let { data: dbUser, error: dbError } = await supabaseAdmin
    .from("users")
    .select("*") // Select all to avoid explicitly naming missing columns
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

  // Set user info vào context
  c.set("user", userContext);

  // ──────────────────────────────────────────────
  // Tạo per-request Supabase client VỚI user token
  // ──────────────────────────────────────────────
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
