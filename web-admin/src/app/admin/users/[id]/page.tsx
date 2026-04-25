"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
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

const statusColor = (s: string) => {
  if (s === "ACTIVE") return "bg-green-100 text-green-800";
  if (s === "BLOCKED") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-500";
};

const roleColor = (r: string) => {
  if (r === "SUPER_ADMIN") return "bg-orange-100 text-orange-800";
  if (r === "ADMIN") return "bg-purple-100 text-purple-800";
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
      if (!res.ok) throw new Error("Không thể tải thông tin user");
      const data = await res.json();
      setUser(data);
    } catch (e: any) {
      setError(e?.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    load();
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
        const d = await res.json();
        throw new Error(d.message || "Thao tác thất bại");
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
        const d = await res.json();
        throw new Error(d.message || "Thao tác thất bại");
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
        const d = await res.json();
        throw new Error(d.message || "Xóa thất bại");
      }
      router.push("/admin/users");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-48 text-slate-500">Đang tải...</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!user) return <div className="text-slate-500 p-4">Không tìm thấy user.</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">← Quay lại</Link>
        <h1 className="text-xl font-bold text-slate-800">Chi tiết người dùng</h1>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
            {user.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-lg">{user.name || "—"}</div>
            <div className="text-slate-500 text-sm">{user.email}</div>
            <div className="flex gap-2 mt-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColor(user.role)}`}>{user.role}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(user.status)}`}>{user.status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div><span className="text-slate-400">Provider:</span> {user.provider || "GOOGLE"}</div>
          <div><span className="text-slate-400">Tạo lúc:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"}</div>
          <div className="col-span-2"><span className="text-slate-400">Đăng nhập gần nhất:</span> {user.last_login_at ? new Date(user.last_login_at).toLocaleString("vi-VN") : "Chưa từng"}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-700 mb-4">Hành động quản trị</h2>
        <div className="flex flex-wrap gap-3">
          {user.status === "ACTIVE" ? (
            <button
              onClick={() => updateStatus("BLOCKED")}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
            >
              🔒 Khóa tài khoản
            </button>
          ) : user.status === "BLOCKED" ? (
            <button
              onClick={() => updateStatus("ACTIVE")}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 disabled:opacity-50"
            >
              🔓 Mở khóa
            </button>
          ) : null}

          {user.role === "USER" && (
            <button
              onClick={() => updateRole("ADMIN")}
              disabled={actionLoading}
              className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50"
            >
              ⬆️ Nâng lên Admin
            </button>
          )}
          {user.role === "ADMIN" && (
            <button
              onClick={() => updateRole("USER")}
              disabled={actionLoading}
              className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
            >
              ⬇️ Hạ xuống User
            </button>
          )}

          {user.status !== "DELETED" && (
            <button
              onClick={softDelete}
              disabled={actionLoading}
              className="px-4 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
            >
              🗑️ Xóa mềm
            </button>
          )}
        </div>
        {actionLoading && <p className="text-sm text-slate-500 mt-3">Đang xử lý...</p>}
      </div>

      {/* Login Logs */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Lịch sử đăng nhập gần đây</h2>
        {(!user.loginLogs || user.loginLogs.length === 0) ? (
          <p className="text-sm text-slate-500">Chưa có lịch sử đăng nhập.</p>
        ) : (
          <div className="space-y-2">
            {user.loginLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                <div>
                  <span className={`mr-2 font-semibold ${log.success ? "text-green-600" : "text-red-600"}`}>
                    {log.success ? "✅ Thành công" : "❌ Thất bại"}
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
