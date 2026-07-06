"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import { setClientSession } from "@/utils/session";

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const LOGIN_TIMEOUT_MS = 30000;
const HEALTH_TIMEOUT_MS = 5000;

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(`Máy chủ phản hồi quá lâu (${Math.round(timeoutMs / 1000)}s). Vui lòng thử lại sau vài giây.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function OwnerGoogleLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocalDev, setIsLocalDev] = useState(false);
  const [showFakeAccountChooser, setShowFakeAccountChooser] = useState(false);

  const handleSelectFakeAccount = async (name: string, email: string) => {
    setShowFakeAccountChooser(false);
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate realistic Google login delay
      setClientSession({
        accessToken: "demo-token",
        role: "OWNER",
        name,
        email,
        status: "ACTIVE",
        approvalStatus: "APPROVED",
        isProfileCompleted: true,
        onboardingStep: "COMPLETE_PROFILE",
      });
      localStorage.setItem("trocare.demoMode", "1");
      sessionStorage.setItem("justLoggedIn", "true");
      router.replace("/owner/dashboard");
    } catch (err: any) {
      setError("Không thể đăng nhập bằng tài khoản này.");
      setLoading(false);
    }
  };

  const completeLogin = async (googleIdToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/owner-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleIdToken }),
        credentials: "include",
        cache: "no-store",
      }, LOGIN_TIMEOUT_MS);
      const authData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(authData?.message || authData?.error || `Lỗi server (${res.status})`);
      }

      const accessToken = authData?.accessToken || authData?.session?.access_token;
      if (!accessToken) {
        throw new Error("Không nhận được phiên đăng nhập từ server.");
      }

      const role = authData?.user?.role || "OWNER";
      const isProfileCompleted = authData?.user?.isProfileCompleted ?? false;
      const onboardingStep = authData?.user?.onboardingStep ?? "COMPLETE_PROFILE";
      const approvalStatus = authData?.user?.approvalStatus || authData?.user?.status;

      setClientSession({
        accessToken,
        role,
        name: authData?.user?.name,
        email: authData?.user?.email,
        status: authData?.user?.status,
        approvalStatus,
        isProfileCompleted,
        onboardingStep,
      });

      sessionStorage.setItem("justLoggedIn", "true");

      // Use client-side router.replace to prevent saving login page in browser history
      router.replace(!isProfileCompleted ? "/complete-profile" : approvalStatus === "PENDING_APPROVAL" ? "/pending-approval" : "/owner/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message ?? "Đăng nhập owner thất bại.");
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsLocalDev(["localhost", "127.0.0.1"].includes(window.location.hostname));

    if (!GOOGLE_CLIENT_ID) {
      console.error("❌ GOOGLE_CLIENT_ID is missing!");
      return;
    }
    fetchWithTimeout(`${API_URL}/health`, { cache: "no-store" }, HEALTH_TIMEOUT_MS).catch(() => null);

    const renderGoogleButton = () => {
      const container = document.getElementById("google-btn-container");
      if (!container || !window.google) return;
      
      try {
        container.innerHTML = ""; // Clear loader
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            if (response?.credential) completeLogin(response.credential);
          },
        });
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          width: 360,
          text: "continue_with",
        });
      } catch (err) {
        console.error("❌ Error rendering Google button:", err);
        setError("Lỗi hiển thị nút đăng nhập.");
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const scriptId = "google-jssdk";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          renderGoogleButton();
        };
        script.onerror = (e) => {
          console.error("❌ Google script FAILED to load:", e);
          setError("Không thể tải Google Sign-In. Kiểm tra kết nối mạng.");
        };
        document.head.appendChild(script);
      } else {
        const poll = setInterval(() => {
          if (window.google?.accounts?.id) {
            clearInterval(poll);
            renderGoogleButton();
          }
        }, 200);
        setTimeout(() => clearInterval(poll), 10000);
      }
    }
  }, []);

  return (
    <div className="space-y-4">
      {GOOGLE_CLIENT_ID ? (
        <div className="flex min-h-[66px] items-center justify-center rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_12px_24px_rgba(15,23,42,0.06)] hover:shadow-[0_22px_42px_rgba(37,99,235,0.13)] hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden">
          <div id="google-btn-container" className="z-10 flex w-full justify-center">
            <div className="flex items-center gap-3 text-base font-bold text-slate-500">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              Đang bảo mật kết nối...
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowFakeAccountChooser(true)}
          disabled={loading}
          className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Tiếp tục với Google
        </button>
      )}

      {showFakeAccountChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-slate-200 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowFakeAccountChooser(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ×
            </button>
            <div className="flex flex-col items-center mb-6">
              <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <h3 className="text-base font-extrabold text-slate-800">Chọn tài khoản</h3>
              <p className="text-xs text-slate-400 mt-1">để tiếp tục đăng nhập TrọCare</p>
            </div>
            
            <div className="space-y-2">
              {[
                { name: "Nguyễn Đình Hà Nam", email: "nam.nguyen@trocare.com", avatar: "N" },
                { name: "Khách hàng Demo", email: "demo.guest@gmail.com", avatar: "D" },
              ].map((acc, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelectFakeAccount(acc.name, acc.email)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {acc.avatar}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{acc.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{acc.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Đang xử lý đăng nhập...
        </div>
      )}

      {isLocalDev && (
        <button
          type="button"
          onClick={() => completeLogin("mock-owner-google-token")}
          disabled={loading}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Đăng nhập dev local
        </button>
      )}
    </div>
  );
}
