"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { clearClientSession } from "@/utils/session";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const check = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) {
        router.replace("/login/admin");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          clearClientSession();
          router.replace("/login/admin");
          return;
        }

        const data = await res.json();
        if (data?.role === "SUPER_ADMIN") {
          localStorage.setItem("userRole", data.role);
          setAuthorized(true);
        } else {
          router.replace("/not-authorized");
        }
      } catch {
        clearClientSession();
        router.replace("/login/admin");
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [router]);

  if (loading) {
    return <div className="p-6">Đang xác thực quyền SUPER_ADMIN...</div>;
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <div className="text-sm font-semibold text-slate-950">Super Admin</div>
            <div className="text-xs text-slate-500">Quản trị hệ thống cấp cao</div>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/super-admin/users" className="font-medium text-slate-700 hover:text-blue-700">Users</Link>
            <Link href="/super-admin/reports" className="font-medium text-slate-700 hover:text-blue-700">Reports</Link>
            <Link href="/admin" className="font-medium text-blue-700 hover:text-blue-800">Admin</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
