import { supabaseAdmin } from "../lib/supabase.js";

export type NotificationPreferences = {
  notificationsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  paymentReceivedEnabled: boolean;
  paymentSentEnabled: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notificationsEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  paymentReceivedEnabled: true,
  paymentSentEnabled: true,
};

const toApi = (row: any): NotificationPreferences => ({
  notificationsEnabled: row?.notifications_enabled !== false,
  pushEnabled: row?.push_enabled !== false,
  inAppEnabled: row?.in_app_enabled !== false,
  paymentReceivedEnabled: row?.payment_received_enabled !== false,
  paymentSentEnabled: row?.payment_sent_enabled !== false,
});

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Keep existing behavior until the migration reaches every environment.
    console.warn("Unable to load notification preferences; using defaults:", error.message);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
  return data ? toApi(data) : DEFAULT_NOTIFICATION_PREFERENCES;
}

export async function saveNotificationPreferences(
  userId: string,
  input: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(userId);
  const next = { ...current, ...input };
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .upsert({
      user_id: userId,
      notifications_enabled: next.notificationsEnabled,
      push_enabled: next.pushEnabled,
      in_app_enabled: next.inAppEnabled,
      payment_received_enabled: next.paymentReceivedEnabled,
      payment_sent_enabled: next.paymentSentEnabled,
    }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toApi(data);
}

export async function resolvePaymentNotificationChannels(
  userId: string,
  kind: "received" | "sent",
): Promise<{ inApp: boolean; push: boolean }> {
  const prefs = await getNotificationPreferences(userId);
  const eventEnabled = kind === "received"
    ? prefs.paymentReceivedEnabled
    : prefs.paymentSentEnabled;
  if (!prefs.notificationsEnabled || !eventEnabled) return { inApp: false, push: false };
  return { inApp: prefs.inAppEnabled, push: prefs.pushEnabled };
}
