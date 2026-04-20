import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";
import { supabaseAuth } from "../lib/supabase.js";
import { env } from "../config/env.js"; // Added

const extractBearer = (headerValue: string | undefined): string | null => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = extractBearer(c.req.header("Authorization"));
  if (!token) {
    return c.json({ error: "Missing bearer token" }, 401);
  }

  if (env.IS_MOCK && token === "mock-jwt") {
    c.set("user", { id: "mock-user-id", email: "mock@example.com" });
    return await next();
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("user", { id: data.user.id, email: data.user.email ?? null });
  await next();
});
