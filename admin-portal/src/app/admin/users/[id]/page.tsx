"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Lock, Trash2, Unlock } from "lucide-react";
import { API_URL } from "@/lib/api";

type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "USER" | "OWNER" | "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE" | "BLOCKED" | "DELETED";
  provider?: string;
  created_at?: string;
  last_login_at?: string;
  loginLogs?: Array<{
    login_at: string;
    success: boolean;
    ip_address?: string;
    device_info?: string;
  }>;
};

const statusColor = (status: string) => {
  if (status === "ACTIVE") return "bg-green-100 text-green-800";
  if (status === "BLOCKED") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-500";
};

const roleColor = (role: string) => {
  if (role === "SUPER_ADMIN") return "bg-orange-100 text-orange-800";
  if (role === "ADMIN") return "bg-purple-100 text-purple-800";
  if (role === "OWNER") return "bg-emerald-100 text-emerald-800";
  return "bg-blue-100 text-blue-800";
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, { headers: authHeaders() as HeadersInit });
      if (res.status === 401 || res.status === 403) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error("Không thể tải thông tin người dùng.");
      const data = await res.json();
      setUser(data);
    } catch (e: any) {
      setError(e?.message || "Lỗi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void load();
  }, [userId]);

  const updateStatus = async (status: string) => {
    if (!confirm(`Xác nhận đổi trạng thái thành "${status}"?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: authHeaders() as HeadersInit,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Thao tác thất bại.");
      }
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const updateRole = async (role: string) => {
    if (!confirm(`Xác nhận đổi vai trò thành "${role}"?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: authHeaders() as HeadersInit,
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Thao tác thất bại.");
      }
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const softDelete = async () => {
    if (!confirm("Xóa mềm người dùng này? Họ sẽ không thể đăng nhập.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders() as HeadersInit,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Xóa thất bại.");
      }
      router.push("/admin/users");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex h-48 items-center justify-center text-slate-500">Đang tải...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!user) return <div className="p-4 text-slate-500">Không tìm thấy người dùng.</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft size={15} />
          Quay lại
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Chi tiết người dùng</h1>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
            {user.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="text-lg font-bold text-slate-800">{user.name || "-"}</div>
            <div className="text-sm text-slate-500">{user.email}</div>
            <div className="mt-1 flex gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleColor(user.role)}`}>{user.role}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(user.status)}`}>{user.status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div><span className="text-slate-400">Provider:</span> {user.provider || "GOOGLE"}</div>
          <div><span className="text-slate-400">Tạo lúc:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "-"}</div>
          <div className="col-span-2">
            <span className="text-slate-400">Đăng nhập gần nhất:</span>{" "}
            {user.last_login_at ? new Date(user.last_login_at).toLocaleString("vi-VN") : "Chưa từng"}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-700">Hành động quản trị</h2>
        <div className="flex flex-wrap gap-3">
          {user.status === "ACTIVE" ? (
            <button
              onClick={() => updateStatus("BLOCKED")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <Lock size={15} />
              Khóa tài khoản
            </button>
          ) : user.status === "BLOCKED" ? (
            <button
              onClick={() => updateStatus("ACTIVE")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              <Unlock size={15} />
              Mở khóa
            </button>
          ) : null}

          {user.role === "USER" && (
            <button
              onClick={() => updateRole("OWNER")}
              disabled={actionLoading}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              Chuyển thành Owner
            </button>
          )}
          {user.role === "USER" && (
            <button
              onClick={() => updateRole("ADMIN")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              <ArrowUp size={15} />
              Nâng lên Admin
            </button>
          )}
          {user.role === "ADMIN" && (
            <button
              onClick={() => updateRole("USER")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <ArrowDown size={15} />
              Hạ xuống User
            </button>
          )}
          {user.role === "OWNER" && (
            <button
              onClick={() => updateRole("USER")}
              disabled={actionLoading}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Hạ xuống User
            </button>
          )}

          {user.status !== "DELETED" && (
            <button
              onClick={softDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              <Trash2 size={15} />
              Xóa mềm
            </button>
          )}
        </div>
        {actionLoading && <p className="mt-3 text-sm text-slate-500">Đang xử lý...</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-700">Lịch sử đăng nhập gần đây</h2>
        {(!user.loginLogs || user.loginLogs.length === 0) ? (
          <p className="text-sm text-slate-500">Chưa có lịch sử đăng nhập.</p>
        ) : (
          <div className="space-y-2">
            {user.loginLogs.map((log, index) => (
              <div key={index} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
                <div>
                  <span className={`mr-2 font-semibold ${log.success ? "text-green-600" : "text-red-600"}`}>
                    {log.success ? "Thành công" : "Thất bại"}
                  </span>
                  <span className="text-slate-500">{log.ip_address || "IP ẩn"}</span>
                </div>
                <div className="text-slate-400">{new Date(log.login_at).toLocaleString("vi-VN")}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
