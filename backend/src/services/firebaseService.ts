import { supabaseAdmin } from "../lib/supabase.js";

// Safe dynamic loading of firebase-admin
let firebaseAdminMessaging: any = null;

async function getFirebaseMessaging() {
  if (firebaseAdminMessaging) return firebaseAdminMessaging;

  try {
    const pkg = "firebase-admin";
    const { default: admin } = await import(pkg);
    
    // Only initialize if not already initialized
    if (admin.apps.length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        console.warn("⚠️ Firebase Admin environment variables are incomplete. Push notifications will be mocked.");
        firebaseAdminMessaging = { mocked: true };
        return firebaseAdminMessaging;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
      console.log("🔥 Firebase Admin SDK initialized successfully.");
    }

    firebaseAdminMessaging = admin.messaging();
    return firebaseAdminMessaging;
  } catch (err: any) {
    console.warn("⚠️ firebase-admin module is not installed or failed to initialize. Dynamic push notifications will be mocked.", err.message);
    firebaseAdminMessaging = { mocked: true };
    return firebaseAdminMessaging;
  }
}

export async function registerFcmToken(
  userId: string,
  token: string,
  deviceType: "ios" | "android" | "web",
  deviceName?: string,
  appType: "tenant" | "owner" = "tenant"
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("fcm_tokens")
      .upsert({
        user_id: userId,
        token,
        device_type: deviceType,
        device_name: deviceName || null,
        app_type: appType,
        is_active: true,
        updated_at: now,
      }, {
        onConflict: "user_id,token"
      });

    if (error) {
      console.error("Failed to register FCM token:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error registering FCM token:", err.message);
    return { success: false, error: err.message };
  }
}

export async function unregisterFcmToken(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("fcm_tokens")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("token", token);

    if (error) {
      console.error("Failed to unregister FCM token:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error unregistering FCM token:", err.message);
    return { success: false, error: err.message };
  }
}

export async function sendPushNotification(
  userId: string,
  notification: { title: string; body: string; data?: Record<string, string> }
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  try {
    // 1. Get active tokens for the user
    const { data: tokens, error } = await supabaseAdmin
      .from("fcm_tokens")
      .select("token, id")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error || !tokens || tokens.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    const tokenStrings = tokens.map((t) => t.token);
    const expoTokens = tokenStrings.filter((token) => /^ExponentPushToken\[.+\]$/.test(token));
    const firebaseTokens = tokenStrings.filter((token) => !/^ExponentPushToken\[.+\]$/.test(token));
    let expoSentCount = 0;
    let expoFailedCount = 0;

    if (expoTokens.length > 0) {
      try {
        const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(expoTokens.map((to) => ({
            to,
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            sound: "default",
          }))),
        });
        if (!expoResponse.ok) throw new Error(`Expo push returned ${expoResponse.status}`);
        const payload: any = await expoResponse.json();
        const tickets = Array.isArray(payload?.data) ? payload.data : [];
        expoSentCount = tickets.filter((ticket: any) => ticket?.status === "ok").length;
        expoFailedCount = Math.max(0, expoTokens.length - expoSentCount);
      } catch (expoError: any) {
        expoFailedCount = expoTokens.length;
        console.error("Expo push send failed:", expoError.message);
      }
    }

    if (firebaseTokens.length === 0) {
      return { success: expoFailedCount === 0, sentCount: expoSentCount, failedCount: expoFailedCount };
    }
    const messaging = await getFirebaseMessaging();

    if (!messaging || messaging.mocked) {
      console.info(`[Mock Push Notification] Sent to User ${userId}: "${notification.title}" - "${notification.body}"`);
      return { success: expoFailedCount === 0, sentCount: expoSentCount + firebaseTokens.length, failedCount: expoFailedCount };
    }

    // 2. Send multicast
    const response = await messaging.sendEachForMulticast({
      tokens: firebaseTokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
    });

    let failedCount = 0;
    const tokensToRemove: string[] = [];

    response.responses.forEach((resp: any, idx: number) => {
      if (!resp.success) {
        failedCount++;
        const errCode = resp.error?.code;
        // Clean up invalid or unregistered tokens
        if (
          errCode === "messaging/invalid-registration-token" ||
          errCode === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(firebaseTokens[idx]);
        }
        console.error(`FCM send failed for token ${firebaseTokens[idx].slice(0, 10)}...:`, resp.error?.message);
      }
    });

    if (tokensToRemove.length > 0) {
      await supabaseAdmin
        .from("fcm_tokens")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("token", tokensToRemove);
      console.log(`Deactivated ${tokensToRemove.length} stale/invalid FCM tokens.`);
    }

    return {
      success: true,
      sentCount: expoSentCount + response.successCount,
      failedCount: expoFailedCount + failedCount,
    };
  } catch (err: any) {
    console.error("Error sending push notification:", err.message);
    return { success: false, sentCount: 0, failedCount: 0 };
  }
}

export async function sendMulticastNotification(
  userIds: string[],
  notification: { title: string; body: string; data?: Record<string, string> }
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  try {
    if (userIds.length === 0) return { success: true, sentCount: 0, failedCount: 0 };

    // Get active tokens for all users
    const { data: tokens, error } = await supabaseAdmin
      .from("fcm_tokens")
      .select("token, user_id")
      .in("user_id", userIds)
      .eq("is_active", true);

    if (error || !tokens || tokens.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    const tokenStrings = tokens.map((t) => t.token);
    const messaging = await getFirebaseMessaging();

    if (!messaging || messaging.mocked) {
      console.info(`[Mock Multicast Push] Sent to ${userIds.length} users: "${notification.title}"`);
      return { success: true, sentCount: tokenStrings.length, failedCount: 0 };
    }

    const response = await messaging.sendEachForMulticast({
      tokens: tokenStrings,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
    });

    const tokensToRemove: string[] = [];
    response.responses.forEach((resp: any, idx: number) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === "messaging/invalid-registration-token" ||
          errCode === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(tokenStrings[idx]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await supabaseAdmin
        .from("fcm_tokens")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("token", tokensToRemove);
    }

    return {
      success: true,
      sentCount: response.successCount,
      failedCount: response.failureCount,
    };
  } catch (err: any) {
    console.error("Error sending multicast push notification:", err.message);
    return { success: false, sentCount: 0, failedCount: 0 };
  }
}
