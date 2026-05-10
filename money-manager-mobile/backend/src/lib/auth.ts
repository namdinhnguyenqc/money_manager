import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE" | "BLOCKED" | "DELETED";
  provider: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  status: string;
  name?: string | null;
  avatarUrl?: string | null;
  provider?: string | null;
  isProfileCompleted?: boolean;
  onboardingStep?: "COMPLETE_PROFILE" | "DONE";
  iat: number;
  exp: number;
}

export async function generateAccessToken(
  user: Pick<User, "id" | "email" | "role" | "status"> & {
    name?: string | null;
    avatarUrl?: string | null;
    provider?: string | null;
    isProfileCompleted?: boolean;
    onboardingStep?: "COMPLETE_PROFILE" | "DONE";
  }
): Promise<string> {
  const { SignJWT } = await import("jose");
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    provider: user.provider ?? null,
    isProfileCompleted: user.isProfileCompleted,
    onboardingStep: user.onboardingStep,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_EXPIRY_SECONDS}s`) // 15 minutes per security spec
    .sign(new TextEncoder().encode(env.JWT_SECRET));
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(env.JWT_SECRET));
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashToken(token: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(token).digest("hex");
}

export async function generateRefreshToken(): Promise<string> {
  // Use crypto.randomBytes for cryptographic security — Math.random() is NOT safe
  const { randomBytes } = await import("crypto");
  return randomBytes(48).toString("hex"); // 96-char hex string, 384 bits of entropy
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
