"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const check = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (data?.role) {
          // Owner-only access: allow OWNER or SUPER_ADMIN
          if (["OWNER", "SUPER_ADMIN"].includes(data.role)) {
            setAuthorized(true);
          } else {
            router.replace("/login");
          }
        } else {
          setAuthorized(true);
        }
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [router]);

  if (loading) {
    return (
      <div className="p-6">Đang xác thực quyền truy cập...</div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden lg:block w-64 border-r border-slate-200 p-4 bg-white">
        <div className="mb-4 font-semibold">Owner Menu</div>
        <nav className="flex flex-col gap-2">
          <Link href="/owner/boarding-houses" className="px-2 py-1 rounded hover:bg-slate-100">Boarding Houses</Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
