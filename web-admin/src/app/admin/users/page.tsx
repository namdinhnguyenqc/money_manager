"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Search, ShieldCheck, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
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
  boardingHouseCount?: number;
  roomCount?: number;
};

type PendingAction = {
  id: string;
  action: "status" | "role" | "delete";
  value?: string;
  userName: string;
};

const roleBadgeMap: Record<User["role"], string> = {
  USER: "bg-slate-100 text-slate-700",
  OWNER: "bg-blue-50 text-blue-700",
  ADMIN: "bg-violet-50 text-violet-700",
  SUPER_ADMIN: "bg-amber-50 text-amber-700",
};

const statusBadgeMap: Record<User["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  BLOCKED: "bg-rose-50 text-rose-700",
  DELETED: "bg-slate-100 text-slate-500",
};

const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [query, setQuery] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/users?page=${page}&limit=${limit}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Không thể tải danh sách người dùng.");
      const data = await res.json();
      const rows = data.data || [];
      setUsers(rows);
      setRoleDrafts(
        rows.reduce((acc: Record<string, string>, user: User) => {
          acc[user.id] = user.role;
          return acc;
        }, {})
      );
    } catch (e: any) {
      setError(e?.message ?? "Lỗi tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, limit]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const normalized = query.trim().toLowerCase();
    return users.filter((user) =>
      [user.name, user.email, user.role, user.status].some((value) =>
        String(value || "").toLowerCase().includes(normalized)
      )
    );
  }, [query, users]);

  const openConfirm = (action: PendingAction) => {
    setPendingAction(action);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    const token = getToken();
    if (!token || !pendingAction) {
      setConfirmOpen(false);
      setPendingAction(null);
      return;
    }

    try {
      let res: Response | null = null;
      if (pendingAction.action === "status") {
        res = await fetch(`${API_URL}/admin/users/${pendingAction.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: pendingAction.value }),
        });
      } else if (pendingAction.action === "role") {
        res = await fetch(`${API_URL}/admin/users/${pendingAction.id}/role`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: pendingAction.value }),
        });
      } else if (pendingAction.action === "delete") {
        res = await fetch(`${API_URL}/admin/users/${pendingAction.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (res && !res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || "Không thể cập nhật người dùng.");
      }

      await load();
    } catch (e: any) {
      if (pendingAction?.action === "role") {
        const currentUser = users.find((user) => user.id === pendingAction.id);
        if (currentUser) {
          setRoleDrafts((current) => ({ ...current, [currentUser.id]: currentUser.role }));
        }
      }
      setError(e?.message ?? "Không thể cập nhật người dùng.");
    } finally {
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const ownerUsers = users.filter((user) => user.role === "OWNER").length;
  const blockedUsers = users.filter((user) => user.status === "BLOCKED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">User operations</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Người dùng</h1>
          <p className="mt-2 text-sm text-slate-500">
            Kiểm tra role, khóa tài khoản, xóa mềm và điều hướng sang trang chi tiết từng user.
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, email, role..."
            className="w-full rounded-[8px] border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-[8px] border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Tổng user</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{totalUsers}</div>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Đang hoạt động</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-700">{activeUsers}</div>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Owner</div>
          <div className="mt-2 text-2xl font-semibold text-blue-700">{ownerUsers}</div>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Đang bị khóa</div>
          <div className="mt-2 text-2xl font-semibold text-rose-700">{blockedUsers}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Danh sách người dùng</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredUsers.length} bản ghi hiển thị</p>
          </div>
          <button
            onClick={load}
            className="rounded-[8px] border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Tải lại
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-slate-500">Đang tải người dùng...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">Không có người dùng phù hợp.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Provider</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium text-center">Dãy trọ</th>
                  <th className="px-5 py-3 font-medium text-center">Phòng</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const nextStatus = user.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
                  return (
                    <tr key={user.id} className="border-t border-slate-100 align-top">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                            {user.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{user.name}</div>
                            <div className="truncate text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${roleBadgeMap[user.role]}`}>
                            {user.role}
                          </span>
                          <select
                            disabled={user.role === "SUPER_ADMIN"}
                            value={roleDrafts[user.id] ?? user.role}
                            onChange={(event) => {
                              const nextRole = event.target.value;
                              setRoleDrafts((current) => ({ ...current, [user.id]: nextRole }));
                              openConfirm({
                                id: user.id,
                                action: "role",
                                value: nextRole,
                                userName: user.name,
                              });
                            }}
                            className="block w-full rounded-[8px] border border-slate-300 px-3 py-2 text-xs outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="USER">USER</option>
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            {user.role === "SUPER_ADMIN" && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeMap[user.status]}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{user.provider || "-"}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "-"}
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-blue-600">
                        {user.boardingHouseCount ?? 0}
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-emerald-600">
                        {user.roomCount ?? 0}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="inline-flex items-center gap-1 rounded-[8px] border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                          >
                            <ShieldCheck size={14} />
                            Chi tiết
                          </Link>
                          <button
                            type="button"
                            disabled={user.status === "DELETED"}
                            onClick={() =>
                              openConfirm({
                                id: user.id,
                                action: "status",
                                value: nextStatus,
                                userName: user.name,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-[8px] border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Lock size={14} />
                            {user.status === "BLOCKED" ? "Mở khóa" : "Khóa"}
                          </button>
                          <button
                            type="button"
                            disabled={user.status === "DELETED"}
                            onClick={() =>
                              openConfirm({
                                id: user.id,
                                action: "delete",
                                userName: user.name,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-[8px] border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            Xóa mềm
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-center gap-2">
        <button
          className="rounded-[8px] border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1}
        >
          Trước
        </button>
        <span className="text-sm text-slate-500">Trang {page}</span>
        <button
          className="rounded-[8px] border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          onClick={() => setPage((current) => current + 1)}
        >
          Sau
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận cập nhật người dùng"
        message={
          pendingAction?.action === "status"
            ? `Đổi trạng thái của ${pendingAction.userName} sang ${pendingAction.value}?`
            : pendingAction?.action === "role"
              ? `Đổi vai trò của ${pendingAction.userName} sang ${pendingAction.value}?`
              : `Xóa mềm tài khoản ${pendingAction?.userName}?`
        }
        onConfirm={handleConfirm}
        onCancel={() => {
          if (pendingAction?.action === "role") {
            const currentUser = users.find((user) => user.id === pendingAction.id);
            if (currentUser) {
              setRoleDrafts((current) => ({ ...current, [currentUser.id]: currentUser.role }));
            }
          }
          setConfirmOpen(false);
          setPendingAction(null);
        }}
      />
    </div>
  );
}
