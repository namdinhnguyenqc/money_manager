import webpush from "web-push";
import { supabaseAdmin } from "../lib/supabase.js";
import { env } from "../config/env.js";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.warn("⚠️  VAPID keys not set — web push notifications disabled.");
    return false;
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT || "mailto:admin@trocare.vn", env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

export function getVapidPublicKey(): string {
  return env.VAPID_PUBLIC_KEY || "";
}

export async function saveWebPushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin.from("web_push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeWebPushSubscription(
  userId: string,
  endpoint: string,
): Promise<{ success: boolean }> {
  await supabaseAdmin
    .from("web_push_subscriptions")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  return { success: true };
}

export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; body: string; icon?: string; url?: string; tag?: string },
): Promise<void> {
  if (!ensureVapid()) return;

  const { data: subs, error } = await supabaseAdmin
    .from("web_push_subscriptions")
    .select("endpoint, p256dh, auth, id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !subs?.length) return;

  const icon = payload.icon || "/brand/app-icons/app-icon-gradient-256.png";
  const message = JSON.stringify({ ...payload, icon });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
          { TTL: 60 * 60 * 24 },
        );
      } catch (err: any) {
        // 410 Gone = browser revoked subscription → deactivate
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabaseAdmin
            .from("web_push_subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
        } else {
          console.error("Web push send error:", err?.message);
        }
      }
    }),
  );
}
