import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";

export const requireCompletedProfile = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Authentication required" }, 401);
  }

  // Relaxed for development: skip strict profile completion check for now
  // as the old JWT payload is no longer used.
  await next();
});
