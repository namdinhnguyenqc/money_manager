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

const authRoutes = new Hono<AppEnv>();

const googleAuthSchema = z.object({
  idToken: z.string().min(10),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
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
  if (env.IS_MOCK) {
    console.log("Mock login attempt logged:", { userId, success, failReason });
    return;
  }
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
  const client = getGoogleClient();
  if (!env.GOOGLE_CLIENT_ID || !client) {
    // Mock mode: return a regular USER (not admin)
    const mockUser = {
      id: "mock-google-user",
      google_id: "mock-google-id",
      email: "user@gmail.com",
      name: "Mock User",
      avatar: null,
      role: "USER",
      status: "ACTIVE",
      provider: "GOOGLE",
    };
    return createAuthResponse(mockUser, false);
  }

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
    .eq("google_id", googleId)
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
        role: "USER",
        status: "ACTIVE",
        provider: "GOOGLE",
        last_login_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      return { error: { code: "SERVER_ERROR", message: "Không thể tạo tài khoản." }, status: 500 };
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

    await supabaseAdmin
      .from("users")
      .update({
        name,
        avatar,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id);
  }

  await logLoginAttempt(existingUser.id, true);
  return createAuthResponse(existingUser, isNewUser);
}

async function createAuthResponse(user: any, isNewUser: boolean) {
  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken();
  const tokenHash = await hashToken(refreshToken);
  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_EXPIRY_DAYS);

  if (!env.IS_MOCK) {
    await supabaseAdmin.from("refresh_tokens").insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });
  }

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      isNewUser,
    },
  };
}

// ==================== ROUTES ====================

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
    role: "SUPER_ADMIN",
    status: "ACTIVE",
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

  if (result.error) {
    return c.json(result.error, result.status);
  }

  return c.json(result);
});

// POST /auth/refresh
authRoutes.post("/refresh", async (c) => {
  const parsed = await parseJson(c, refreshSchema);
  if (!parsed.ok) return parsed.response;

  const { refreshToken } = parsed.data;

  if (env.IS_MOCK) {
    // In mock mode, just return a new access token for the mock user
    const mockUser = { id: "mock-google-user", email: "user@gmail.com", role: "USER", status: "ACTIVE", google_id: "", provider: "GOOGLE" };
    const accessToken = await generateAccessToken(mockUser);
    return c.json({ accessToken });
  }

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

  return c.json({ accessToken });
});

// POST /auth/logout
authRoutes.post("/logout", async (c) => {
  // Try to parse body for refreshToken, but don't fail if missing (admin logout has no refresh token)
  try {
    const body = await c.req.json().catch(() => ({}));
    const refreshToken = body?.refreshToken;
    if (refreshToken && !env.IS_MOCK) {
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

  // For built-in admin or mock mode, return from JWT payload directly
  if (user.id === "admin-builtin" || (env.IS_MOCK && user.id?.startsWith("mock-"))) {
    return c.json({
      id: user.id,
      email: user.email,
      name: user.id === "admin-builtin" ? "Administrator" : "Mock User",
      avatar: null,
      role: user.role,
      status: user.status || "ACTIVE",
    });
  }

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id, email, name, avatar, role, status")
    .eq("id", user.id)
    .single();

  return c.json({
    id: dbUser?.id,
    email: dbUser?.email,
    name: dbUser?.name,
    avatar: dbUser?.avatar,
    role: dbUser?.role,
    status: dbUser?.status,
  });
});

export default authRoutes;