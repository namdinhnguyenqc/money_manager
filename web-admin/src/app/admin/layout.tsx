"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, LayoutDashboard, LogOut, Menu, X, RefreshCw, ShieldCheck } from "lucide-react";
import { apiClient, API_URL } from "@/lib/api";

interface Stats {
  total: number;
  active: number;
  blocked: number;
  newThisMonth: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FIX #1: Auth Guard — redirect to /login if no token
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    loadAdminUser();
    loadStats();
  }, []);

  // FIX #11: Fetch and validate current admin user
  const loadAdminUser = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem("accessToken");
        router.replace("/login");
        return;
      }
      const data = await res.json();
      // Enforce RBAC: only ADMIN and SUPER_ADMIN can access
      if (!["ADMIN", "SUPER_ADMIN"].includes(data.role)) {
        localStorage.removeItem("accessToken");
        router.replace("/login");
        return;
      }
      setAdminUser(data);
    } catch (err) {
      console.error("Failed to load admin user:", err);
      router.replace("/login");
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiClient<Stats>("/admin/stats");
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("accessToken");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header — shows current admin info */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 text-sm truncate">{adminUser?.name || "Admin"}</div>
            <div className="text-xs text-slate-500 truncate">{adminUser?.email || "Loading..."}</div>
            {adminUser?.role && (
              <span className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 ${
                adminUser.role === "SUPER_ADMIN"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-purple-100 text-purple-700"
              }`}>
                {adminUser.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
              </span>
            )}
          </div>
          <button className="ml-auto lg:hidden text-slate-500" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            <LayoutDashboard size={18} />
            <span className="text-sm font-medium">Tổng quan</span>
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            <Users size={18} />
            <span className="text-sm font-medium">Người dùng</span>
          </Link>
        </nav>

        <div className="px-3 pb-5 border-t border-slate-200 pt-3">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors">
            <LogOut size={18} />
            <span className="text-sm font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu size={22} />
          </button>
          <span className="font-bold text-slate-800 text-sm">Money Manager Admin</span>
        </header>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-800">Tổng quan</h1>
            <button onClick={loadStats} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw size={24} className="text-blue-600 animate-spin" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-sm text-slate-500 mb-1">Tổng user</div>
                <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-sm text-slate-500 mb-1">Đang hoạt động</div>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-sm text-slate-500 mb-1">Bị khóa</div>
                <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-sm text-slate-500 mb-1">Mới tháng này</div>
                <div className="text-2xl font-bold text-blue-600">{stats.newThisMonth}</div>
              </div>
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}