import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";

type CacheEntry = { value: unknown; expiry: number; touchedAt: number };

const memoryCache = new Map<string, CacheEntry>();
const MAX_MEMORY_ENTRIES = 500;
const REDIS_TIMEOUT_MS = 350;
const redisEnabled = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

function requestCacheKey(path: string, search: string, userId: string) {
  return `trocare:cache:v2:${userId}:${path}${search}`;
}

function pruneMemoryCache(now = Date.now()) {
  for (const [key, entry] of memoryCache) {
    if (entry.expiry <= now) memoryCache.delete(key);
  }
  if (memoryCache.size <= MAX_MEMORY_ENTRIES) return;
  const oldest = [...memoryCache.entries()]
    .sort((a, b) => a[1].touchedAt - b[1].touchedAt)
    .slice(0, memoryCache.size - MAX_MEMORY_ENTRIES);
  for (const [key] of oldest) memoryCache.delete(key);
}

async function redisCommand<T>(command: Array<string | number>): Promise<T | null> {
  if (!redisEnabled) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
  try {
    const response = await fetch(env.UPSTASH_REDIS_REST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as { result?: T };
    return payload.result ?? null;
  } catch {
    // Cache is an optimization. Redis outages must never take down the API.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getCachedValue(key: string): Promise<{ value: unknown; source: "MEMORY" | "REDIS" } | null> {
  const now = Date.now();
  const local = memoryCache.get(key);
  if (local && local.expiry > now) {
    local.touchedAt = now;
    return { value: local.value, source: "MEMORY" };
  }
  if (local) memoryCache.delete(key);

  const serialized = await redisCommand<string>(["GET", key]);
  if (!serialized) return null;
  try {
    const entry = JSON.parse(serialized) as { value: unknown; expiry: number };
    if (entry.expiry <= now) return null;
    memoryCache.set(key, { ...entry, touchedAt: now });
    pruneMemoryCache(now);
    return { value: entry.value, source: "REDIS" };
  } catch {
    return null;
  }
}

async function setCachedValue(key: string, value: unknown, ttlSeconds: number) {
  const now = Date.now();
  const entry = { value, expiry: now + ttlSeconds * 1000, touchedAt: now };
  memoryCache.set(key, entry);
  pruneMemoryCache(now);
  await redisCommand(["SET", key, JSON.stringify({ value, expiry: entry.expiry }), "EX", ttlSeconds]);
}

export const cacheMiddleware = (ttlSeconds: number) => {
  return createMiddleware<AppEnv>(async (c, next) => {
    // Only cache GET requests
    if (c.req.method !== "GET") {
      return await next();
    }

    const user = c.get("user");
    if (!user) return await next();

    const search = new URL(c.req.url).search;
    const cacheKey = requestCacheKey(c.req.path, search, user.id);
    const cached = await getCachedValue(cacheKey);
    if (cached) {
      c.header("X-Cache", cached.source);
      return c.json(cached.value);
    }

    // Intercept response
    await next();

    if (c.res.status === 200) {
      const clonedRes = c.res.clone();
      try {
        const body = await clonedRes.json();
        void setCachedValue(cacheKey, body, ttlSeconds);
        c.header("X-Cache", "MISS");
      } catch (e) {
        // Not JSON, ignore
      }
    }
  });
};

export const invalidateCache = (pathPrefix: string, userId: string) => {
  const prefix = `trocare:cache:v2:${userId}:${pathPrefix}`;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }

  // Writes are not delayed by distributed invalidation. SCAN is bounded and
  // performed in the background; short endpoint TTLs remain the safety net.
  if (redisEnabled) void invalidateRedisPrefix(prefix);
};

async function invalidateRedisPrefix(prefix: string) {
  let cursor = "0";
  for (let page = 0; page < 5; page += 1) {
    const result = await redisCommand<[string, string[]]>(["SCAN", cursor, "MATCH", `${prefix}*`, "COUNT", 100]);
    if (!result) return;
    cursor = String(result[0]);
    const keys = result[1] ?? [];
    if (keys.length) await redisCommand(["DEL", ...keys]);
    if (cursor === "0") return;
  }
}
