"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import { setClientSession } from "@/utils/session";

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function OwnerGoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocalDev, setIsLocalDev] = useState(false);

  const completeLogin = async (googleIdToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/owner-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleIdToken }),
      });
      const authData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(authData?.message || authData?.error || `Lỗi server (${res.status})`);
      }

      const accessToken = authData?.accessToken || authData?.session?.access_token;
      const refreshToken = authData?.refreshToken || authData?.session?.refresh_token;
      if (!accessToken) {
        throw new Error("Không nhận được phiên đăng nhập từ server.");
      }

      const role = authData?.user?.role || "OWNER";
      const isProfileCompleted = authData?.user?.isProfileCompleted ?? false;
      const onboardingStep = authData?.user?.onboardingStep ?? "COMPLETE_PROFILE";

      setClientSession({
        accessToken,
        refreshToken,
        role,
        name: authData?.user?.name,
        email: authData?.user?.email,
        isProfileCompleted,
        onboardingStep,
      });

      window.location.assign(isProfileCompleted ? "/owner/dashboard" : "/complete-profile");
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
    console.log("✅ GOOGLE_CLIENT_ID found:", GOOGLE_CLIENT_ID.substring(0, 20) + "...");

    const renderGoogleButton = () => {
      const container = document.getElementById("google-btn-container");
      console.log("🔄 renderGoogleButton called. window.google:", !!window.google, "container:", !!container);
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
        console.log("✅ Google button rendered!");
      } catch (err) {
        console.error("❌ Error rendering Google button:", err);
        setError("Lỗi hiển thị nút đăng nhập.");
      }
    };

    if (window.google?.accounts?.id) {
      console.log("✅ Google SDK already loaded, rendering immediately.");
      renderGoogleButton();
    } else {
      console.log("⏳ Google SDK not loaded yet, injecting script...");
      const scriptId = "google-jssdk";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          console.log("✅ Google script loaded!");
          renderGoogleButton();
        };
        script.onerror = (e) => {
          console.error("❌ Google script FAILED to load:", e);
          setError("Không thể tải Google Sign-In. Kiểm tra kết nối mạng.");
        };
        document.head.appendChild(script);
      } else {
        console.log("ℹ️ Script tag exists. Waiting for google object...");
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
        <div className="flex min-h-[50px] items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm relative overflow-hidden">
          <div id="google-btn-container" className="z-10 flex w-full justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Đang tải...
            </div>
          </div>
        </div>
      ) : null}

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
