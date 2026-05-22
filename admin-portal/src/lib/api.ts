import { clearClientSession, getStoredAccessToken, setClientSession } from "@/utils/session";
import { authFetch, handleUnauthorizedLogout } from "@/utils/authFetch";
import { API_URL } from "@/lib/apiUrl";

export { API_URL };

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
      sessionStorage.setItem("profileRequiredMessage", data?.message || "Vui lÃ²ng hoÃ n táº¥t há»“ sÆ¡ Ä‘á»ƒ tiáº¿p tá»¥c sá»­ dá»¥ng há»‡ thá»‘ng.");
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
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Login failed");
  }

  const data = await res.json();
  if (data.session?.access_token) {
    setClientSession({
      accessToken: data.session.access_token,
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
  const token = getStoredAccessToken();
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        cache: "no-store",
        credentials: "include",
      });
    } catch {}
  }
  clearClientSession();
}
