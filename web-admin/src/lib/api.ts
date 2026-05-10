import { clearClientSession, getStoredRefreshToken, setClientSession } from "@/utils/session";
import { authFetch, handleUnauthorizedLogout } from "@/utils/authFetch";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await authFetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    } as HeadersInit,
  });

  if (res.status === 401) {
    handleUnauthorizedLogout();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 403 && data?.code === "PROFILE_REQUIRED") {
      sessionStorage.setItem("profileRequiredMessage", data?.message || "Vui lòng hoàn tất hồ sơ để tiếp tục sử dụng hệ thống.");
      window.location.href = "/complete-profile";
      throw new Error(data?.message || "Profile required");
    }
    throw new Error(data.error || data.message || "API Error");
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Login failed");
  }

  const data = await res.json();
  if (data.session?.access_token) {
    setClientSession({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      role: data?.user?.role,
      name: data?.user?.name,
      email: data?.user?.email,
      isProfileCompleted: data?.user?.isProfileCompleted,
      onboardingStep: data?.user?.onboardingStep,
    });
  }
  return data;
}

export async function logout() {
  const token = localStorage.getItem("accessToken");
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refreshToken: getStoredRefreshToken() }),
      });
    } catch {}
  }
  clearClientSession();
}
