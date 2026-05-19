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

const safeSupabaseError = (error: any) => ({
  code: error?.code,
  message: error?.message,
  details: error?.details,
  hint: error?.hint,
});

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
    ...details
  }));
};

async function handleGoogleAuth(idToken: string, ip: string, deviceInfo: string) {


  let ticket;
  try {
    ticket = await getGoogleClient().verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
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
    .select("*")
    .or(`google_id.eq.${googleId},email.eq.${email}`)
    .single();

  if (findError && findError.code !== "PGRST116") {
    console.error("Error finding user:", findError);
    return { error: { code: "SERVER_ERROR", message: "Lỗi server." }, status: 500 };
  }

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

    if (existingUser.status === "DELETED") {
      await logLoginAttempt(existingUser.id, false, "ACCOUNT_DELETED");
      return { error: { code: "ACCOUNT_DELETED", message: "Tài khoản đã bị xóa." }, status: 403 };
    }

    // Update existing user info if found by email but google_id was missing
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        google_id: googleId, // Link google_id if missing or different
        name,
        avatar,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating existing user during login:", updateError);
    } else if (updatedUser) {
      existingUser = updatedUser;
    }
  }

  await logLoginAttempt(existingUser.id, true);
  return createAuthResponse(existingUser, isNewUser);
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
    .select("*")
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
      .select("*")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (emailFindError && emailFindError.code !== "PGRST116") {
      console.error("Error finding owner google user by email:", safeSupabaseError(emailFindError));
      return { error: { code: "SERVER_ERROR", message: "Không thể kiểm tra tài khoản owner." }, status: 500 };
    }

    existingUser = userByEmail;
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
    if (existingUser.status === "DELETED") {
      return { error: { code: "ACCOUNT_DELETED", message: "Tài khoản owner đã bị xóa." }, status: 403 };
    }

    const { data: updatedUser } = await supabaseAdmin
      .from("users")
      .update({
        google_id: googleId,
        email,
        name,
        avatar,
        provider: "GOOGLE",
        last_login_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id)
      .select()
      .single();

    if (updatedUser) existingUser = updatedUser;
  }

  return createAuthResponse(existingUser, false);
}

async function handleOwnerGoogleAuth(idToken: string | undefined) {


  if (!idToken) {
    return { error: { code: "TOKEN_INVALID", message: "Thiếu Google credential." }, status: 400 };
  }

  if (process.env.NODE_ENV !== "production" && idToken === "mock-owner-google-token") {
    return upsertOwnerGoogleUser({
      googleId: "mock-owner-google-id",
      email: "owner.local@example.com",
      name: "Owner Local",
      avatar: null,
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
      audience: env.GOOGLE_CLIENT_ID,
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

async function createAuthResponse(user: any, isNewUser: boolean) {
  const profileMeta = await buildProfileAuthMeta(user);
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
    },
    profile: profileMeta.profile,
    nextStep: profileMeta.nextStep,
  };
}


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

// POST /auth/google — Google Sign-In for Mobile/Web App
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
    delete (result as any).refreshToken;
  }
  return c.json(result);
});

// POST /auth/owner-google — Owner-only Google sign-in for web admin
authRoutes.post("/owner-google", async (c) => {
  const parsed = await parseJson(c, ownerGoogleAuthSchema);
  if (!parsed.ok) return parsed.response;

  const result = await handleOwnerGoogleAuth(parsed.data.idToken);
  if ("error" in result) {
    return c.json(result.error, result.status as any);
  }

  if ((result as any).refreshToken) {
    setRefreshCookie(c, (result as any).refreshToken);
    delete (result as any).refreshToken;
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
  const { data: tokenRecord, error: findError } = await supabaseAdmin
    .from("refresh_tokens")
    .select("*, users!inner(*)")
    .eq("token_hash", tokenHash)
    .single();

  if (findError || !tokenRecord) {
    return c.json({ code: "REFRESH_TOKEN_EXPIRED", message: "Phiên đăng nhập đã hết hạn." }, 401);
  }

  if (tokenRecord.revoked_at) {
    await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", tokenRecord.user_id)
      .is("revoked_at", null);
    auditLog("REFRESH_FAILED_REUSED", tokenRecord.user_id, { tokenHash });
    return c.json({ code: "REFRESH_TOKEN_REUSED", message: "Phiên đăng nhập không còn hợp lệ." }, 401);
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
  const nextSessionId = crypto.randomUUID();
  const authUser = {
    ...user,
    sessionId: nextSessionId,
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
  auditLog("REFRESH_SUCCESS", user.id, { sessionId: nextSessionId });

  return c.json({
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
    },
  });
});

// POST /auth/logout
authRoutes.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
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
  } catch {}

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

// GET /auth/me — Get current user info from JWT
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
    };
    return c.json({ ...responseUser, user: responseUser });
  }

  const { data: dbUser, error: dbUserErr } = await supabaseAdmin
    .from("users")
    .select("id, email, name, avatar, role, status, is_profile_completed, onboarding_step")
    .eq("id", user.id)
    .single();

  if (dbUserErr) {
    console.error("Error fetching dbUser in /auth/me:", dbUserErr.message);
  }

  const responseUser = {
    id: dbUser?.id,
    email: dbUser?.email,
    name: dbUser?.name,
    avatarUrl: dbUser?.avatar,
    role: dbUser?.role,
    status: dbUser?.status,
    isProfileCompleted: dbUser?.is_profile_completed ?? true,
    onboardingStep: dbUser?.onboarding_step ?? "DONE",
  };

  return c.json({ ...responseUser, user: responseUser });
});

export default authRoutes;
