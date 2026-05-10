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
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { clearClientSession } from "@/utils/session";
import Logo from "@/components/ui/Logo";

const navSections = [
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
      { href: "/owner/bookings", label: "Yêu cầu thuê (Beta)", icon: MessageSquare },
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
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const storedRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
      if (!token) {
        router.replace("/login/owner");
        return;
      }
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        window.clearTimeout(timeout);
        if (!res.ok) {
          clearClientSession();
          router.replace("/login/owner");
          return;
        }
        const data = await res.json();
        console.log("DEBUG: Auth me response data:", data);
        if (data) {
          // Force set role to OWNER in localStorage if we're in owner portal
          localStorage.setItem("userRole", "OWNER");
          setAuthorized(true);
        } else {
          router.replace("/not-authorized");
        }
      } catch {
        if (storedRole === "OWNER" || storedRole === "SUPER_ADMIN") {
          setOwnerName(localStorage.getItem("userName") || "Owner");
          setOwnerEmail(localStorage.getItem("userEmail") || "");
          setAuthorized(true);
          setLoading(false);
          return;
        }
        clearClientSession();
        router.replace("/login/owner");
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      }
    } catch {}
    queryClient.clear();
    clearClientSession();
    router.replace("/login/owner");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-sm text-slate-500">
        Đang xác thực quyền truy cập owner...
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
            <Logo />
          </div>
          <div className="flex items-center gap-3 px-5 pb-5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-950">{ownerName}</div>
              <div className="truncate text-xs text-slate-500">{ownerEmail || "owner workspace"}</div>
            </div>
            <button className="text-slate-500 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-6">
          {navSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={17} className={active ? "text-primary" : "text-slate-400"} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-3 py-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
            <LogOut size={18} />
            Đăng xuất
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
