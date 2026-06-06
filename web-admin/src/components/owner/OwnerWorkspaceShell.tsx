"use client";

import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  FileText,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  UserCircle,
  Receipt,
  Repeat,
  Settings,
  Users,
  Wallet,
  X,
  HelpCircle,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { clearClientSession, getStoredAccessToken, getStoredSessionUser } from "@/utils/session";
import { authFetch } from "@/utils/authFetch";
import Logo from "@/components/ui/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Tổng quan",
    items: [
      { href: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Quản lý vận hành",
    items: [
      { href: "/owner/boarding-houses", label: "Cơ sở", icon: Building2 },
      { href: "/rooms", label: "Phòng", icon: Home },
      { href: "/owner/tenants", label: "Khách thuê", icon: Users },
      { href: "/contracts", label: "Hợp đồng", icon: FileText },
    ]
  },
  {
    title: "Tài chính & Hóa đơn",
    items: [
      { href: "/invoices", label: "Hóa đơn", icon: Receipt, badge: "!" },
      { href: "/deposits", label: "Tiền cọc", icon: Wallet },
      { href: "/payments", label: "Thu tiền", icon: Wallet },
      { href: "/owner/transactions", label: "Sổ thu chi", icon: Repeat },
    ]
  },
  {
    title: "Mở rộng",
    items: [
      { href: "/owner/trading", label: "Kinh doanh", icon: Package },
    ]
  },
  {
    title: "Cấu hình",
    items: [
      { href: "/owner/profile", label: "Hồ sơ chủ trọ", icon: UserCircle },
      { href: "/owner/settings", label: "Cài đặt hệ thống", icon: Settings },
      { href: "/owner/feedback", label: "Báo cáo lỗi / Góp ý", icon: HelpCircle, permission: "feedback.view" },
    ]
  }
];

const isActiveRoute = (pathname: string, href: string) => {
  if (href === "/invoices") return pathname === "/invoices" || pathname.startsWith("/invoices/");
  if (href === "/deposits") return pathname === "/deposits" || pathname.startsWith("/deposits/");
  if (href === "/payments") return pathname === "/payments" || pathname.startsWith("/payments/");
  if (href === "/owner/boarding-houses") return pathname === "/owner/boarding-houses" || pathname.startsWith("/owner/boarding-houses/") || pathname.startsWith("/facilities");
  if (href === "/rooms") return pathname === "/rooms" || pathname.startsWith("/rooms/");
  if (href === "/contracts") return pathname === "/contracts" || pathname.startsWith("/contracts/") || pathname === "/owner/rental";
  if (href === "/owner/tenants") return pathname === "/owner/tenants" || pathname.startsWith("/owner/tenants/");
  if (href === "/owner/settings") return pathname === "/owner/settings" || pathname.startsWith("/owner/settings/") || pathname === "/settings";
  if (href === "/owner/profile") return pathname === "/owner/profile" || pathname.startsWith("/owner/profile/");
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function OwnerWorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [ownerName, setOwnerName] = useState("Owner");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = async () => {
      const token = getStoredAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const storedUser = getStoredSessionUser();
      if (storedUser.isProfileCompleted === false) {
        router.replace("/complete-profile");
        return;
      }
      if (storedUser.status === "PENDING_APPROVAL" || storedUser.approvalStatus === "PENDING_APPROVAL") {
        router.replace("/pending-approval");
        return;
      }
      const justLoggedIn = typeof window !== "undefined" && sessionStorage.getItem("justLoggedIn") === "true";
      if (justLoggedIn) {
        sessionStorage.removeItem("justLoggedIn");
      }

      const fetchPermissions = async () => {
        try {
          const permRes = await authFetch(`${API_URL}/owner/permissions`, { cache: "no-store" });
          if (permRes.ok) {
            const permData = await permRes.json();
            localStorage.setItem("userPermissions", JSON.stringify(permData.permissions || []));
          }
        } catch (err) {
          console.error("Failed to fetch user permissions:", err);
        }
      };

      if (justLoggedIn && (storedUser.role === "OWNER" || storedUser.role === "SUPER_ADMIN")) {
        setOwnerName(storedUser.name || "Owner");
        setOwnerEmail(storedUser.email || "");
        await fetchPermissions();
        setAuthorized(true);
        setLoading(false);
        return;
      }

      if (storedUser.role === "OWNER" || storedUser.role === "SUPER_ADMIN") {
        setOwnerName(storedUser.name || "Owner");
        setOwnerEmail(storedUser.email || "");
      }
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        const res = await authFetch(`${API_URL}/auth/me`, {
          signal: controller.signal,
          cache: "no-store",
        });
        window.clearTimeout(timeout);
        if (!res.ok) {
          clearClientSession();
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (data?.role === "OWNER" || data?.role === "SUPER_ADMIN") {
          localStorage.setItem("userRole", "OWNER");
          if (data?.name) localStorage.setItem("userName", data.name);
          if (data?.email) localStorage.setItem("userEmail", data.email);
          if (data?.status) localStorage.setItem("userStatus", data.status);
          if (data?.approvalStatus || data?.status) localStorage.setItem("approvalStatus", data.approvalStatus || data.status);
          
          await fetchPermissions();

          if (data?.isProfileCompleted === false || data?.onboardingStep === "COMPLETE_PROFILE") {
            localStorage.setItem("isProfileCompleted", "false");
            router.replace("/complete-profile");
            return;
          }
          if (data?.status === "PENDING_APPROVAL" || data?.approvalStatus === "PENDING_APPROVAL") {
            localStorage.setItem("isProfileCompleted", "true");
            router.replace("/pending-approval");
            return;
          }
          localStorage.setItem("isProfileCompleted", "true");
          setOwnerName(data?.name || localStorage.getItem("userName") || "Owner");
          setOwnerEmail(data?.email || localStorage.getItem("userEmail") || "");
          setAuthorized(true);
        } else {
          clearClientSession();
          router.replace("/not-authorized");
        }
      } catch {
        clearClientSession();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = getStoredAccessToken();
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
          cache: "no-store",
          credentials: "include",
        });
      }
    } catch {}
    queryClient.clear();
    clearClientSession();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <aside className="hidden w-72 border-r border-slate-200 bg-white lg:block">
          <div className="space-y-4 p-5">
            <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="space-y-2 pt-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-9 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 items-center justify-center p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        </main>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-slate-950/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:pointer-events-auto lg:static lg:translate-x-0 ${
          sidebarOpen ? "pointer-events-auto translate-x-0" : "pointer-events-none -translate-x-full"
        }`}
      >
        <div className="flex flex-col border-b border-slate-200">
          <div className="px-5 py-4">
            <Logo textClassName="text-lg" />
          </div>
          <div className="flex items-center gap-3 px-5 pb-5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">{ownerName}</div>
              <div className="truncate text-xs text-slate-500">{ownerEmail || "owner workspace"}</div>
            </div>
            <button className="shrink-0 text-slate-500 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
          {navSections.map((section) => {
            const filteredItems = section.items.filter((item) => {
              // If item doesn't specify a permission constraint, show it.
              if (!("permission" in item)) return true;
              
              // Get current user permissions from localStorage
              const permsStr = typeof window !== "undefined" ? localStorage.getItem("userPermissions") : null;
              if (!permsStr) return false;
              
              try {
                const perms = JSON.parse(permsStr) as string[];
                return perms.includes(item.permission as string);
              } catch {
                return false;
              }
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="flex flex-col gap-0.5">
                <div className="px-3 mb-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                  {section.title}
                </div>
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={17} className={`shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-3 py-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50">
            <LogOut size={18} className="shrink-0" />
            <span className="truncate">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button className="text-slate-600" onClick={() => setSidebarOpen(true)} aria-label="Mở menu">
            <Menu size={22} />
          </button>
          <div className="text-sm font-semibold text-slate-900">Quản lý nhà trọ</div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
