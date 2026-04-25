export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
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
    localStorage.setItem("accessToken", data.session.access_token);
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
        body: JSON.stringify({}),
      });
    } catch {}
  }
  localStorage.removeItem("accessToken");
}