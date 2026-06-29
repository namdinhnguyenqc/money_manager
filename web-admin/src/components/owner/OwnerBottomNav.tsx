"use client";

import Link from "next/link";
import { LayoutDashboard, Home, Receipt, Wallet, Menu } from "lucide-react";

interface BottomTab {
  href?: string;
  label: string;
  icon: any;
  match: (pathname: string) => boolean;
  action?: "more";
}

const tabs: BottomTab[] = [
  { href: "/owner/dashboard", label: "Tổng quan", icon: LayoutDashboard, match: (p) => p.startsWith("/owner/dashboard") },
  { href: "/rooms", label: "Phòng", icon: Home, match: (p) => p === "/rooms" || p.startsWith("/rooms/") },
  { href: "/invoices", label: "Hóa đơn", icon: Receipt, match: (p) => p === "/invoices" || p.startsWith("/invoices/") },
  { href: "/payments", label: "Thu tiền", icon: Wallet, match: (p) => p === "/payments" || p.startsWith("/payments/") },
  { label: "Thêm", icon: Menu, match: () => false, action: "more" },
];

/**
 * App-like bottom tab bar shown only on mobile (hidden on lg+ where the sidebar
 * is always visible). Active tab gets a soft pill + top indicator; the "Thêm"
 * tab opens the full navigation drawer.
 */
export default function OwnerBottomNav({
  pathname,
  onMore,
}: {
  pathname: string;
  onMore: () => void;
}) {
  return (
    <nav
      className="pwa-safe-bottom fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200/80 bg-white/90 px-1.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:hidden"
      style={{ height: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom))" }}
      aria-label="Điều hướng nhanh"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.match(pathname);
        const className =
          "group relative flex flex-1 flex-col items-center justify-center gap-1 pt-2 transition-colors";

        const content = (
          <>
            {active && (
              <span className="absolute top-0 h-1 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            )}
            <span
              className={`flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                active ? "bg-blue-50 text-blue-600 scale-105" : "text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600"
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
            </span>
            <span className={`text-[10px] font-semibold leading-none ${active ? "text-blue-600" : "text-slate-400"}`}>
              {tab.label}
            </span>
          </>
        );

        if (tab.action === "more") {
          return (
            <button key={tab.label} type="button" onClick={onMore} className={className} aria-label="Mở menu đầy đủ">
              {content}
            </button>
          );
        }

        return (
          <Link key={tab.href} href={tab.href!} className={className}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
