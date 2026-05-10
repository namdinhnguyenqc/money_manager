"use client";

type SessionPayload = {
  accessToken: string;
  refreshToken?: string | null;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  isProfileCompleted?: boolean | null;
  onboardingStep?: string | null;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function getLoginPath(pathname?: string, role?: string | null) {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  if (path.startsWith("/admin") || path.startsWith("/super-admin") || role === "ADMIN" || role === "SUPER_ADMIN") {
    return "/login/admin";
  }
  if (path.startsWith("/owner") || role === "OWNER") {
    return "/login/owner";
  }
  return "/login";
}

export function setClientSession(payload: SessionPayload) {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", payload.accessToken);
  setCookie("accessToken", payload.accessToken);
  if (payload.refreshToken) {
    localStorage.setItem("refreshToken", payload.refreshToken);
    setCookie("refreshToken", payload.refreshToken);
  }

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

export function clearClientSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("isProfileCompleted");
  localStorage.removeItem("onboardingStep");
  clearCookie("accessToken");
  clearCookie("refreshToken");
  clearCookie("userRole");
  clearCookie("isProfileCompleted");
  clearCookie("onboardingStep");
  window.dispatchEvent(new Event("session-cleared"));
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function getStoredRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}
