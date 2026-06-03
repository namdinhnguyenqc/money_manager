"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { API_URL } from "@/lib/api";
import { authFetch } from "@/utils/authFetch";
import { clearClientSession, getStoredAccessToken, setClientSession } from "@/utils/session";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setMessage(sessionStorage.getItem("pendingApprovalMessage") || "");
    sessionStorage.removeItem("pendingApprovalMessage");
  }, []);

  const checkStatus = async () => {
    const token = getStoredAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setChecking(true);
    try {
      const res = await authFetch(`${API_URL}/auth/me`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Không kiểm tra được trạng thái.");

      setClientSession({
        accessToken: token,
        role: data?.user?.role || data?.role,
        name: data?.user?.name || data?.name,
        email: data?.user?.email || data?.email,
        status: data?.user?.status || data?.status,
        approvalStatus: data?.user?.approvalStatus || data?.approvalStatus || data?.status,
        isProfileCompleted: data?.user?.isProfileCompleted ?? data?.isProfileCompleted,
        onboardingStep: data?.user?.onboardingStep || data?.onboardingStep,
      });

      const status = data?.user?.status || data?.status;
      const approvalStatus = data?.user?.approvalStatus || data?.approvalStatus || status;
      const onboardingStep = data?.user?.onboardingStep || data?.onboardingStep;
      const nextStep = data?.user?.nextStep || data?.nextStep;

      if (nextStep === "DASHBOARD" && approvalStatus !== "PENDING_APPROVAL" && onboardingStep !== "PENDING_APPROVAL") {
        router.replace("/owner/dashboard");
        return;
      }

      if (nextStep === "COMPLETE_PROFILE" || onboardingStep === "COMPLETE_PROFILE" || data?.isProfileCompleted === false || data?.user?.isProfileCompleted === false) {
        router.replace("/complete-profile");
        return;
      }

      setMessage("Hồ sơ vẫn đang chờ admin duyệt.");
    } catch (err: any) {
      setMessage(err?.message || "Không kiểm tra được trạng thái.");
    } finally {
      setChecking(false);
    }
  };

  const logout = () => {
    clearClientSession();
    router.replace("/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-[16px] border border-slate-200 bg-white p-7 text-center shadow-sm">
        <div className="mb-5 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] bg-blue-50 text-blue-600">
          <Clock size={28} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">Hồ sơ đang chờ admin duyệt</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Bạn đã hoàn tất thông tin tài khoản. Admin cần duyệt trước khi bạn vào dashboard và sử dụng các tính năng quản lý.
        </p>
        <div className="mt-5 flex items-start gap-3 rounded-[10px] bg-emerald-50 p-3 text-left text-sm text-emerald-800">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <span>Sau khi được duyệt, bấm kiểm tra trạng thái để vào hệ thống.</span>
        </div>
        {message && <div className="mt-4 rounded-[8px] bg-amber-50 px-4 py-3 text-sm text-amber-700">{message}</div>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={checkStatus} disabled={checking} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
            Kiểm tra trạng thái
          </button>
          <button onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </section>
    </main>
  );
}
