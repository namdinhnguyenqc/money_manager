import { Hono } from "hono";
import { env } from "../config/env.js";
import { runPaymentReminders } from "../services/paymentReminders.js";
import { retryFailedPaymentReminderZalo } from "../services/zaloReminderService.js";
import type { AppEnv } from "../types.js";

const jobsRoutes = new Hono<AppEnv>();

jobsRoutes.post("/payment-reminders", async (c) => {
  if (!env.CRON_SECRET) return c.json({ error: "Cron job is not configured" }, 503);
  const bearer = c.req.header("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const headerSecret = c.req.header("x-cron-secret") || "";
  if (bearer !== env.CRON_SECRET && headerSecret !== env.CRON_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : undefined;
  const [summary, zaloRetries] = await Promise.all([
    runPaymentReminders(today),
    retryFailedPaymentReminderZalo(),
  ]);
  return c.json({ ok: true, data: { reminders: summary, zaloRetries } });
});

export default jobsRoutes;
