"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
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

      if (nextStep === "DASHBOARD" && status === "ACTIVE" && approvalStatus === "ACTIVE" && onboardingStep === "DONE") {
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[oklch(0.985_0.006_250)] px-4 py-8 text-slate-950 sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,oklch(0.91_0.08_255/.55),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.985_0.006_250)_72%)]" />

      <section className="relative w-full max-w-[620px] rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
            Chờ duyệt
          </span>
        </div>

        <div className="mt-8 text-center sm:mt-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-blue-50 text-blue-600 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)]">
            <Clock3 size={30} strokeWidth={2.4} />
          </div>
          <h1 className="mt-5 text-[28px] font-black leading-tight tracking-tight text-slate-950 sm:text-[34px]">
            Hồ sơ đang chờ duyệt
          </h1>
          <p className="mx-auto mt-3 max-w-[500px] text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
            Bạn đã gửi đầy đủ thông tin. Admin sẽ kiểm tra hồ sơ trước khi mở quyền vào dashboard quản lý.
          </p>
        </div>

        <div className="mt-7 grid gap-3 rounded-[16px] border border-slate-200 bg-slate-50/80 p-3 sm:grid-cols-3">
          <StatusStep done label="Hoàn tất hồ sơ" />
          <StatusStep active label="Admin duyệt" />
          <StatusStep label="Vào dashboard" />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-emerald-100 bg-emerald-50 px-4 py-4 text-left text-sm font-semibold leading-6 text-emerald-800">
          <ShieldCheck size={20} className="mt-0.5 shrink-0" />
          <span>Sau khi admin duyệt, bấm kiểm tra trạng thái để vào hệ thống ngay.</span>
        </div>

        {message && (
          <div className="mt-4 rounded-[16px] border border-amber-100 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-800">
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-[1.15fr_.85fr]">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(37,99,235,0.24)] transition hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw size={17} className={checking ? "animate-spin" : ""} />
            Kiểm tra trạng thái
          </button>
          <button
            onClick={logout}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <LogOut size={17} />
            Đăng xuất
          </button>
        </div>
      </section>
    </main>
  );
}

function StatusStep({ label, done = false, active = false }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-[12px] px-3 py-3 text-sm font-bold ${active ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>
        {done ? <CheckCircle2 size={16} /> : active ? <Clock3 size={15} /> : <span className="h-2 w-2 rounded-full bg-current" />}
      </span>
      <span className="min-w-0 leading-snug">{label}</span>
    </div>
  );
}
