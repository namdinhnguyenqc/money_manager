"use client";

import { FormEvent, useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { API_URL } from "@/lib/api";
import { setClientSession } from "@/utils/session";

type AdminLoginResponse = {
  session?: { access_token?: string };
  accessToken?: string;
  user?: {
    role?: string;
    name?: string;
    email?: string;
  };
  error?: string;
  message?: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as AdminLoginResponse;
      const accessToken = data.session?.access_token || data.accessToken;
      if (!res.ok || !accessToken) {
        throw new Error(data.error || data.message || "Đăng nhập Admin thất bại.");
      }
      setClientSession({
        accessToken,
        role: data.user?.role,
        name: data.user?.name,
        email: data.user?.email,
      });
      router.replace("/admin");
    } catch (err: any) {
      setError(err?.message || "Không thể đăng nhập Admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Logo />
        <div className="mt-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-950">Admin Portal</h1>
            <p className="text-sm text-slate-500">Đăng nhập cổng vận hành nội bộ.</p>
          </div>
        </div>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Tên đăng nhập</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              autoComplete="username"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Mật khẩu</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button className="w-full" size="lg" loading={loading} icon={<LogIn size={17} />}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập Admin"}
          </Button>
        </form>
      </section>
    </main>
  );
}
