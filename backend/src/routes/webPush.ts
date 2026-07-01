import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { getVapidPublicKey, saveWebPushSubscription, removeWebPushSubscription } from "../services/webPushService.js";
import type { AppEnv } from "../types.js";

const webPushRoutes = new Hono<AppEnv>();

// GET /push/vapid-key — return public VAPID key (public, no auth needed)
webPushRoutes.get("/vapid-key", (c) => {
  const key = getVapidPublicKey();
  if (!key) return c.json({ error: "Push notifications not configured" }, 503);
  return c.json({ publicKey: key });
});

// POST /push/subscribe — save browser PushSubscription (requires auth)
webPushRoutes.post("/subscribe", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const body = await c.req.json().catch(() => null);

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return c.json({ error: "Invalid subscription object" }, 400);
  }

  const userAgent = c.req.header("user-agent");
  const result = await saveWebPushSubscription(userId, body, userAgent);
  if (!result.success) return c.json({ error: result.error }, 500);
  return c.json({ success: true });
});

// DELETE /push/subscribe — remove subscription (requires auth)
webPushRoutes.delete("/subscribe", requireAuth, async (c) => {
  const user = c.get("user");
  const userId = user.id;
  const body = await c.req.json().catch(() => null);
  if (!body?.endpoint) return c.json({ error: "endpoint required" }, 400);
  await removeWebPushSubscription(userId, body.endpoint);
  return c.json({ success: true });
});

export { webPushRoutes };
