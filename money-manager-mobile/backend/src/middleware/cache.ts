import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";

// Simple in-memory cache alternative to node-cache
const cache = new Map<string, { value: any; expiry: number }>();

export const cacheMiddleware = (ttlSeconds: number) => {
  return createMiddleware<AppEnv>(async (c, next) => {
    // Only cache GET requests
    if (c.req.method !== "GET") {
      return await next();
    }

    const user = c.get("user");
    if (!user) return await next();

    const cacheKey = `${c.req.path}_${user.id}`;
    
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      c.header("X-Cache", "HIT");
      return c.json(cached.value);
    }

    // Intercept response
    await next();

    if (c.res.status === 200) {
      const clonedRes = c.res.clone();
      try {
        const body = await clonedRes.json();
        cache.set(cacheKey, {
          value: body,
          expiry: Date.now() + ttlSeconds * 1000,
        });
        c.header("X-Cache", "MISS");
      } catch (e) {
        // Not JSON, ignore
      }
    }
  });
};

export const invalidateCache = (pathPrefix: string, userId: string) => {
  for (const key of cache.keys()) {
    if (key.startsWith(pathPrefix) && key.endsWith(`_${userId}`)) {
      cache.delete(key);
    }
  }
};
