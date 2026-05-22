"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { API_URL, apiClient } from "@/lib/api";
import type { AdminPermission, AdminPermissionResponse } from "@/lib/adminPermissions";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { clearClientSession, getStoredAccessToken } from "@/utils/session";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    void loadAdminContext(token);
  }, []);

  const loadAdminContext = async (token: string) => {
    try {
      const [meRes, permissionRes] = await Promise.all([
        fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        apiClient<AdminPermissionResponse>("/admin/me/permissions"),
      ]);

      if (!meRes.ok) {
        clearClientSession();
        router.replace("/login");
        return;
      }

      const data = (await meRes.json()) as AdminUser;
      if (!["ADMIN", "SUPER_ADMIN"].includes(data.role)) {
        clearClientSession();
        router.replace("/login");
        return;
      }

      localStorage.setItem("userRole", data.role);
      setAdminUser(data);
      setPermissions(permissionRes.permissions || []);
    } catch (err) {
      console.error("Failed to load admin context:", err);
      clearClientSession();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = getStoredAccessToken();
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
          cache: "no-store",
          credentials: "include",
        });
      }
    } catch {}

    clearClientSession();
    router.replace("/login");
  };

  const navClass = (href: string, exact = false) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
      pathname === href || (!exact && pathname.startsWith(`${href}/`))
        ? "bg-primary/10 text-primary"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-sm text-slate-500">
        Đang xác thực quyền truy cập Admin...
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col border-b border-slate-200">
          <div className="px-5 py-4">
            <Logo />
          </div>
          <div className="flex items-center gap-3 px-5 pb-5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-800">{adminUser.name || "Admin"}</div>
              <div className="truncate text-xs text-slate-500">{adminUser.email}</div>
              <span
                className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${
                  adminUser.role === "SUPER_ADMIN"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-violet-100 text-violet-700"
                }`}
              >
                {adminUser.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
              </span>
            </div>
            <button className="ml-auto text-slate-500 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {hasAdminPermission(permissions, "dashboard.view") && (
            <Link href="/admin" className={navClass("/admin", true)}>
              <LayoutDashboard size={18} />
              <span className="text-sm font-medium">Tổng quan</span>
            </Link>
          )}
          {hasAdminPermission(permissions, "account.view") && (
            <Link href="/admin/users" className={navClass("/admin/users")}>
              <Users size={18} />
              <span className="text-sm font-medium">Người dùng</span>
            </Link>
          )}
          {hasAdminPermission(permissions, "owner.view") && (
            <Link href="/admin/owners" className={navClass("/admin/owners")}>
              <Home size={18} />
              <span className="text-sm font-medium">Chủ trọ</span>
            </Link>
          )}
        </nav>

        <div className="border-t border-slate-200 px-3 pb-5 pt-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu size={22} />
          </button>
          <span className="text-sm font-bold text-slate-800">TrọCare Admin</span>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
