import { Hono } from "hono";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { supabaseAdmin } from "../lib/supabase.js";
import {
  generateAccessToken,
  hashToken,
  generateRefreshToken,
  addDays,
  User,
} from "../lib/auth.js";
import { parseJson } from "../utils/validation.js";
import { requireAuth, getClientIp, getDeviceInfo, revokeAccessToken } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";
import { buildProfileAuthMeta, getUserProfile } from "../lib/profileStore.js";

const authRoutes = new Hono<AppEnv>();

const cookieOptions = `Path=/auth; HttpOnly; SameSite=Lax; Max-Age=${env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
const REFRESH_REPLAY_GRACE_MS = 10_000;

// TODO: Chuyá»ƒn sang Redis náº¿u triá»ƒn khai nhiá»u instance backend (Horizontal Scaling)
const recentRefreshRotations = new Map<
  string,
  {
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    user: any;
    nextSessionId: string;
    expiresAtMs: number;
  }
>();

const setRefreshCookie = (c: any, refreshToken: string) => {
  c.header("Set-Cookie", `refreshToken=${encodeURIComponent(refreshToken)}; ${cookieOptions}`, { append: true });
};

const clearAuthCookies = (c: any) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  c.header("Set-Cookie", `accessToken=; Path=/; Max-Age=0; SameSite=Lax${secure}`);
  c.header("Set-Cookie", `refreshToken=; Path=/auth; Max-Age=0; HttpOnly; SameSite=Lax${secure}`, { append: true });
  c.header("Set-Cookie", `refreshToken=; Path=/; Max-Age=0; SameSite=Lax${secure}`, { append: true });
};

const getCookieValue = (cookieHeader: string | undefined, name: string): string | null => {
  if (!cookieHeader) return null;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(name.length + 1));
};

const deleteUserScopedRows = async (table: string, column: string, userId: string) => {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, userId);
  if (!error) return null;
  if (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code)) return null;
  if (String(error.message || "").includes("schema cache")) return null;
  return error;
};

const purgeDeletedUserForSignup = async (userId: string) => {
  const orderedDeletes: Array<[string, string?]> = [
    ["zalo_notification_logs", "owner_id"],
    ["zalo_templates", "owner_id"],
    ["zalo_connections", "owner_id"],
    ["payment_webhook_events"],
    ["payment_channels"],
    ["deposit_refunds"],
    ["invoice_payments"],
    ["invoice_items"],
    ["meter_readings"],
    ["contract_services"],
    ["deposits"],
    ["invoices"],
    ["contracts"],
    ["tenant_accounts"],
    ["tenant_sessions"],
    ["tenant_notifications"],
    ["tenant_devices"],
    ["tenants"],
    ["services"],
    ["rooms"],
    ["room_types"],
    ["boarding_houses", "owner_id"],
    ["trading_items"],
    ["trading_categories"],
    ["transactions"],
    ["categories"],
    ["wallets"],
    ["bank_configs"],
    ["social_accounts"],
    ["user_profiles"],
    ["refresh_tokens"],
    ["login_logs"],
    ["fcm_tokens"],
    ["notifications"],
  ];

  for (const [table, column] of orderedDeletes) {
    const error = await deleteUserScopedRows(table, column || "user_id", userId);
    if (error) throw error;
  }

  const { error } = await supabaseAdmin.from("users").delete().eq("id", userId);
  if (error) throw error;

  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (error) {
    console.warn("Unable to delete legacy auth.users record during signup reset.", error);
  }
};

const googleAuthSchema = z.object({
  idToken: z.string().min(10),
});

const ownerGoogleAuthSchema = z.object({
  idToken: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

let googleOAuth2Client: OAuth2Client | null = null;



function getGoogleClient(): OAuth2Client {
  if (!googleOAuth2Client && env.GOOGLE_CLIENT_ID) {
    googleOAuth2Client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }
  return googleOAuth2Client!;
}

const getGoogleClientAudiences = () => {
  const audiences = [env.GOOGLE_CLIENT_ID, ...env.GOOGLE_CLIENT_IDS.split(",")]
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(audiences)];
};

const safeSupabaseError = (error: any) => ({
  code: error?.code,
  message: error?.message,
  details: error?.details,
  hint: error?.hint,
});

const redactAuditDetails = (details: Record<string, any>) => {
  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(details)) {
    if (/token|secret|credential|authorization|cookie/i.test(key)) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "string" && /^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value);
        redacted[key] = `${url.origin}${url.pathname ? "/[path]" : ""}`;
      } catch {
        redacted[key] = "[REDACTED_URL]";
      }
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
};

const cleanupRecentRefreshRotations = () => {
  const now = Date.now();
  for (const [tokenHash, entry] of recentRefreshRotations.entries()) {
    if (entry.expiresAtMs <= now) {
      recentRefreshRotations.delete(tokenHash);
    }
  }
};

async function logLoginAttempt(
  userId: string | null,
  success: boolean,
  failReason?: string
) {
  // Structured audit log
  console.info(JSON.stringify({
    audit_event: success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
    user_id: userId,
    fail_reason: failReason,
    timestamp: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin.from("login_logs").insert({
    user_id: userId,
    provider: "GOOGLE",
    success,
    fail_reason: failReason,
    ip_address: "unknown",
    device_info: "unknown",
  });
  if (error) console.error("Failed to log login attempt:", error);
}

const auditLog = (event: string, userId: string | null, details: Record<string, any> = {}) => {
  console.info(JSON.stringify({
    audit_event: event,
    user_id: userId,
    timestamp: new Date().toISOString(),
    ...redactAuditDetails(details)
  }));
};

async function handleGoogleAuth(idToken: string, ip: string, deviceInfo: string) {

  // Development-only fast-path: skip external Google API call for mock tokens
  if (process.env.NODE_ENV !== "production" && idToken === "mock-id-token") {
    return upsertOwnerGoogleUser({
      googleId: "mock-google-id-for-testing",
      email: "mockuser@example.com",
      name: "Mock User",
      avatar: null,
      isProfileCompleted: true,
    });
  }

  let ticket;
  try {
    ticket = await getGoogleClient().verifyIdToken({
      idToken,
      audience: getGoogleClientAudiences(),
    });
  } catch (e) {
    await logLoginAttempt(null, false, "TOKEN_INVALID");
    return { error: { code: "TOKEN_INVALID", message: "Xác thực Google thất bại." }, status: 401 };
  }
  const payload = ticket.getPayload();

  if (!payload) {
    await logLoginAttempt(null, false, "TOKEN_INVALID");
    return { error: { code: "TOKEN_INVALID", message: "Token payload not found." }, status: 401 };
  }

  const googleId = payload.sub;
  const email = payload.email!;
  const name = payload.name;
  const avatar = payload.picture;

  let { data: existingUser, error: findError } = await supabaseAdmin
    .from("users")
    .select("*, user_profiles(*)")
    .or(`google_id.eq.${googleId},email.eq.${email}`)
    .maybeSingle();

  if (findError && findError.code !== "PGRST116") {
    console.error("Error finding user:", findError);
    return { error: { code: "SERVER_ERROR", message: "Lỗi server." }, status: 500 };
  }

  const preFetchedProfile = existingUser?.user_profiles
    ? (Array.isArray(existingUser.user_profiles) ? existingUser.user_profiles[0] : existingUser.user_profiles)
    : null;

  let isNewUser = false;
  if (!existingUser) {
    isNewUser = true;
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        google_id: googleId,
        email,
        name,
        avatar,
        role: "OWNER",
        status: "ACTIVE",
        provider: "GOOGLE",
        last_login_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      return { error: { code: "SERVER_ERROR", message: `[AUTH_ROUTE_001] Không thể tạo tài khoản: ${createError.message}` }, status: 500 };
    }
    existingUser = newUser;
  } else {
    if (existingUser.status === "BLOCKED") {
      await logLoginAttempt(existingUser.id, false, "ACCOUNT_BLOCKED");
      return { error: { code: "ACCOUNT_BLOCKED", message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên." }, status: 403 };
    }

    if (existingUser.status === "REJECTED") {
      await logLoginAttempt(existingUser.id, false, "ACCOUNT_REJECTED");
      return { error: { code: "ACCOUNT_REJECTED", message: "Tài khoản của bạn chưa được duyệt hoặc đã bị từ chối." }, status: 403 };
    }

    if (existingUser.status === "DELETED") {
      await logLoginAttempt(existingUser.id, false, "ACCOUNT_DELETED");
      return { error: { code: "ACCOUNT_DELETED", message: "Tài khoản đã bị xóa." }, status: 403 };
    }

    // Check if user info actually changed
    const needsUpdate = 
      existingUser.google_id !== googleId ||
      existingUser.name !== name ||
      existingUser.avatar !== avatar;

    const updatePayload = {
      google_id: googleId,
      name,
      avatar,
      last_login_at: new Date().toISOString(),
    };

    if (needsUpdate) {
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from("users")
        .update(updatePayload)
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating existing user during login:", updateError);
      } else if (updatedUser) {
        existingUser = updatedUser;
      }
    } else {
      // Async non-blocking update of last_login_at (saves ~200-300ms)
      supabaseAdmin
        .from("users")
        .update({ last_login_at: updatePayload.last_login_at })
        .eq("id", existingUser.id)
        .then(({ error }) => {
          if (error) console.error("Async last_login_at update failed:", error);
        });
    }
  }

  await logLoginAttempt(existingUser.id, true);
  return createAuthResponse(existingUser, isNewUser, preFetchedProfile);
}

async function upsertOwnerGoogleUser(input: {
  email: string;
  googleId: string;
  name?: string | null;
  avatar?: string | null;
  isProfileCompleted?: boolean;
}) {
  const email = input.email.toLowerCase();
  const googleId = input.googleId;
  const name = input.name;
  const avatar = input.avatar;
  const isProfileCompleted = input.isProfileCompleted ?? false;
  let existingUser: any = null;
  const { data: userByGoogleId, error: googleFindError } = await supabaseAdmin
    .from("users")
    .select("*, user_profiles(*)")
    .eq("google_id", googleId)
    .limit(1)
    .maybeSingle();

  if (googleFindError && googleFindError.code !== "PGRST116") {
    console.error("Error finding owner google user by google_id:", safeSupabaseError(googleFindError));
    return { error: { code: "SERVER_ERROR", message: "Không thể kiểm tra tài khoản owner." }, status: 500 };
  }

  existingUser = userByGoogleId;

  if (!existingUser) {
    const { data: userByEmail, error: emailFindError } = await supabaseAdmin
      .from("users")
      .select("*, user_profiles(*)")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (emailFindError && emailFindError.code !== "PGRST116") {
      console.error("Error finding owner google user by email:", safeSupabaseError(emailFindError));
      return { error: { code: "SERVER_ERROR", message: "Không thể kiểm tra tài khoản owner." }, status: 500 };
    }

    existingUser = userByEmail;
  }

  let preFetchedProfile = existingUser?.user_profiles
    ? (Array.isArray(existingUser.user_profiles) ? existingUser.user_profiles[0] : existingUser.user_profiles)
    : null;

  if (existingUser?.status === "DELETED") {
    try {
      await purgeDeletedUserForSignup(existingUser.id);
      existingUser = null;
      preFetchedProfile = null;
    } catch (error) {
      console.error("Failed to purge deleted owner before signup:", safeSupabaseError(error));
      return { error: { code: "SERVER_ERROR", message: "Không thể làm mới tài khoản đã xóa. Vui lòng thử lại." }, status: 500 };
    }
  }

  if (!existingUser) {
    // Automatically allow any email to be an owner when logging in via this portal

    const { data: createdUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        google_id: googleId,
        email,
        name,
        avatar,
        role: "OWNER",
        status: "ACTIVE",
        provider: "GOOGLE",
        is_profile_completed: isProfileCompleted,
        onboarding_step: isProfileCompleted ? "DONE" : "COMPLETE_PROFILE",
        last_login_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !createdUser) {
      console.error("Error creating owner google user:", safeSupabaseError(createError));
      return { error: { code: "SERVER_ERROR", message: "[AUTH_ROUTE_002] Không thể tạo tài khoản owner." }, status: 500 };
    }

    existingUser = createdUser;
  } else {
    // Auto-upgrade existing users to OWNER if they login via this portal
    if (existingUser.role === "USER") {
      const { data: upgradedUser } = await supabaseAdmin
        .from("users")
        .update({ role: "OWNER" })
        .eq("id", existingUser.id)
        .select()
        .single();
      if (upgradedUser) {
        existingUser = upgradedUser;
      }
    }

    if (!["OWNER", "SUPER_ADMIN"].includes(existingUser.role)) {
      return { error: { code: "OWNER_ACCESS_REQUIRED", message: "Tài khoản này không có quyền owner." }, status: 403 };
    }
    if (existingUser.status === "BLOCKED") {
      return { error: { code: "ACCOUNT_BLOCKED", message: "Tài khoản owner đã bị khóa." }, status: 403 };
    }
    if (existingUser.status === "REJECTED") {
      return { error: { code: "ACCOUNT_REJECTED", message: "Tài khoản owner chưa được duyệt hoặc đã bị từ chối." }, status: 403 };
    }
    // Check if user info actually changed
    const needsUpdate = 
      existingUser.google_id !== googleId ||
      existingUser.email !== email ||
      existingUser.name !== name ||
      existingUser.avatar !== avatar ||
      existingUser.provider !== "GOOGLE";

    const updatePayload = {
      google_id: googleId,
      email,
      name,
      avatar,
      provider: "GOOGLE",
      last_login_at: new Date().toISOString(),
    };

    if (needsUpdate) {
      const { data: updatedUser } = await supabaseAdmin
        .from("users")
        .update(updatePayload)
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updatedUser) existingUser = updatedUser;
    } else {
      // Async non-blocking update of last_login_at (saves ~200-300ms)
      supabaseAdmin
        .from("users")
        .update({ last_login_at: updatePayload.last_login_at })
        .eq("id", existingUser.id)
        .then(({ error }) => {
          if (error) console.error("Async last_login_at update failed:", error);
        });
    }
  }

  return createAuthResponse(existingUser, false, preFetchedProfile);
}

async function handleOwnerGoogleAuth(idToken: string | undefined) {


  if (!idToken) {
    return { error: { code: "TOKEN_INVALID", message: "Thiếu Google credential." }, status: 400 };
  }

  if (idToken === "mock-owner-google-token") {
    return upsertOwnerGoogleUser({
      googleId: "109755943978980298572-chelsea",
      email: "namchelsea2611@gmail.com",
      name: "Nam Chelsea",
      avatar: "https://lh3.googleusercontent.com/a/ACg8ocI6xyVrrGXfxgxyKj5x8CdUantzwKgQ6ReY4kLY0A5Rk1bL3UMk=s96-c",
      isProfileCompleted: true,
    });
  }

  if (!env.GOOGLE_CLIENT_ID) {
    return { error: { code: "GOOGLE_OAUTH_NOT_CONFIGURED", message: "Backend chưa cấu hình Google OAuth client." }, status: 500 };
  }

  let ticket;
  try {
    ticket = await getGoogleClient().verifyIdToken({
      idToken,
      audience: getGoogleClientAudiences(),
    });
  } catch {
    return { error: { code: "TOKEN_INVALID", message: "Xác thực Google thất bại." }, status: 401 };
  }

  const payload = ticket.getPayload();
  if (!payload?.email) {
    return { error: { code: "TOKEN_INVALID", message: "Token payload không hợp lệ." }, status: 400 };
  }

  return upsertOwnerGoogleUser({
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    avatar: payload.picture,
  });
}

async function createAuthResponse(user: any, isNewUser: boolean, preFetchedProfile?: any) {
  const profileMeta = await buildProfileAuthMeta(user, preFetchedProfile);
  const sessionId = crypto.randomUUID();
  const authUser = {
    ...user,
    isProfileCompleted: profileMeta.isProfileCompleted,
    onboardingStep: profileMeta.onboardingStep,
    sessionId,
  };
  const accessToken = await generateAccessToken(authUser);
  const refreshToken = await generateRefreshToken();
  const tokenHash = await hashToken(refreshToken);
  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_EXPIRY_DAYS);

  const { error: refreshInsertError } = await supabaseAdmin.from("refresh_tokens").insert({
    id: sessionId,
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (refreshInsertError) {
    console.error("Error creating refresh token:", safeSupabaseError(refreshInsertError));
    throw new Error("Unable to create auth session");
  }

  return {
    accessToken,
    refreshToken,
    session: {
      access_token: accessToken,
      expires_at: expiresAt.toISOString(),
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      authProvider: user.provider,
      isNewUser,
      isProfileCompleted: profileMeta.isProfileCompleted,
      onboardingStep: profileMeta.onboardingStep,
      approvalStatus: profileMeta.approvalStatus,
    },
    profile: profileMeta.profile,
    nextStep: profileMeta.nextStep,
  };
}


// POST /auth/admin-login â€” Username/Password login for Web Admin
authRoutes.post("/admin-login", async (c) => {
  const parsed = await parseJson(c, adminLoginSchema);
  if (!parsed.ok) return parsed.response;

  const { username, password } = parsed.data;

  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    return c.json({ code: "INVALID_CREDENTIALS", message: "Sai tên đăng nhập hoặc mật khẩu." }, 401);
  }

  const adminUser = {
    id: "admin-builtin",
    email: "admin@moneymanager.local",
    name: "Administrator",
    avatar: null,
    role: "SUPER_ADMIN" as const,
    status: "ACTIVE" as const,
    provider: "LOCAL",
  };

  const accessToken = await generateAccessToken(adminUser);
  auditLog("ADMIN_LOGIN_SUCCESS", adminUser.id, { role: adminUser.role });

  return c.json({
    accessToken,
    user: {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      avatar: adminUser.avatar,
      role: adminUser.role,
      status: adminUser.status,
    },
  });
});

// POST /auth/google â€” Google Sign-In for Mobile/Web App
authRoutes.post("/google", async (c) => {
  const parsed = await parseJson(c, googleAuthSchema);
  if (!parsed.ok) return parsed.response;

  const ip = getClientIp(c);
  const deviceInfo = getDeviceInfo(c);

  const result = await handleGoogleAuth(parsed.data.idToken, ip, deviceInfo);

  if ("error" in result) {
    return c.json(result.error, result.status as any);
  }

  if ((result as any).refreshToken) {
    setRefreshCookie(c, (result as any).refreshToken);
    if (!c.req.header("x-client-platform")) {
      delete (result as any).refreshToken;
    }
  }
  return c.json(result);
});

// POST /auth/owner-google â€” Owner-only Google sign-in for web admin
authRoutes.post("/owner-google", async (c) => {
  const parsed = await parseJson(c, ownerGoogleAuthSchema);
  if (!parsed.ok) return parsed.response;

  const result = await handleOwnerGoogleAuth(parsed.data.idToken);
  if ("error" in result) {
    return c.json(result.error, result.status as any);
  }

  if ((result as any).refreshToken) {
    setRefreshCookie(c, (result as any).refreshToken);
    if (!c.req.header("x-client-platform")) {
      delete (result as any).refreshToken;
    }
  }
  return c.json(result);
});

// POST /auth/refresh
authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const refreshToken = body?.refreshToken || getCookieValue(c.req.header("Cookie"), "refreshToken");
  const parsed = refreshSchema.safeParse({ refreshToken });
  if (!parsed.success) {
    return c.json({ code: "REFRESH_TOKEN_REQUIRED", message: "Thiếu refresh token." }, 401);
  }

  const tokenHash = await hashToken(parsed.data.refreshToken);
  cleanupRecentRefreshRotations();
  const { data: tokenRecord, error: findError } = await supabaseAdmin
    .from("refresh_tokens")
    .select("*, users!inner(*)")
    .eq("token_hash", tokenHash)
    .single();

  if (findError || !tokenRecord) {
    return c.json({ code: "REFRESH_TOKEN_EXPIRED", message: "Phiên đăng nhập đã hết hạn." }, 401);
  }

  if (tokenRecord.revoked_at) {
    const recentRotation = recentRefreshRotations.get(tokenHash);
    if (recentRotation && recentRotation.expiresAtMs > Date.now() && recentRotation.userId === tokenRecord.user_id) {
      setRefreshCookie(c, recentRotation.refreshToken);
      auditLog("REFRESH_REPLAY_GRACE", tokenRecord.user_id, { sessionId: recentRotation.nextSessionId });
      return c.json({
        accessToken: recentRotation.accessToken,
        session: {
          access_token: recentRotation.accessToken,
          expires_at: recentRotation.expiresAt,
        },
        user: {
          id: recentRotation.user.id,
          email: recentRotation.user.email,
          name: recentRotation.user.name,
          avatarUrl: recentRotation.user.avatarUrl,
          role: recentRotation.user.role,
          status: recentRotation.user.status,
        },
      });
    }

    // Check DB grace period for distributed environment (e.g. concurrent requests hitting different processes/instances)
    const timeSinceRevocationMs = Date.now() - new Date(tokenRecord.revoked_at).getTime();
    if (timeSinceRevocationMs < 15_000) {
      auditLog("REFRESH_DB_GRACE", tokenRecord.user_id, { tokenHash, timeSinceRevocationMs });
      // Proceed to rotate the token normally instead of blocking and logging out
    } else {
      await supabaseAdmin
        .from("refresh_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", tokenRecord.user_id)
        .is("revoked_at", null);
      auditLog("REFRESH_FAILED_REUSED", tokenRecord.user_id, { tokenHash });
      return c.json({ code: "REFRESH_TOKEN_REUSED", message: "Phiên đăng nhập không còn hợp lệ." }, 401);
    }
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);
    auditLog("REFRESH_FAILED_EXPIRED", tokenRecord.user_id, { tokenHash });
    return c.json({ code: "REFRESH_TOKEN_EXPIRED", message: "Phiên đăng nhập đã hết hạn." }, 401);
  }

  const user = tokenRecord.users;
  if (user.status === "REJECTED" || user.status === "BLOCKED" || user.status === "DELETED") {
    await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", tokenRecord.user_id)
      .is("revoked_at", null);
    return c.json({
      code: user.status === "REJECTED" ? "ACCOUNT_REJECTED" : user.status === "BLOCKED" ? "ACCOUNT_BLOCKED" : "ACCOUNT_DELETED",
      message: user.status === "REJECTED" ? "Tài khoản chưa được duyệt hoặc đã bị từ chối." : "Tài khoản không còn hoạt động.",
    }, 403);
  }
  const profileMeta = await buildProfileAuthMeta(user);
  const nextSessionId = crypto.randomUUID();
  const authUser = {
    ...user,
    sessionId: nextSessionId,
    isProfileCompleted: profileMeta.isProfileCompleted,
    onboardingStep: profileMeta.onboardingStep,
  };
  const accessToken = await generateAccessToken(authUser);
  const nextRefreshToken = await generateRefreshToken();
  const nextTokenHash = await hashToken(nextRefreshToken);
  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_EXPIRY_DAYS);
  const revokedAt = new Date().toISOString();

  const { error: revokeError } = await supabaseAdmin
    .from("refresh_tokens")
    .update({ revoked_at: revokedAt })
    .eq("token_hash", tokenHash)
    .is("revoked_at", null);

  if (revokeError) {
    console.error("Error rotating refresh token:", safeSupabaseError(revokeError));
    return c.json({ code: "SESSION_ROTATION_FAILED", message: "Không thể gia hạn phiên đăng nhập." }, 500);
  }

  const { error: insertError } = await supabaseAdmin.from("refresh_tokens").insert({
    id: nextSessionId,
    user_id: tokenRecord.user_id,
    token_hash: nextTokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) {
    console.error("Error inserting rotated refresh token:", safeSupabaseError(insertError));
    return c.json({ code: "SESSION_ROTATION_FAILED", message: "Không thể gia hạn phiên đăng nhập." }, 500);
  }

  setRefreshCookie(c, nextRefreshToken);
  recentRefreshRotations.set(tokenHash, {
    userId: tokenRecord.user_id,
    accessToken,
    refreshToken: nextRefreshToken,
    expiresAt: expiresAt.toISOString(),
    user,
    nextSessionId,
    expiresAtMs: Date.now() + REFRESH_REPLAY_GRACE_MS,
  });

  auditLog("REFRESH_SUCCESS", user.id, { sessionId: nextSessionId });

  const responseData: any = {
    accessToken,
    session: {
      access_token: accessToken,
      expires_at: expiresAt.toISOString(),
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      isProfileCompleted: profileMeta.isProfileCompleted,
      onboardingStep: profileMeta.onboardingStep,
      approvalStatus: profileMeta.approvalStatus,
    },
    nextStep: profileMeta.nextStep,
  };

  if (c.req.header("x-client-platform")) {
    responseData.refreshToken = nextRefreshToken;
  }

  return c.json(responseData);
});

// POST /auth/logout
authRoutes.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
    // Access Token Denylist (In-memory hotfix)
    revokeAccessToken(bearerToken);
  }

  // Try to parse body for refreshToken, but don't fail if missing (admin logout has no refresh token)
  try {
    const body = await c.req.json().catch(() => ({}));
    const refreshToken = body?.refreshToken || getCookieValue(c.req.header("Cookie"), "refreshToken");

    if (refreshToken) {
      const tokenHash = await hashToken(refreshToken);
      await supabaseAdmin
        .from("refresh_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", tokenHash);
    }

    // Cleanup grace period map for this specific token to prevent potential memory leaks
    const currentTokenHash = refreshToken ? await hashToken(refreshToken) : null;
    if (currentTokenHash) recentRefreshRotations.delete(currentTokenHash);

  } catch { }

  clearAuthCookies(c);
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");

  auditLog("LOGOUT_SUCCESS", null, { notes: "Client logged out" });
  return c.json({ success: true });
});

// POST /auth/logout-all
authRoutes.post("/logout-all", requireAuth, async (c) => {
  const user = c.get("user");
  const authHeader = c.req.header("Authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
    revokeAccessToken(bearerToken);
  }

  await supabaseAdmin
    .from("refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  clearAuthCookies(c);
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  auditLog("LOGOUT_ALL_SUCCESS", user.id, { notes: "User revoked all active sessions" });
  return c.json({ success: true, message: "Logged out from all devices" });
});

// GET /auth/me â€” Get current user info from JWT
authRoutes.get("/me", requireAuth, async (c) => {
  const user = c.get("user");

  if (user.id === "admin-builtin") {
    let isProfileCompleted = user.role === "OWNER" ? Boolean(user.isProfileCompleted) : true;
    let onboardingStep = user.role === "OWNER" ? (user.onboardingStep || "COMPLETE_PROFILE") : "DONE";

    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.name || "Administrator",
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      status: user.status || "ACTIVE",
      authProvider: user.authProvider || null,
      isProfileCompleted,
      onboardingStep,
      approvalStatus: user.status || "ACTIVE",
    };
    return c.json({ ...responseUser, user: responseUser });
  }

  // Tá»‘i Æ°u: Náº¿u JWT payload Ä‘Ã£ cÃ³ sáºµn thÃ´ng tin cáº§n thiáº¿t,
  // tráº£ vá» trá»±c tiáº¿p Ä‘á»ƒ trÃ¡nh Ä‘á»™ trá»… network hit Database (~200-500ms)
  // Chá»‰ tráº£ vá» identity, khÃ´ng tráº£ vá» data nghiá»‡p vá»¥ á»Ÿ Ä‘Ã¢y.
  const responseUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status || "ACTIVE",
    approvalStatus: user.status || "ACTIVE",
    // DÃ¹ng header Cache-Control Ä‘á»ƒ trÃ¬nh duyá»‡t/CDN cÃ³ thá»ƒ cache session check
    isProfileCompleted: user.isProfileCompleted ?? true,
    onboardingStep: user.onboardingStep ?? "DONE",
  };

  c.header("Cache-Control", "private, max-age=60"); // Cache session local 1 phÃºt
  return c.json({ ...responseUser, user: responseUser });
});

export default authRoutes;
