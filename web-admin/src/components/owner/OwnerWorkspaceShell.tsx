"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  UserCircle,
  Receipt,
  Repeat,
  Settings,
  Users,
  Wallet,
  X,
  HelpCircle,
  Tag,
  Bell,
  BellOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Layers,
  Zap,
  Sparkles,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { clearClientSession, getStoredAccessToken, getStoredSessionUser } from "@/utils/session";
import { isDemoMode, exitDemoSession } from "@/utils/demoSession";
import { authFetch, logAuthEvent } from "@/utils/authFetch";
import { apiGet } from "@/utils/apiClient";
import Logo from "@/components/ui/Logo";
import OwnerBottomNav from "@/components/owner/OwnerBottomNav";
import { usePWAInstall } from "@/components/PWAProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  permission?: string;
  children?: { href: string; label: string; icon: any }[];
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
    title: "Cấu hình",
    items: [
      { href: "/owner/profile", label: "Hồ sơ chủ trọ", icon: UserCircle },
      { 
        href: "/owner/settings", 
        label: "Cài đặt hệ thống", 
        icon: Settings,
        children: [
          { href: "/owner/settings?tab=sepay-logs", label: "Kết nối SePay", icon: Layers },
          { href: "/owner/settings?tab=zalo", label: "Kết nối Zalo", icon: MessageSquare },
          { href: "/owner/settings?tab=notifications", label: "Nhận thông báo", icon: Bell },
          { href: "/owner/settings?tab=pricing", label: "Bảng giá dịch vụ", icon: Zap },
          { href: "/owner/settings?tab=categories", label: "Danh mục thu chi", icon: Tag },
          { href: "/owner/settings?tab=extension", label: "Ví & Dòng tiền", icon: Wallet },
        ]
      },
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
  if (href === "/owner/transactions") return pathname === "/owner/transactions" || pathname.startsWith("/owner/transactions/");
  return pathname === href || pathname.startsWith(`${href}/`);
};


function SearchParamsHelper({ onChange }: { onChange: (params: any) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onChange(searchParams);
  }, [searchParams, onChange]);
  return null;
}

export default function OwnerWorkspaceShell({ children }: { children: React.ReactNode }) {
  const { canInstall, install } = usePWAInstall();
  const { permission, subscribed, loading: pushLoading, isSupported: pushSupported, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();

  const [isSettingsOpen, setIsSettingsOpen] = useState(() => Boolean(pathname && pathname.startsWith("/owner/settings")));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(3);

  const fetchHeaderNotifications = useCallback(async () => {
    try {
      const res = await apiGet<any>('/owner/notifications');
      if (res?.data && Array.isArray(res.data)) {
        setNotificationItems(res.data);
        setUnreadCount(res.unreadCount ?? res.data.filter((n: any) => !n.readAt).length);
      } else {
        setNotificationItems([]);
        setUnreadCount(0);
      }
    } catch {
      setNotificationItems([]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchHeaderNotifications();
  }, [fetchHeaderNotifications]);

  const [currentSearchParams, setCurrentSearchParams] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [ownerName, setOwnerName] = useState("Owner");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demo, setDemo] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

    const isItemActive = (href: string) => {
    const [hPath, hQuery] = href.split("?");
    const pathActive = isActiveRoute(pathname, hPath);
    if (!pathActive) return false;
    
    if (hQuery) {
      const hParams = new URLSearchParams(hQuery);
      let matches = true;
      hParams.forEach((val, key) => {
        if (currentSearchParams?.get(key) !== val) {
          matches = false;
        }
      });
      return matches;
    }
    
    if (hPath === "/owner/settings" && currentSearchParams?.get("tab")) {
      return false;
    }
    
    return true;
  };

const getPageTitle = (path: string) => {
    if (path === "/owner/dashboard") return "Dashboard";
    if (path.startsWith("/owner/boarding-houses") || path.startsWith("/facilities")) return "Cơ sở";
    if (path.startsWith("/rooms")) return "Phòng";
    if (path.startsWith("/owner/tenants")) return "Khách thuê";
    if (path.startsWith("/contracts") || path === "/owner/rental") return "Hợp đồng";
    if (path.startsWith("/invoices")) return "Hóa đơn";
    if (path.startsWith("/deposits")) return "Tiền cọc";
    if (path.startsWith("/payments")) return "Thu tiền";
    if (path.startsWith("/owner/transactions")) return "Số thu chi";

    if (path.startsWith("/owner/profile")) return "Hồ sơ chủ trọ";
    if (path.startsWith("/owner/settings") || path === "/settings") {
      const tab = currentSearchParams?.get("tab");
      if (tab === "sepay-logs") return "Kết nối SePay";
      if (tab === "zalo") return "Kết nối Zalo";
      if (tab === "notifications") return "Nhận thông báo";
      if (tab === "pricing") return "Bảng giá dịch vụ";
      if (tab === "categories") return "Danh mục thu chi";
      if (tab === "extension") return "Ví & Dòng tiền";
      return "Cài đặt hệ thống";
    }
    if (path.startsWith("/owner/feedback")) return "Báo cáo lỗi / Góp ý";
    if (path.startsWith("/owner/notifications")) return "Thông báo hệ thống";
    return "Hệ thống quản lý TrọCare";
  };

  useEffect(() => { setDemo(isDemoMode()); }, []);

  useEffect(() => {
    const check = async () => {
      const token = getStoredAccessToken();
      if (!token) {
        setLoading(false);
        router.replace("/login");
        return;
      }
      const storedUser = getStoredSessionUser();
      if (storedUser.status === "PENDING_APPROVAL" || storedUser.approvalStatus === "PENDING_APPROVAL") {
        setLoading(false);
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

      const isOwnerStored = storedUser.role === "OWNER" || storedUser.role === "SUPER_ADMIN";

      // OPTIMISTIC RENDER: trust the stored owner session so the workspace appears
      // instantly instead of blocking on /auth/me — which may hit a cold backend
      // (Render spin-up) or need a token refresh. We still revalidate in the
      // background below and redirect only if the session is genuinely invalid.
      if (isOwnerStored) {
        setOwnerName(storedUser.name || "Owner");
        setOwnerEmail(storedUser.email || "");
        setAuthorized(true);
        setLoading(false);
      }

      // Fresh login: session was just verified by the login flow — skip the
      // blocking re-check and only warm up permissions in the background.
      if (justLoggedIn && isOwnerStored) {
        fetchPermissions();
        return;
      }

      // Background revalidation. Never blocks the optimistic render above; on a
      // real auth failure (401/403) we sign the user out, on network/timeout we
      // keep the cached session so a cold backend doesn't lock the user out.
      try {
        const res = await authFetch(`${API_URL}/auth/me`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            const data = await res.clone().json().catch(() => ({}));
            logAuthEvent("AUTH_OWNER_ME_AUTH_FAILED", {
              status: res.status,
              code: data?.code,
              message: data?.message || data?.error,
            });
            clearClientSession();
            router.replace("/login");
            return;
          }
          logAuthEvent("AUTH_OWNER_ME_NON_AUTH_ERROR", { status: res.status });
          if (!isOwnerStored && token) setAuthorized(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data?.role === "OWNER" || data?.role === "SUPER_ADMIN") {
          localStorage.setItem("userRole", "OWNER");
          if (data?.name) localStorage.setItem("userName", data.name);
          if (data?.email) localStorage.setItem("userEmail", data.email);
          if (data?.status) localStorage.setItem("userStatus", data.status);
          if (data?.approvalStatus || data?.status) localStorage.setItem("approvalStatus", data.approvalStatus || data.status);

          fetchPermissions();

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
          logAuthEvent("AUTH_OWNER_NOT_AUTHORIZED", { role: data?.role });
          clearClientSession();
          router.replace("/not-authorized");
        }
      } catch {
        // Network error / timeout — most likely a cold backend. Keep the cached
        // session (already authorized above) rather than kicking the user out.
        logAuthEvent("AUTH_OWNER_ME_NETWORK_ERROR");
        if (!isOwnerStored && token) setAuthorized(true);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [router]);

  // Auto-request push permission once user is authorized
  useEffect(() => {
    if (!authorized || !pushSupported || subscribed || permission === "denied") return;
    // Small delay so the page settles before showing the browser dialog
    const t = setTimeout(() => { subscribePush(); }, 1500);
    return () => clearTimeout(t);
  }, [authorized, pushSupported, subscribed, permission, subscribePush]);

  const handleLogout = async () => {
    if (isDemoMode()) {
      exitDemoSession();
      queryClient.clear();
      router.replace("/login");
      return;
    }
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
      <Suspense fallback={null}>
        <SearchParamsHelper onChange={setCurrentSearchParams} />
      </Suspense>
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

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "w-72 lg:w-20" : "w-72"}`}
      >
        <div className="flex flex-col border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between px-5 py-4">
            <Logo collapsed={isCollapsed} />
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 transition-all shadow-sm"
              title={isCollapsed ? "Mở rộng menu" : "Thu hẹp menu"}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
          <div className={`flex items-center gap-3 px-5 pb-4 transition-all duration-300 ${isCollapsed ? "lg:hidden" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">Chào, {ownerName || "bạn"}</div>
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
                <div className={`px-3 mb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider transition-all duration-300 ${
                  isCollapsed ? "lg:hidden" : ""
                }`}>
                  {section.title}
                </div>
                {isCollapsed && (
                  <div className="hidden lg:block border-t border-slate-100 my-1 mx-2" />
                )}
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.href);
                  const isParent = !!item.children;
                  return (
                    <div key={item.href} className="flex flex-col gap-0.5">
                      <Link
                        href={isParent ? "#" : item.href}
                        prefetch={!isParent}
                        onClick={(e: React.MouseEvent) => {
                          if (isParent) {
                            e.preventDefault();
                            setIsSettingsOpen(!isSettingsOpen);
                          } else {
                            setSidebarOpen(false);
                          }
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={`flex items-center transition-all duration-150 group relative ${
                          isCollapsed 
                            ? "lg:justify-center lg:rounded-xl lg:p-2 lg:mx-auto lg:w-9 lg:h-9 gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold" 
                            : "gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold border border-transparent"
                        } ${
                          active 
                            ? "bg-blue-50/50 border-blue-100/50 text-blue-700 shadow-sm" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {active && !isCollapsed && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-blue-600" />
                        )}
                        <Icon size={16} className={`shrink-0 transition-colors ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                        <span className={`min-w-0 flex-1 truncate transition-all duration-150 ${
                          isCollapsed ? "lg:hidden" : ""
                        }`}>
                          {item.label}
                        </span>
                        {item.badge && !isCollapsed && (
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${
                            item.badge === "PRO" ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm" : "bg-red-500"
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        {isParent && !isCollapsed && (
                          <ChevronDown
                            size={14}
                            className={`shrink-0 transition-transform duration-150 text-slate-400 group-hover:text-slate-600 ${
                              isSettingsOpen ? "" : "-rotate-90"
                            }`}
                          />
                        )}
                      </Link>

                      {item.children && !isCollapsed && isSettingsOpen && (
                        <div className="flex flex-col gap-0.5 pl-4 mt-0.5 border-l border-slate-100 ml-4.5 animate-in slide-in-from-top-1 duration-150">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive = isItemActive(child.href);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                prefetch={true}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all relative ${
                                  childActive 
                                    ? "text-blue-700 bg-blue-50/40" 
                                    : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-900"
                                }`}
                              >
                                {childActive && (
                                  <span className="absolute left-[-1px] top-2 bottom-2 w-[2px] bg-blue-600 rounded-full" />
                                )}
                                <ChildIcon size={12} className={`shrink-0 ${childActive ? "text-blue-600" : "text-slate-400"}`} />
                                <span className="truncate">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3 space-y-1">
          {pushSupported && (
            <button
              onClick={subscribed ? unsubscribePush : subscribePush}
              disabled={pushLoading}
              className={`flex lg:hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${subscribed ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {subscribed ? <Bell size={18} className="shrink-0" /> : <BellOff size={18} className="shrink-0" />}
              <span className="truncate">{subscribed ? "Thông báo đang bật" : "Bật thông báo"}</span>
              {subscribed && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
            </button>
          )}
          {canInstall && (
            <button onClick={install} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-50">
              <svg className="shrink-0" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a5 5 0 0 1 5 5v2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2V7a5 5 0 0 1 5-5z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              <span className="truncate">Cài ứng dụng</span>
            </button>
          )}
          <button onClick={handleLogout} className="flex lg:hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50">
            <LogOut size={18} className="shrink-0" />
            <span className="truncate">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${isCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <header className="pwa-safe-top sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition active:scale-95 hover:bg-slate-200" onClick={() => setSidebarOpen(true)} aria-label="Mở menu">
              <Menu size={20} />
            </button>
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  const next = !notificationsOpen;
                  setNotificationsOpen(next);
                  if (next) fetchHeaderNotifications();
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                title="Thông báo hệ thống"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-950 text-sm font-bold text-white shadow-sm shadow-blue-200 transition active:scale-95"
                aria-label="Tài khoản"
              >
                {(ownerName || "O").charAt(0).toUpperCase()}
              </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2.5 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-800 truncate">{ownerName}</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{ownerEmail}</div>
                  </div>
                  <Link 
                    href="/owner/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all mt-1"
                  >
                    <UserCircle size={15} />
                    Thông tin hồ sơ
                  </Link>
                  <Link 
                    href="/owner/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all"
                  >
                    <Settings size={15} />
                    Cài đặt hệ thống
                  </Link>
                  <button 
                    onClick={() => { setDropdownOpen(false); handleLogout(); }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all border-t border-slate-100 mt-1"
                  >
                    <LogOut size={15} />
                    Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between bg-white border-b border-slate-100 px-6 py-3.5 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-base font-extrabold text-blue-600 tracking-tight">{getPageTitle(pathname)}</span>
          </div>
          <div className="flex items-center gap-4">
            

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  const next = !notificationsOpen;
                  setNotificationsOpen(next);
                  if (next) fetchHeaderNotifications();
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                title="Thông báo hệ thống"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <span className="text-xs font-black text-slate-800">Thông báo hệ thống</span>
                      <button
                        type="button"
                        onClick={async () => {
                          setUnreadCount(0);
                          setNotificationItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
                          setNotificationsOpen(false);
                          try {
                            const { apiPost } = await import("@/utils/apiClient");
                            await apiPost("/owner/notifications/read-all", {});
                          } catch {
                            // Suppress fallback error
                          }
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Đọc tất cả
                      </button>
                    </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notificationItems.length > 0 ? (
                          notificationItems.map((item, idx) => (
                            <Link
                              key={item.id || idx}
                              href={item.href || "/owner/notifications"}
                              onClick={() => setNotificationsOpen(false)}
                              className="flex gap-2.5 items-start p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group/item"
                            >
                              <div
                                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                  item.eventType === "payment"
                                    ? "bg-emerald-500"
                                    : item.eventType === "contract"
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                                }`}
                              />
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 group-hover/item:text-blue-600 transition-colors truncate">
                                  {item.title}
                                </p>
                                <p className="text-xs text-slate-600 font-medium truncate">
                                  {item.body}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Vừa xong"}
                                </p>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400">
                            Chưa có thông báo mới
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-2.5 mt-3 text-center">
                        <Link
                          href="/owner/notifications"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900"
                        >
                          Xem tất cả thông báo
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

{/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all select-none"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-950 text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
                  {(ownerName || "O").charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{ownerName || "Chủ trọ"}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-800 truncate">{ownerName}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{ownerEmail}</div>
                    </div>
                    <Link 
                      href="/owner/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all mt-1"
                    >
                      <UserCircle size={15} />
                      Thông tin hồ sơ
                    </Link>
                    <Link 
                      href="/owner/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all"
                    >
                      <Settings size={15} />
                      Cài đặt hệ thống
                    </Link>
                    <button 
                      onClick={() => { setDropdownOpen(false); handleLogout(); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all border-t border-slate-100 mt-1"
                    >
                      <LogOut size={15} />
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {demo && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-800">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="flex h-5 items-center rounded-full bg-amber-500 px-2 text-[10px] font-bold uppercase tracking-wide text-white">Demo</span>
              <span className="hidden sm:inline">Bạn đang xem dữ liệu mẫu — mọi thay đổi không được lưu.</span>
              <span className="sm:hidden">Dữ liệu mẫu, không lưu.</span>
            </div>
            <button onClick={handleLogout} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100">
              Thoát demo
            </button>
          </div>
        )}
        <main className="has-bottom-nav flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:pb-6">{children}</main>
      </div>

      <OwnerBottomNav pathname={pathname} onMore={() => setSidebarOpen(true)} />
    </div>
  );
}
