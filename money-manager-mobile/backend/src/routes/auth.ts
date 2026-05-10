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
import { requireAuth, getClientIp, getDeviceInfo } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";
import { buildProfileAuthMeta, getUserProfile } from "../lib/profileStore.js";

const authRoutes = new Hono<AppEnv>();

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

// ----- Admin credentials (hardcoded for dev, use env vars in production) -----
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";


let googleOAuth2Client: OAuth2Client | null = null;



function getGoogleClient(): OAuth2Client {
  if (!googleOAuth2Client && env.GOOGLE_CLIENT_ID) {
    googleOAuth2Client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }
  return googleOAuth2Client!;
}

async function logLoginAttempt(
  userId: string | null,
  success: boolean,
  failReason?: string
) {

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
  let { data: existingUser, error: findError } = await supabaseAdmin
    .from("users")
    .select("*")
    .or(`google_id.eq.${googleId},email.eq.${email}`)
    .single();

  if (findError && findError.code !== "PGRST116") {
    console.error("Error finding owner google user:", findError);
    return { error: { code: "SERVER_ERROR", message: "Không thể kiểm tra tài khoản owner." }, status: 500 };
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
      console.error("Error creating owner google user:", createError);
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

  if (process.env.NODE_ENV !== "production" && idToken.startsWith("mock-")) {
    const isNewMockOwner = idToken === "mock-new-owner-google-token";
    return upsertOwnerGoogleUser({
      googleId: idToken,
      email: isNewMockOwner ? "new.owner.local@example.com" : "owner.local@example.com",
      name: isNewMockOwner ? "New Local Owner" : "Local Owner",
      avatar: null,
      isProfileCompleted: !isNewMockOwner,
    });
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
  const authUser = {
    ...user,
    isProfileCompleted: profileMeta.isProfileCompleted,
    onboardingStep: profileMeta.onboardingStep,
  };
  const accessToken = await generateAccessToken(authUser);
  const refreshToken = await generateRefreshToken();
  const tokenHash = await hashToken(refreshToken);
  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_EXPIRY_DAYS);

  await supabaseAdmin.from("refresh_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  return {
    accessToken,
    refreshToken,
    session: {
      access_token: accessToken,
      refresh_token: refreshToken,
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

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
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

  return c.json(result);
});

// POST /auth/refresh
authRoutes.post("/refresh", async (c) => {
  const parsed = await parseJson(c, refreshSchema);
  if (!parsed.ok) return parsed.response;

  const { refreshToken } = parsed.data;



  const tokenHash = await hashToken(refreshToken);
  const { data: tokenRecord, error: findError } = await supabaseAdmin
    .from("refresh_tokens")
    .select("*, users!inner(*)")
    .eq("token_hash", tokenHash)
    .eq("revoked_at", null)
    .single();

  if (findError || !tokenRecord) {
    return c.json({ code: "REFRESH_TOKEN_EXPIRED", message: "Phiên đăng nhập đã hết hạn." }, 401);
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return c.json({ code: "REFRESH_TOKEN_EXPIRED", message: "Phiên đăng nhập đã hết hạn." }, 401);
  }

  const user = tokenRecord.users;
  const accessToken = await generateAccessToken(user);

  return c.json({
    accessToken,
    refreshToken,
    session: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: tokenRecord.expires_at,
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
  // Try to parse body for refreshToken, but don't fail if missing (admin logout has no refresh token)
  try {
    const body = await c.req.json().catch(() => ({}));
    const refreshToken = body?.refreshToken;
    if (refreshToken) {
      const tokenHash = await hashToken(refreshToken);
      await supabaseAdmin
        .from("refresh_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", tokenHash);
    }
  } catch {}

  return c.json({ success: true });
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

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id, email, name, avatar_url, role, status, is_profile_completed, onboarding_step")
    .eq("id", user.id)
    .single();

  const responseUser = {
    id: dbUser?.id,
    email: dbUser?.email,
    name: dbUser?.name,
    avatarUrl: (dbUser as any)?.avatar_url,
    role: dbUser?.role,
    status: dbUser?.status,
    isProfileCompleted: dbUser?.is_profile_completed ?? true,
    onboardingStep: dbUser?.onboarding_step ?? "DONE",
  };

  return c.json({ ...responseUser, user: responseUser });
});

export default authRoutes;
