"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, LockKeyhole, Loader2, ArrowLeft } from "lucide-react";
import { API_URL } from "@/lib/api";
import { setClientSession } from "@/utils/session";
import Logo from "@/components/ui/Logo";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Đăng nhập admin thất bại.");
      }

      setClientSession({
        accessToken: data.accessToken,
        role: data?.user?.role,
        name: data?.user?.name,
        email: data?.user?.email,
      });

      window.location.assign("/admin/users");
    } catch (err: any) {
      setError(err?.message ?? "Không thể đăng nhập admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-950">
      <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-slate-200/50 blur-3xl" />
      
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <div>
          <Link href="/login" className="mb-12 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft size={18} /> Quay lại lựa chọn
          </Link>
        </div>

        <div className="grid overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 lg:grid-cols-[1fr_minmax(0,480px)]">
          {/* Left Panel: Info */}
          <section className="hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
            <div>
              <Logo className="mb-12" size="md" textClassName="text-white text-2xl" />
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-slate-300">
                <ShieldCheck size={14} />
                Control Plane
              </div>
              <h1 className="mt-8 text-4xl font-black leading-tight tracking-tighter">Admin Console</h1>
              <p className="mt-6 max-w-md text-lg font-medium leading-relaxed text-slate-400">
                Hệ thống quản trị tập trung dành cho quản trị viên và điều hành hệ thống. Kiểm soát toàn bộ hạ tầng TrọCare.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Security</div>
                <div className="mt-2 text-xl font-black">Verified</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Service</div>
                <div className="mt-2 text-xl font-black">Operational</div>
              </div>
            </div>
          </section>

          {/* Right Panel: Form */}
          <section className="p-8 sm:p-12">
            <div className="mb-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-900">
                <LockKeyhole size={14} />
                Auth Required
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">Internal Login</h2>
              <p className="mt-3 text-base font-medium text-slate-500">Nhập tài khoản quản trị để tiếp tục.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold outline-none transition focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-black active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                {loading ? "Đang xác thực..." : "Đăng nhập Admin"}
              </button>
            </form>

            <div className="mt-10 rounded-2xl bg-slate-50 p-5 text-center">
              <p className="text-xs font-bold leading-relaxed text-slate-500">
                Demo local: <span className="text-slate-900">admin / admin</span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
