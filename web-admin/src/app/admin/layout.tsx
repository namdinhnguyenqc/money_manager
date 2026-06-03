"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Home,
  FileText,
  Receipt,
  Wallet,
  Bug,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  Loader2,
  ChevronRight
} from "lucide-react";
import { clearClientSession, getStoredAccessToken, getStoredSessionUser } from "@/utils/session";
import { apiGet } from "@/utils/apiClient";
import Logo from "@/components/ui/Logo";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/rooms", label: "Quản lý phòng", icon: Home, isPlaceholder: true },
  { href: "/admin/contracts", label: "Quản lý hợp đồng", icon: FileText, isPlaceholder: true },
  { href: "/admin/invoices", label: "Quản lý hóa đơn", icon: Receipt, isPlaceholder: true },
  { href: "/admin/payments", label: "Quản lý thanh toán", icon: Wallet, isPlaceholder: true },
  { href: "/admin/owner-approvals", label: "Duyệt tài khoản", icon: Users },
  { href: "/admin/feedback", label: "Báo cáo lỗi", icon: Bug, hasBadge: true },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings, isPlaceholder: true },
];

const primaryAdminActions = [
  {
    href: "/admin/owner-approvals",
    label: "Duyệt tài khoản",
    description: "Xem hồ sơ owner mới và approve",
    icon: Users,
    tone: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    href: "/admin/feedback",
    label: "Báo cáo lỗi",
    description: "Ticket lỗi, góp ý và phản hồi owner",
    icon: Bug,
    tone: "bg-red-50 text-red-700 border-red-100",
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTicketCount, setActiveTicketCount] = useState(0);

  const fetchActiveTickets = async () => {
    try {
      const res = await apiGet<{ data: any[] }>("/admin/feedback/all");
      const activeTickets = (res?.data || []).filter(
        (t) => t.status === "new" || t.status === "reopened"
      );
      setActiveTicketCount(activeTickets.length);
    } catch (err) {
      console.warn("Failed to fetch admin ticket count for layout badge:", err);
    }
  };

  useEffect(() => {
    const check = async () => {
      try {
        const token = getStoredAccessToken();
        if (!token) {
          router.replace("/login");
          return;
        }
        const storedUser = getStoredSessionUser();
        if (storedUser.role === "ADMIN" || storedUser.role === "SUPER_ADMIN") {
          setAdminName(storedUser.name || "Admin Manager");
          setAdminEmail(storedUser.email || "admin@trocare.vn");
          setAuthorized(true);
          setLoading(false);
          fetchActiveTickets();
          
          // Polling every 30 seconds for live badge updates
          const interval = setInterval(fetchActiveTickets, 30000);
          return () => clearInterval(interval);
        } else {
          clearClientSession();
          router.replace("/not-authorized");
        }
      } catch (err) {
        console.error("Auth check error in admin layout:", err);
        clearClientSession();
        router.replace("/login");
      }
    };
    check();
  }, [router]);

  const handleLogout = () => {
    clearClientSession();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-slate-800" />
        </div>
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
            <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 mt-1.5 inline-block tracking-wider">
              Hệ thống quản trị (Admin)
            </span>
          </div>
          <div className="flex items-center gap-3 px-5 pb-5 mt-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-900">{adminName}</div>
              <div className="truncate text-xs font-semibold text-slate-400">{adminEmail}</div>
            </div>
            <button className="shrink-0 text-slate-500 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
          <div>
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3 pb-2 block select-none">
              Tác vụ chính
            </span>
            <div className="space-y-2">
              {primaryAdminActions.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
                      active ? "border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/10" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border ${active ? "border-white/15 bg-white/10 text-white" : item.tone}`}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-black ${active ? "text-white" : "text-slate-950"}`}>{item.label}</span>
                      <span className={`mt-0.5 block truncate text-[11px] font-semibold ${active ? "text-slate-300" : "text-slate-500"}`}>{item.description}</span>
                    </span>
                    <ChevronRight size={16} className={active ? "text-white" : "text-slate-400 group-hover:text-slate-700"} />
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3 pb-2 block select-none">
            Điều hướng quản lý
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            
            if (item.isPlaceholder) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed opacity-60 hover:bg-slate-50/50"
                  title="Chức năng đang phát triển"
                >
                  <Icon size={17} className="shrink-0 text-slate-300" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="text-[8px] font-bold uppercase bg-slate-100 text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  active 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={17} className={`shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hasBadge && activeTicketCount > 0 && (
                  <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black leading-none text-white shadow-sm">
                    {activeTicketCount}
                  </span>
                )}
              </Link>
            );
          })}
          </div>
        </nav>

        <div className="border-t border-slate-200 px-3 py-3">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50">
            <LogOut size={18} className="shrink-0" />
            <span className="truncate">Đăng xuất hệ thống</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button className="text-slate-600" onClick={() => setSidebarOpen(true)} aria-label="Mở menu">
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1 text-sm font-semibold text-slate-900">Admin Control Panel</div>
          <Link href="/admin/owner-approvals" className="rounded-[8px] bg-blue-50 px-2.5 py-2 text-xs font-black text-blue-700">
            Duyệt
          </Link>
          <Link href="/admin/feedback" className="rounded-[8px] bg-red-50 px-2.5 py-2 text-xs font-black text-red-700">
            Lỗi
          </Link>
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
