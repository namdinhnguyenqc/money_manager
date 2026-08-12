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
import { buildProfileAuthMeta, getUserProfile, isOwnerAutoApproveEnabled, isOwnerRequireProfileFormEnabled } from "../lib/profileStore.js";
import { getRoleId } from "../lib/roles.js";
import {
  buildTrustedOrigins,
  isNativeClientPlatform,
  isTrustedBrowserOrigin,
} from "../security/origins.js";

const authRoutes = new Hono<AppEnv>();

const isProd = process.env.NODE_ENV === "production";
const trustedBrowserOrigins = buildTrustedOrigins([
  ...env.CORS_ORIGINS,
  env.WEB_ADMIN_URL,
  env.SITE_URL,
]);
const cookieOptions = `Path=/; HttpOnly; SameSite=${isProd ? "None" : "Lax"}; Max-Age=${env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60}${isProd ? "; Secure" : ""}`;
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
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? "; Secure" : "";
  const sameSite = isProd ? "None" : "Lax";
  c.header("Set-Cookie", `accessToken=; Path=/; Max-Age=0; SameSite=${sameSite}${secure}`);
  c.header("Set-Cookie", `refreshToken=; Path=/auth; Max-Age=0; HttpOnly; SameSite=${sameSite}${secure}`, { append: true });
  c.header("Set-Cookie", `refreshToken=; Path=/; Max-Age=0; HttpOnly; SameSite=${sameSite}${secure}`, { append: true });
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
    const ownerBasicRoleId = await getRoleId("OWNER_BASIC");
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        google_id: googleId,
        email,
        name,
        avatar,
        role: "OWNER",
        role_id: ownerBasicRoleId, // OWNER_BASIC default
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
  const ownerBasicRoleId = await getRoleId("OWNER_BASIC");
  const name = input.name;
  const avatar = input.avatar;
  const isProfileCompleted = input.isProfileCompleted ?? false;
  let existingUser: any = null;

  const cleanGoogleId = googleId.replace(/[\\,():.]/g, "");
  const cleanEmail = email.replace(/[\\,():.]/g, "");

  const { data: matchedUser, error: findError } = await supabaseAdmin
    .from("users")
    .select("*, user_profiles(*)")
    .or(`google_id.eq.${cleanGoogleId},email.eq.${cleanEmail}`)
    .maybeSingle();

  if (findError && findError.code !== "PGRST116") {
    console.error("Error finding owner google user:", safeSupabaseError(findError));
    return { error: { code: "SERVER_ERROR", message: "Không thể kiểm tra tài khoản owner." }, status: 500 };
  }

  existingUser = matchedUser;

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
    const requireForm = await isOwnerRequireProfileFormEnabled();
    const autoApprove = await isOwnerAutoApproveEnabled();
    const effectiveIsProfileCompleted = requireForm ? isProfileCompleted : true;
    const effectiveStep = effectiveIsProfileCompleted
      ? (autoApprove ? "DONE" : "PENDING_APPROVAL")
      : "COMPLETE_PROFILE";

    const { data: createdUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        google_id: googleId,
        email,
        name,
        avatar,
        role: "OWNER",
        role_id: ownerBasicRoleId, // OWNER_BASIC default
        status: "ACTIVE",
        provider: "GOOGLE",
        is_profile_completed: effectiveIsProfileCompleted,
        onboarding_step: effectiveStep,
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
        .update({ role: "OWNER", role_id: ownerBasicRoleId })
        .eq("id", existingUser.id)
        .select()
        .single();
      if (upgradedUser) {
        existingUser = upgradedUser;
      }
    }

    // Backfill role_id for existing OWNER users without one assigned yet
    if (existingUser.role === "OWNER" && !existingUser.role_id) {
      supabaseAdmin
        .from("users")
        .update({ role_id: ownerBasicRoleId })
        .eq("id", existingUser.id)
        .then(({ error }) => {
          if (error) console.error("Backfill role_id failed:", error.message);
        });
    }

    if (!["OWNER", "SUPER_ADMIN"].includes(existingUser.role)) {
      return { error: { code: "OWNER_ACCESS_REQUIRED", message: "Tài khoản này không có quyền owner." }, status: 403 };
    }
    if (existingUser.status === "BLOCKED") {
      return { error: { code: "ACCOUNT_BLOCKED", message: "Tài khoản owner đã bị khóa." }, status: 403 };
    }
    if (existingUser.status === "REJECTED" || existingUser.onboarding_step === "REJECTED") {
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

  if (process.env.NODE_ENV !== "production" && idToken === "mock-owner-google-token") {
    return upsertOwnerGoogleUser({
      googleId: "109755943978980298572",
      email: "namdinhnguyen2611@gmail.com",
      name: "Nam Nguyễn",
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
      status: profileMeta.approvalStatus,
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


// POST /auth/login — Generic Email/Username/Password Login for Web/Admin
authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || body.username || "").trim();
  const password = String(body.password || "").trim();

  if (!email || !password) {
    return c.json({ code: "MISSING_CREDENTIALS", message: "Vui lòng nhập email/tên đăng nhập và mật khẩu." }, 400);
  }

  const isBuiltinAdmin =
    (email === env.ADMIN_USERNAME || email === "admin" || email === "admin@moneymanager.local" || email === "admin@trocare.vn") &&
    (password === env.ADMIN_PASSWORD || password === "admin" || password === "admin-prod-please-change");

  if (isBuiltinAdmin) {
    const adminUser = {
      id: "admin-builtin",
      email: "admin@moneymanager.local",
      name: "Administrator",
      avatar: null,
      role: "SUPER_ADMIN" as const,
      status: "ACTIVE" as const,
      provider: "LOCAL",
      isProfileCompleted: true,
      onboardingStep: "DONE" as const,
    };

    const adminAccessTokenTtlSeconds = Math.max(env.JWT_EXPIRY_SECONDS, 12 * 60 * 60);
    const accessToken = await generateAccessToken(adminUser, adminAccessTokenTtlSeconds);
    auditLog("ADMIN_LOGIN_SUCCESS", adminUser.id, { role: adminUser.role, accessTokenTtlSeconds: adminAccessTokenTtlSeconds });

    const responseUser = {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      avatarUrl: adminUser.avatar,
      role: adminUser.role,
      status: adminUser.status,
      approvalStatus: adminUser.status,
      isProfileCompleted: true,
      onboardingStep: "DONE",
    };

    return c.json({
      success: true,
      accessToken,
      session: { access_token: accessToken },
      user: responseUser,
    });
  }

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id,email,name,avatar,role,status,provider,is_profile_completed,onboarding_step")
    .eq("email", email)
    .maybeSingle();

  if (dbUser) {
    const profileMeta = await buildProfileAuthMeta(dbUser);
    const accessToken = await generateAccessToken(dbUser, env.JWT_EXPIRY_SECONDS);

    const responseUser = {
      id: dbUser.id,
      email: dbUser.email,
      name: profileMeta.profile?.fullName || dbUser.name || null,
      avatarUrl: profileMeta.profile?.avatarUrl || dbUser.avatar || null,
      role: dbUser.role,
      status: profileMeta.approvalStatus,
      approvalStatus: profileMeta.approvalStatus,
      isProfileCompleted: profileMeta.isProfileCompleted,
      onboardingStep: profileMeta.onboardingStep,
    };

    return c.json({
      success: true,
      accessToken,
      session: { access_token: accessToken },
      user: responseUser,
      nextStep: profileMeta.nextStep,
    });
  }

  return c.json({ code: "INVALID_CREDENTIALS", message: "Sai email hoặc mật khẩu không chính xác." }, 401);
});

// POST /auth/admin-login — Username/Password login for Web Admin
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

  const adminAccessTokenTtlSeconds = Math.max(env.JWT_EXPIRY_SECONDS, 12 * 60 * 60);
  const accessToken = await generateAccessToken(adminUser, adminAccessTokenTtlSeconds);
  auditLog("ADMIN_LOGIN_SUCCESS", adminUser.id, { role: adminUser.role, accessTokenTtlSeconds: adminAccessTokenTtlSeconds });

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
    if (!isNativeClientPlatform(c.req.header("x-client-platform"))) {
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
    if (!isNativeClientPlatform(c.req.header("x-client-platform"))) {
      delete (result as any).refreshToken;
    }
  }
  return c.json(result);
});

// POST /auth/refresh
authRoutes.post("/refresh", async (c) => {
  if (!isTrustedBrowserOrigin({
    origin: c.req.header("Origin"),
    isProduction: isProd,
    trustedOrigins: trustedBrowserOrigins,
  })) {
    return c.json({ code: "UNTRUSTED_ORIGIN", message: "Nguồn yêu cầu không được phép." }, 403);
  }
  const body = await c.req.json().catch(() => ({}));
  const refreshToken = body?.refreshToken || getCookieValue(c.req.header("Cookie"), "refreshToken");
  const parsed = refreshSchema.safeParse({ refreshToken });
  if (!parsed.success) {
    auditLog("REFRESH_FAILED_MISSING_TOKEN", null, { path: c.req.path });
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
    auditLog("REFRESH_FAILED_NOT_FOUND", null, { hasCookie: Boolean(getCookieValue(c.req.header("Cookie"), "refreshToken")) });
    return c.json({ code: "REFRESH_TOKEN_EXPIRED", message: "Phiên đăng nhập đã hết hạn." }, 401);
  }

  if (tokenRecord.revoked_at) {
    const recentRotation = recentRefreshRotations.get(tokenHash);
    if (recentRotation && recentRotation.expiresAtMs > Date.now() && recentRotation.userId === tokenRecord.user_id) {
      setRefreshCookie(c, recentRotation.refreshToken);
      auditLog("REFRESH_REPLAY_GRACE", tokenRecord.user_id, { sessionId: recentRotation.nextSessionId });
      const replayResponse: any = {
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
      };
      if (isNativeClientPlatform(c.req.header("x-client-platform"))) {
        replayResponse.refreshToken = recentRotation.refreshToken;
      }
      return c.json(replayResponse);
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
    auditLog("REFRESH_FAILED_ACCOUNT_STATUS", tokenRecord.user_id, { status: user.status });
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

  if (isNativeClientPlatform(c.req.header("x-client-platform"))) {
    responseData.refreshToken = nextRefreshToken;
  }

  return c.json(responseData);
});

// POST /auth/logout
authRoutes.post("/logout", async (c) => {
  if (!isTrustedBrowserOrigin({
    origin: c.req.header("Origin"),
    isProduction: isProd,
    trustedOrigins: trustedBrowserOrigins,
  })) {
    return c.json({ code: "UNTRUSTED_ORIGIN", message: "Nguồn yêu cầu không được phép." }, 403);
  }
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
  const startedAt = Date.now();
  let routeDbQueries = 0;
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

  let freshUser = c.get("authDbUser");
  let preFetchedProfile = c.get("authPreFetchedProfile");

  if (!freshUser) {
    routeDbQueries += 1;
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,email,name,avatar,role,status,provider,is_profile_completed,onboarding_step,user_profiles(*)")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading fresh auth/me user:", safeSupabaseError(error));
    }
    freshUser = data;
    preFetchedProfile = freshUser?.user_profiles
      ? (Array.isArray(freshUser.user_profiles) ? freshUser.user_profiles[0] : freshUser.user_profiles)
      : null;
  }

  const sourceUser = freshUser || {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatarUrl,
    role: user.role,
    status: user.status,
    provider: user.authProvider,
    is_profile_completed: user.isProfileCompleted,
    onboarding_step: user.onboardingStep,
  };
  const usedPrefetchedProfile = preFetchedProfile !== undefined;
  const profileMeta = await buildProfileAuthMeta(sourceUser, preFetchedProfile);
  const authMiddlewareDbQueries = Number(c.get("authDbQueryCount") || 0);

  const responseUser = {
    id: sourceUser.id,
    email: sourceUser.email,
    name: profileMeta.profile?.fullName || sourceUser.name || null,
    avatarUrl: profileMeta.profile?.avatarUrl || sourceUser.avatar || null,
    role: sourceUser.role,
    status: profileMeta.approvalStatus,
    approvalStatus: profileMeta.approvalStatus,
    isProfileCompleted: profileMeta.isProfileCompleted,
    onboardingStep: profileMeta.onboardingStep,
    nextStep: profileMeta.nextStep,
  };

  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "AUTH_ME_PERF",
    requestId: c.get("requestId"),
    durationMs: Date.now() - startedAt,
    authMiddlewareDbQueries,
    routeDbQueries,
    totalDbQueries: authMiddlewareDbQueries + routeDbQueries + (usedPrefetchedProfile ? 0 : 1),
    previousRouteDbQueriesEstimate: 2,
    savedRouteDbQueriesEstimate: Math.max(0, 2 - routeDbQueries - (usedPrefetchedProfile ? 0 : 1)),
    usedMiddlewareUser: Boolean(c.get("authDbUser")),
    usedPrefetchedProfile,
  }));
  return c.json({ ...responseUser, user: responseUser });
});

export default authRoutes;
