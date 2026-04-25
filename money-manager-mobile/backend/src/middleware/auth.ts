import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";
import { verifyAccessToken } from "../lib/auth.js";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../lib/supabase.js";

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

  if (env.IS_MOCK && token === "mock-jwt") {
    c.set("user", { id: "mock-user-id", email: "mock@example.com", role: "USER" });
    return await next();
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  // Check user status
  const { data: user, error: findError } = await supabaseAdmin
    .from("users")
    .select("id, status")
    .eq("id", payload.sub)
    .single();

  if (findError || !user) {
    return c.json({ error: "User not found" }, 401);
  }

  if (user.status === "BLOCKED") {
    return c.json({ error: "Account is blocked", code: "ACCOUNT_BLOCKED" }, 403);
  }

  if (user.status === "DELETED") {
    return c.json({ error: "Account is deleted", code: "ACCOUNT_DELETED" }, 403);
  }

  c.set("user", {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    status: payload.status,
  });
  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return c.json({ error: "Admin access required" }, 403);
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
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  status: string;
};