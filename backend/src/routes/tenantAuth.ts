import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcrypt";
import { supabaseAdmin } from "../lib/supabase.js";
import {
  generateAccessToken,
  hashToken,
  generateRefreshToken,
  addDays,
} from "../lib/auth.js";
import { parseJson } from "../utils/validation.js";
import { requireAuth, getClientIp, getDeviceInfo } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";
import { env } from "../config/env.js";

const tenantAuthRoutes = new Hono<AppEnv>();

const BCRYPT_ROUNDS = 10;
const REFRESH_REPLAY_GRACE_MS = 10_000;

// ─────────────────────────────────────────────────────────
// In-memory grace period map for concurrent refresh requests
// ─────────────────────────────────────────────────────────
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

const cleanupRecentRefreshRotations = () => {
  const now = Date.now();
  for (const [tokenHash, entry] of recentRefreshRotations.entries()) {
    if (entry.expiresAtMs <= now) {
      recentRefreshRotations.delete(tokenHash);
    }
  }
};

// ─────────────────────────────────────────────────────────
// Cookie helpers (same pattern as auth.ts)
// ─────────────────────────────────────────────────────────
const cookieOptions = `Path=/tenant-auth; HttpOnly; SameSite=Lax; Max-Age=${env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

const setRefreshCookie = (c: any, refreshToken: string) => {
  c.header("Set-Cookie", `refreshToken=${encodeURIComponent(refreshToken)}; ${cookieOptions}`, { append: true });
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

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const safeSupabaseError = (error: any) => ({
  code: error?.code,
  message: error?.message,
  details: error?.details,
  hint: error?.hint,
});

const auditLog = (event: string, userId: string | null, details: Record<string, any> = {}) => {
  console.info(JSON.stringify({
    audit_event: event,
    user_id: userId,
    timestamp: new Date().toISOString(),
    ...details,
  }));
};

// ─────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────
const registerSchema = z.object({
  phone: z
    .string()
    .min(9, "Số điện thoại không hợp lệ")
    .max(15, "Số điện thoại không hợp lệ")
    .regex(/^[0-9+]+$/, "Số điện thoại chỉ được chứa số"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").max(100),
  invite_code: z.string().min(1, "Mã mời không được để trống"),
});

const loginSchema = z.object({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
});

const forgotPasswordSchema = z.object({
  phone: z.string().min(1, "Vui lòng nhập số điện thoại"),
  email: z.string().email("Định dạng email không hợp lệ"),
});


// ─────────────────────────────────────────────────────────
// POST /register — Tenant registration via invite code
// ─────────────────────────────────────────────────────────
tenantAuthRoutes.post("/register", async (c) => {
  const parsed = await parseJson(c, registerSchema);
  if (!parsed.ok) return parsed.response;

  const { phone, password, name, invite_code } = parsed.data;

  try {
    // 1. Validate invite code
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("invite_code", invite_code)
      .maybeSingle();

    if (tenantError) {
      console.error(JSON.stringify({
        error: "TENANT_INVITE_LOOKUP_FAILED",
        details: safeSupabaseError(tenantError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại." }, 500);
    }

    if (!tenant) {
      return c.json({ code: "INVALID_INVITE_CODE", message: "Mã mời không hợp lệ." }, 400);
    }

    // Check invite status
    if (!["pending", "sent"].includes(tenant.invite_status)) {
      return c.json({ code: "INVITE_USED", message: "Mã mời đã được sử dụng hoặc không còn hiệu lực." }, 400);
    }

    // Check invite expiry
    if (tenant.invite_expires_at && new Date(tenant.invite_expires_at) < new Date()) {
      return c.json({ code: "INVITE_EXPIRED", message: "Mã mời đã hết hạn." }, 400);
    }

    // 2. Check if phone already registered
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingUserError && existingUserError.code !== "PGRST116") {
      console.error(JSON.stringify({
        error: "USER_PHONE_LOOKUP_FAILED",
        details: safeSupabaseError(existingUserError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại." }, 500);
    }

    if (existingUser) {
      return c.json({ code: "PHONE_ALREADY_REGISTERED", message: "Số điện thoại đã được đăng ký." }, 409);
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 4. Create user
    const { data: newUser, error: createUserError } = await supabaseAdmin
      .from("users")
      .insert({
        phone,
        name,
        email: `tenant_${phone}@trocare.local`, // placeholder email for unique constraint
        role: "TENANT",
        status: "ACTIVE",
        provider: "PHONE",
        is_profile_completed: false,
        onboarding_step: "COMPLETE_PROFILE",
        last_login_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createUserError || !newUser) {
      console.error(JSON.stringify({
        error: "TENANT_USER_CREATE_FAILED",
        details: safeSupabaseError(createUserError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Không thể tạo tài khoản. Vui lòng thử lại." }, 500);
    }

    // 5. Create tenant_accounts entry linking user to tenant record
    const { error: linkError } = await supabaseAdmin
      .from("tenant_accounts")
      .insert({
        user_id: newUser.id,
        tenant_id: tenant.id,
        linked_by: tenant.user_id, // the owner who created the tenant
      });

    if (linkError) {
      console.error(JSON.stringify({
        error: "TENANT_ACCOUNT_LINK_FAILED",
        details: safeSupabaseError(linkError),
      }));
      // Rollback: delete the created user
      await supabaseAdmin.from("users").delete().eq("id", newUser.id);
      return c.json({ code: "SERVER_ERROR", message: "Không thể liên kết tài khoản. Vui lòng thử lại." }, 500);
    }

    // 6. Update tenant invite_status to 'accepted' and store password_hash
    const { error: updateTenantError } = await supabaseAdmin
      .from("tenants")
      .update({
        invite_status: "accepted",
        password_hash: passwordHash
      })
      .eq("id", tenant.id);

    if (updateTenantError) {
      console.error(JSON.stringify({
        error: "TENANT_INVITE_STATUS_UPDATE_FAILED",
        details: safeSupabaseError(updateTenantError),
      }));
      // Non-critical: continue anyway since the account is created
    }

    // 7. Generate tokens
    const sessionId = crypto.randomUUID();
    const authUser = {
      id: newUser.id,
      email: newUser.email || "",
      role: newUser.role,
      status: newUser.status,
      name: newUser.name,
      provider: newUser.provider,
      sessionId,
    };

    const accessToken = await generateAccessToken(authUser);
    const refreshToken = await generateRefreshToken();
    const tokenHash = await hashToken(refreshToken);
    const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_EXPIRY_DAYS);

    const { error: refreshInsertError } = await supabaseAdmin
      .from("refresh_tokens")
      .insert({
        id: sessionId,
        user_id: newUser.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (refreshInsertError) {
      console.error(JSON.stringify({
        error: "TENANT_REFRESH_TOKEN_CREATE_FAILED",
        details: safeSupabaseError(refreshInsertError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Không thể tạo phiên đăng nhập." }, 500);
    }

    setRefreshCookie(c, refreshToken);
    auditLog("TENANT_REGISTER_SUCCESS", newUser.id, { phone, tenantId: tenant.id });

    const responseData: any = {
      accessToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
        authProvider: newUser.provider,
        isNewUser: true,
      },
    };

    if (c.req.header("x-client-platform")) {
      responseData.refreshToken = refreshToken;
    }

    return c.json(responseData, 201);
  } catch (err) {
    console.error(JSON.stringify({
      error: "TENANT_REGISTER_UNEXPECTED",
      message: err instanceof Error ? err.message : String(err),
    }));
    return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại sau." }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// POST /login — Tenant phone/password login
// ─────────────────────────────────────────────────────────
tenantAuthRoutes.post("/login", async (c) => {
  const parsed = await parseJson(c, loginSchema);
  if (!parsed.ok) return parsed.response;

  const { phone, password } = parsed.data;
  const ip = getClientIp(c);
  const deviceInfo = getDeviceInfo(c);

  try {
    // 1. Find user by phone with TENANT role
    let { data: user, error: findError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phone", phone)
      .eq("role", "TENANT")
      .maybeSingle();

    if (findError && findError.code !== "PGRST116") {
      console.error(JSON.stringify({
        error: "TENANT_LOGIN_LOOKUP_FAILED",
        details: safeSupabaseError(findError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại." }, 500);
    }

    // 2. If user doesn't exist, check tenants table for active lease contract
    if (!user) {
      const { data: tenants, error: tenantsError } = await supabaseAdmin
        .from("tenants")
        .select("*")
        .eq("phone", phone);

      if (tenantsError) {
        console.error(JSON.stringify({
          error: "TENANT_LOGIN_TENANTS_LOOKUP_FAILED",
          details: safeSupabaseError(tenantsError),
        }));
        return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại." }, 500);
      }

      if (!tenants || tenants.length === 0) {
        auditLog("TENANT_LOGIN_FAILED", null, { phone, reason: "TENANT_NOT_FOUND" });
        return c.json({ code: "INVALID_CREDENTIALS", message: "Số điện thoại hoặc mật khẩu không đúng." }, 401);
      }

      // Find the tenant that has an active contract
      let tenant = null;
      let activeContract = null;

      for (const t of tenants) {
        const { data: contract } = await supabaseAdmin
          .from("contracts")
          .select("id")
          .eq("tenant_id", t.id)
          .eq("status", "active")
          .maybeSingle();

        if (contract) {
          tenant = t;
          activeContract = contract;
          break;
        }
      }

      // Fallback to first one if no active contract found (it will fail at the contract check anyway)
      if (!tenant) {
        tenant = tenants[0];
      }

      if (!activeContract) {
        auditLog("TENANT_LOGIN_FAILED", null, { phone, reason: "NO_ACTIVE_CONTRACT" });
        return c.json({
          code: "NO_ACTIVE_CONTRACT",
          message: "Hợp đồng đã thanh lý hoặc chưa được ký. Bạn không có quyền truy cập ứng dụng."
        }, 403);
      }


      // Automatically register user using phone number as password
      if (password !== phone) {
        auditLog("TENANT_LOGIN_FAILED", null, { phone, reason: "AUTO_REG_WRONG_PASSWORD" });
        return c.json({ code: "INVALID_CREDENTIALS", message: "Số điện thoại hoặc mật khẩu không đúng." }, 401);
      }

      const passwordHash = await bcrypt.hash(phone, 10);
      const email = `tenant-${tenant.id}@trocare.local`;

      // Create new user
      const { data: newUser, error: createErr } = await supabaseAdmin
        .from("users")
        .insert({
          email,
          phone,
          name: tenant.name,
          role: "TENANT",
          provider: "PHONE",
          status: "ACTIVE",
          is_profile_completed: false,
          onboarding_step: "COMPLETE_PROFILE"
        })
        .select("*")
        .single();

      if (createErr || !newUser) {
        console.error(JSON.stringify({
          error: "TENANT_AUTO_REGISTER_FAILED",
          details: safeSupabaseError(createErr),
        }));
        return c.json({ code: "SERVER_ERROR", message: "Không thể tự động kích hoạt tài khoản." }, 500);
      }

      // Create link in tenant_accounts
      await supabaseAdmin.from("tenant_accounts").insert({
        user_id: newUser.id,
        tenant_id: tenant.id,
        status: "active"
      });

      // Update tenant status
      await supabaseAdmin.from("tenants").update({
        invite_status: "accepted",
        password_hash: passwordHash
      }).eq("id", tenant.id);

      user = newUser;
    } else {
      // 3. If user exists, check active lease contract
      const { data: tenantAccount } = await supabaseAdmin
        .from("tenant_accounts")
        .select("tenant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      let activeTenantId = tenantAccount?.tenant_id;

      if (!activeTenantId) {
        // Fallback: look up by phone if not linked
        const { data: tenants } = await supabaseAdmin
          .from("tenants")
          .select("*")
          .eq("phone", phone);

        if (tenants && tenants.length > 0) {
          // Find the tenant with active contract
          let matchedTenant = null;
          for (const t of tenants) {
            const { data: contract } = await supabaseAdmin
              .from("contracts")
              .select("id")
              .eq("tenant_id", t.id)
              .eq("status", "active")
              .maybeSingle();
            if (contract) {
              matchedTenant = t;
              break;
            }
          }
          const tenant = matchedTenant || tenants[0];
          activeTenantId = tenant.id;

          // Link them now
          await supabaseAdmin.from("tenant_accounts").insert({
            user_id: user.id,
            tenant_id: tenant.id,
            status: "active"
          });
        }
      }


      if (!activeTenantId) {
        auditLog("TENANT_LOGIN_FAILED", user.id, { reason: "UNLINKED_ACCOUNT" });
        return c.json({ code: "NO_ACTIVE_CONTRACT", message: "Tài khoản của bạn chưa được liên kết với hợp đồng phòng." }, 403);
      }

      const { data: activeContract } = await supabaseAdmin
        .from("contracts")
        .select("id")
        .eq("tenant_id", activeTenantId)
        .eq("status", "active")
        .maybeSingle();

      if (!activeContract) {
        auditLog("TENANT_LOGIN_FAILED", user.id, { reason: "NO_ACTIVE_CONTRACT" });
        return c.json({
          code: "NO_ACTIVE_CONTRACT",
          message: "Hợp đồng đã thanh lý hoặc chưa được ký. Bạn không có quyền truy cập ứng dụng."
        }, 403);
      }

      // Fetch password_hash from tenants table
      const { data: tenantRecord } = await supabaseAdmin
        .from("tenants")
        .select("password_hash")
        .eq("id", activeTenantId)
        .maybeSingle();

      // 4. Verify password (allow phone number as hardcoded password fallback)
      let passwordMatch = false;
      if (password === phone) {
        passwordMatch = true;
      } else if (tenantRecord?.password_hash) {
        passwordMatch = await bcrypt.compare(password, tenantRecord.password_hash);
      }

      if (!passwordMatch) {
        auditLog("TENANT_LOGIN_FAILED", user.id, { reason: "WRONG_PASSWORD" });
        await supabaseAdmin.from("login_logs").insert({
          user_id: user.id,
          provider: "PHONE",
          success: false,
          fail_reason: "WRONG_PASSWORD",
          ip_address: ip,
          device_info: deviceInfo,
        });
        return c.json({ code: "INVALID_CREDENTIALS", message: "Số điện thoại hoặc mật khẩu không đúng." }, 401);
      }
    }

    // 5. Check account status
    if (user.status === "BLOCKED") {
      auditLog("TENANT_LOGIN_FAILED", user.id, { reason: "ACCOUNT_BLOCKED" });
      return c.json({ code: "ACCOUNT_BLOCKED", message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ chủ trọ." }, 403);
    }

    if (user.status === "DELETED") {
      auditLog("TENANT_LOGIN_FAILED", user.id, { reason: "ACCOUNT_DELETED" });
      return c.json({ code: "ACCOUNT_DELETED", message: "Tài khoản đã bị xóa." }, 403);
    }

    // 4. Generate tokens
    const sessionId = crypto.randomUUID();
    const authUser = {
      id: user.id,
      email: user.email || "",
      role: user.role,
      status: user.status,
      name: user.name,
      provider: user.provider,
      sessionId,
    };

    const accessToken = await generateAccessToken(authUser);
    const refreshToken = await generateRefreshToken();
    const tokenHash = await hashToken(refreshToken);
    const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_EXPIRY_DAYS);

    const { error: refreshInsertError } = await supabaseAdmin
      .from("refresh_tokens")
      .insert({
        id: sessionId,
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (refreshInsertError) {
      console.error(JSON.stringify({
        error: "TENANT_REFRESH_TOKEN_CREATE_FAILED",
        details: safeSupabaseError(refreshInsertError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Không thể tạo phiên đăng nhập." }, 500);
    }

    // 5. Update last login
    supabaseAdmin
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) console.error("Async last_login_at update failed:", error);
      });

    // 6. Log successful login
    await supabaseAdmin.from("login_logs").insert({
      user_id: user.id,
      provider: "PHONE",
      success: true,
      ip_address: ip,
      device_info: deviceInfo,
    });

    setRefreshCookie(c, refreshToken);
    auditLog("TENANT_LOGIN_SUCCESS", user.id, { phone });

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
        phone: user.phone,
        role: user.role,
        status: user.status,
        authProvider: user.provider,
        isNewUser: false,
      },
    };

    if (c.req.header("x-client-platform")) {
      responseData.refreshToken = refreshToken;
    }

    return c.json(responseData);
  } catch (err) {
    console.error(JSON.stringify({
      error: "TENANT_LOGIN_UNEXPECTED",
      message: err instanceof Error ? err.message : String(err),
    }));
    return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại sau." }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// POST /refresh — Token rotation (same logic as auth.ts)
// ─────────────────────────────────────────────────────────
tenantAuthRoutes.post("/refresh", async (c) => {
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

  // Handle revoked token — check grace period for concurrent requests
  if (tokenRecord.revoked_at) {
    const recentRotation = recentRefreshRotations.get(tokenHash);
    if (recentRotation && recentRotation.expiresAtMs > Date.now() && recentRotation.userId === tokenRecord.user_id) {
      setRefreshCookie(c, recentRotation.refreshToken);
      auditLog("TENANT_REFRESH_REPLAY_GRACE", tokenRecord.user_id, { sessionId: recentRotation.nextSessionId });
      const graceResponse: any = {
        accessToken: recentRotation.accessToken,
        session: {
          access_token: recentRotation.accessToken,
          expires_at: recentRotation.expiresAt,
        },
        user: {
          id: recentRotation.user.id,
          email: recentRotation.user.email,
          name: recentRotation.user.name,
          phone: recentRotation.user.phone,
          role: recentRotation.user.role,
          status: recentRotation.user.status,
        },
      };
      if (c.req.header("x-client-platform")) {
        graceResponse.refreshToken = recentRotation.refreshToken;
      }
      return c.json(graceResponse);
    }

    // Token reuse detected — revoke all tokens for this user
    await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", tokenRecord.user_id)
      .is("revoked_at", null);
    auditLog("TENANT_REFRESH_FAILED_REUSED", tokenRecord.user_id, { tokenHash });
    return c.json({ code: "REFRESH_TOKEN_REUSED", message: "Phiên đăng nhập không còn hợp lệ." }, 401);
  }

  // Check expiry
  if (new Date(tokenRecord.expires_at) < new Date()) {
    await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);
    auditLog("TENANT_REFRESH_FAILED_EXPIRED", tokenRecord.user_id, { tokenHash });
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

  // Revoke old token
  const { error: revokeError } = await supabaseAdmin
    .from("refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("revoked_at", null);

  if (revokeError) {
    console.error("Error rotating tenant refresh token:", safeSupabaseError(revokeError));
    return c.json({ code: "SESSION_ROTATION_FAILED", message: "Không thể gia hạn phiên đăng nhập." }, 500);
  }

  // Insert new token
  const { error: insertError } = await supabaseAdmin
    .from("refresh_tokens")
    .insert({
      id: nextSessionId,
      user_id: tokenRecord.user_id,
      token_hash: nextTokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error("Error inserting rotated tenant refresh token:", safeSupabaseError(insertError));
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

  auditLog("TENANT_REFRESH_SUCCESS", user.id, { sessionId: nextSessionId });

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
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
  };

  if (c.req.header("x-client-platform")) {
    responseData.refreshToken = nextRefreshToken;
  }

  return c.json(responseData);
});

// ─────────────────────────────────────────────────────────
// POST /change-password — Requires auth
// ─────────────────────────────────────────────────────────
tenantAuthRoutes.post("/change-password", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = await parseJson(c, changePasswordSchema);
  if (!parsed.ok) return parsed.response;

  const { currentPassword, newPassword } = parsed.data;

  try {
    // 1. Fetch tenant ID linked to this user
    const { data: tenantAccount } = await supabaseAdmin
      .from("tenant_accounts")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tenantAccount?.tenant_id) {
      return c.json({ code: "SERVER_ERROR", message: "Không tìm thấy hồ sơ người thuê liên kết." }, 404);
    }

    // Fetch tenant password hash
    const { data: tenant, error: fetchError } = await supabaseAdmin
      .from("tenants")
      .select("id, password_hash")
      .eq("id", tenantAccount.tenant_id)
      .single();

    if (fetchError || !tenant) {
      console.error(JSON.stringify({
        error: "TENANT_CHANGE_PASSWORD_FETCH_FAILED",
        details: safeSupabaseError(fetchError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Không tìm thấy hồ sơ người thuê." }, 404);
    }

    if (!tenant.password_hash) {
      return c.json({ code: "NO_PASSWORD_SET", message: "Tài khoản chưa thiết lập mật khẩu." }, 400);
    }

    // 2. Verify current password
    const isMatch = await bcrypt.compare(currentPassword, tenant.password_hash);
    if (!isMatch) {
      auditLog("TENANT_CHANGE_PASSWORD_FAILED", user.id, { reason: "WRONG_CURRENT_PASSWORD" });
      return c.json({ code: "WRONG_PASSWORD", message: "Mật khẩu hiện tại không đúng." }, 401);
    }

    // 3. Hash new password and update tenants table
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    const { error: updateError } = await supabaseAdmin
      .from("tenants")
      .update({ password_hash: newPasswordHash })
      .eq("id", tenant.id);

    if (updateError) {
      console.error(JSON.stringify({
        error: "TENANT_CHANGE_PASSWORD_UPDATE_FAILED",
        details: safeSupabaseError(updateError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Không thể cập nhật mật khẩu." }, 500);
    }

    // 4. Revoke all existing refresh tokens (force re-login on other devices)
    await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("revoked_at", null);

    auditLog("TENANT_CHANGE_PASSWORD_SUCCESS", user.id, {});

    return c.json({
      success: true,
      message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại trên các thiết bị khác.",
    });
  } catch (err) {
    console.error(JSON.stringify({
      error: "TENANT_CHANGE_PASSWORD_UNEXPECTED",
      message: err instanceof Error ? err.message : String(err),
    }));
    return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại sau." }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// GET /invite/:code — Public invite code validation
// ─────────────────────────────────────────────────────────
tenantAuthRoutes.get("/invite/:code", async (c) => {
  const code = c.req.param("code");

  if (!code || !code.trim()) {
    return c.json({ valid: false, message: "Mã mời không hợp lệ." }, 400);
  }

  try {
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id, name, invite_status, invite_expires_at")
      .eq("invite_code", code.trim())
      .maybeSingle();

    if (error) {
      console.error(JSON.stringify({
        error: "INVITE_CODE_LOOKUP_FAILED",
        details: safeSupabaseError(error),
      }));
      return c.json({ valid: false, message: "Lỗi hệ thống." }, 500);
    }

    if (!tenant) {
      return c.json({ valid: false, message: "Mã mời không tồn tại." });
    }

    // Check status
    if (!["pending", "sent"].includes(tenant.invite_status)) {
      return c.json({ valid: false, message: "Mã mời đã được sử dụng." });
    }

    // Check expiry
    if (tenant.invite_expires_at && new Date(tenant.invite_expires_at) < new Date()) {
      return c.json({ valid: false, message: "Mã mời đã hết hạn." });
    }

    return c.json({
      valid: true,
      tenantName: tenant.name,
    });
  } catch (err) {
    console.error(JSON.stringify({
      error: "INVITE_CODE_UNEXPECTED",
      message: err instanceof Error ? err.message : String(err),
    }));
    return c.json({ valid: false, message: "Lỗi hệ thống." }, 500);
  }
});

// ─────────────────────────────────────────────────────────
// POST /forgot-password — Public forgot password request
// ─────────────────────────────────────────────────────────
tenantAuthRoutes.post("/forgot-password", async (c) => {
  const parsed = await parseJson(c, forgotPasswordSchema);
  if (!parsed.ok) return parsed.response;

  const { phone, email } = parsed.data;

  try {
    // 1. Find tenant by phone
    const { data: tenants, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("phone", phone);

    if (tenantError) {
      console.error(JSON.stringify({
        error: "TENANT_FORGOT_PASSWORD_LOOKUP_FAILED",
        details: safeSupabaseError(tenantError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại sau." }, 500);
    }

    if (!tenants || tenants.length === 0) {
      return c.json({ code: "TENANT_NOT_FOUND", message: "Số điện thoại này chưa được đăng ký trên hợp đồng." }, 404);
    }

    // Find the tenant that has an active contract
    let tenant = null;
    for (const t of tenants) {
      const { data: contract } = await supabaseAdmin
        .from("contracts")
        .select("id")
        .eq("tenant_id", t.id)
        .eq("status", "active")
        .maybeSingle();
      if (contract) {
        tenant = t;
        break;
      }
    }

    // Fallback to first one
    if (!tenant) {
      tenant = tenants[0];
    }


    // 2. Verify contract email
    if (!tenant.email || tenant.email.trim() === "") {
      return c.json({
        code: "NO_EMAIL_SET",
        message: "Hợp đồng chưa thiết lập địa chỉ email. Vui lòng liên hệ chủ nhà (owner) để bổ sung email hợp đồng."
      }, 400);
    }

    if (tenant.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return c.json({
        code: "EMAIL_MISMATCH",
        message: "Địa chỉ email không khớp với email được khai báo trên hợp đồng của bạn."
      }, 400);
    }

    // 3. Find if user account already exists
    let { data: user, error: findUserError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phone", phone)
      .eq("role", "TENANT")
      .maybeSingle();

    if (findUserError) {
      console.error(JSON.stringify({
        error: "TENANT_FORGOT_PASSWORD_USER_LOOKUP_FAILED",
        details: safeSupabaseError(findUserError),
      }));
      return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại sau." }, 500);
    }

    const tempPassword = tenant.email.trim();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    if (!user) {
      // If user doesn't exist yet but has active contract, register them now with the email as password!
      const { data: activeContract } = await supabaseAdmin
        .from("contracts")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("status", "active")
        .maybeSingle();

      if (!activeContract) {
        return c.json({
          code: "NO_ACTIVE_CONTRACT",
          message: "Hợp đồng đã thanh lý hoặc chưa được ký. Bạn không có quyền truy cập ứng dụng."
        }, 403);
      }

      const emailPlaceholder = `tenant-${tenant.id}@trocare.local`;
      const { data: newUser, error: createErr } = await supabaseAdmin
        .from("users")
        .insert({
          email: emailPlaceholder,
          phone,
          name: tenant.name,
          role: "TENANT",
          provider: "PHONE",
          status: "ACTIVE",
          is_profile_completed: false,
          onboarding_step: "COMPLETE_PROFILE"
        })
        .select("*")
        .single();

      if (createErr || !newUser) {
        console.error(JSON.stringify({
          error: "TENANT_FORGOT_PASSWORD_AUTO_REGISTER_FAILED",
          details: safeSupabaseError(createErr),
        }));
        return c.json({ code: "SERVER_ERROR", message: "Không thể khởi tạo tài khoản mới." }, 500);
      }

      await supabaseAdmin.from("tenant_accounts").insert({
        user_id: newUser.id,
        tenant_id: tenant.id,
        status: "active"
      });

      user = newUser;
    }

    // Update tenants password hash
    const { error: updateTenantError } = await supabaseAdmin
      .from("tenants")
      .update({
        invite_status: "accepted",
        password_hash: passwordHash
      })
      .eq("id", tenant.id);

    // Revoke refresh tokens
    await supabaseAdmin
      .from("refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("revoked_at", null);

    auditLog("TENANT_FORGOT_PASSWORD_SUCCESS", user.id, { phone, email });

    return c.json({
      success: true,
      message: `Khôi phục mật khẩu thành công! Mật khẩu mặc định mới của bạn chính là địa chỉ email hợp đồng của bạn: ${tempPassword}. Vui lòng đăng nhập lại bằng mật khẩu này và thực hiện đổi mật khẩu ngay sau đó.`,
    });
  } catch (err) {
    console.error(JSON.stringify({
      error: "TENANT_FORGOT_PASSWORD_UNEXPECTED",
      message: err instanceof Error ? err.message : String(err),
    }));
    return c.json({ code: "SERVER_ERROR", message: "Lỗi hệ thống. Vui lòng thử lại sau." }, 500);
  }
});

export default tenantAuthRoutes;
