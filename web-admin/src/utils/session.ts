"use client";

type SessionPayload = {
  accessToken: string;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  isProfileCompleted?: boolean | null;
  onboardingStep?: string | null;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const AUTH_CHANNEL = "trocare-auth";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function clearSupabaseAuthStorage() {
  if (typeof window === "undefined") return;

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("sb-") || key?.includes("supabase.auth.token")) {
      localStorage.removeItem(key);
    }
  }

  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name?.startsWith("sb-")) clearCookie(name);
  });
}

export function getLoginPath(pathname?: string, role?: string | null) {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (path.startsWith("/admin") || path.startsWith("/super-admin") || role === "ADMIN" || role === "SUPER_ADMIN") {
    return "/login";
  }
  if (path.startsWith("/owner") || role === "OWNER") {
    return "/login";
  }
  return "/login";
}

let memoryAccessToken: string | null = null;

export function setClientSession(payload: SessionPayload) {
  if (typeof window === "undefined") return;
  
  memoryAccessToken = payload.accessToken;
  localStorage.setItem("accessToken", payload.accessToken);

  if (payload.role) {
    localStorage.setItem("userRole", payload.role);
    setCookie("userRole", payload.role);
  }
  if (payload.name) {
    localStorage.setItem("userName", payload.name);
  }
  if (payload.email) {
    localStorage.setItem("userEmail", payload.email);
  }
  if (payload.isProfileCompleted !== undefined && payload.isProfileCompleted !== null) {
    localStorage.setItem("isProfileCompleted", String(payload.isProfileCompleted));
    setCookie("isProfileCompleted", String(payload.isProfileCompleted));
  }
  if (payload.onboardingStep) {
    localStorage.setItem("onboardingStep", payload.onboardingStep);
    setCookie("onboardingStep", payload.onboardingStep);
  }
}

type ClearSessionOptions = {
  broadcast?: boolean;
};

export function clearClientSession(options: ClearSessionOptions = {}) {
  if (typeof window === "undefined") return;
  
  memoryAccessToken = null;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("isProfileCompleted");
  localStorage.removeItem("onboardingStep");
  clearSupabaseAuthStorage();

  clearCookie("accessToken");
  clearCookie("refreshToken");
  clearCookie("userRole");
  clearCookie("isProfileCompleted");
  clearCookie("onboardingStep");
  
  window.dispatchEvent(new Event("session-cleared"));
  if (options.broadcast !== false && "BroadcastChannel" in window) {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage({ type: "logout" });
    channel.close();
  }
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return memoryAccessToken || localStorage.getItem("accessToken");
}

export function createAuthBroadcastChannel() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(AUTH_CHANNEL);
}
