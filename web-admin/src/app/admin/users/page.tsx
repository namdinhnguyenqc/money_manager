"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';

type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'USER'|'ADMIN'|'SUPER_ADMIN';
  status: 'ACTIVE'|'BLOCKED'|'DELETED';
  provider?: string;
  created_at?: string;
};

type PendingAction = {
  id: string
  action: 'status' | 'role' | 'delete'
  value?: string
  userName?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const openConfirm = (pa: PendingAction) => {
    setPendingAction(pa);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!token || !pendingAction) { setConfirmOpen(false); setPendingAction(null); return; }
    try {
      if (pendingAction.action === 'status') {
        await fetch(`/admin/users/${pendingAction.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: pendingAction.value })
        });
      } else if (pendingAction.action === 'role') {
        await fetch(`/admin/users/${pendingAction.id}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role: pendingAction.value })
        });
      } else if (pendingAction.action === 'delete') {
        await fetch(`/admin/users/${pendingAction.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      // Refresh list after action
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Action failed');
    } finally {
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/admin/users?page=${page}&limit=${limit}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.data || []);
    } catch (e: any) {
      setError(e?.message ?? 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, limit]);

  const tokenLocal = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const updateStatus = async (id: string, status: string) => {
    // Deprecated direct confirm usage replaced by modal
    if (!tokenLocal) return;
    openConfirm({ id, action: 'status', value: status, userName: '' });
  };
  const updateRole = async (id: string, role: string) => {
    if (!tokenLocal) return;
    openConfirm({ id, action: 'role', value: role, userName: '' });
  };
  const softDeleteUser = async (id: string) => {
    if (!tokenLocal) return;
    openConfirm({ id, action: 'delete', userName: '' });
  };

  // Admin actions (block/unblock, change role, delete) wired via ConfirmDialog in Phase 4.2+
  return (
    <div className="p-6"> 
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Người dùng</h1>
        <Link href="/admin">Quay về Admin</Link>
      </div>
        {loading && <div className="text-sm text-slate-600">Đang tải...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && users.length === 0 && (
        <div className="text-sm text-slate-600">Chưa có người dùng.</div>
      )}
      {users.length > 0 && (
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="border px-4 py-2 text-left text-sm">User</th>
              <th className="border px-4 py-2 text-left text-sm">Role</th>
              <th className="border px-4 py-2 text-left text-sm">Status</th>
              <th className="border px-4 py-2 text-left text-sm">Created</th>
              <th className="border px-4 py-2 text-left text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t">
                <td className="px-4 py-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200" />
                  <div>
                    <div className="text-sm font-semibold">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                </td>
                <td className="px-4 py-2 text-sm">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{u.role}</span>
                  <div className="mt-1">
                    <select onChange={(e)=>updateRole(u.id, e.target.value)} defaultValue={u.role} className="border rounded p-1 text-sm">
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </td>
                <td className="px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.status==='ACTIVE' ? 'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '-'}</td>
                <td className="px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 cursor-pointer" onClick={() => alert('View action not implemented in patch')}>
                      View
                    </span>
                    <button onClick={() => updateStatus(u.id, u.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED')} className="px-2 py-1 border rounded text-xs">{u.status === 'BLOCKED' ? 'Mở' : 'Khóa'}</button>
                    <select
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      defaultValue={u.role}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button onClick={() => softDeleteUser(u.id)} className="px-2 py-1 border rounded text-xs ml-1">Xóa</button>
                  </div>
                </td>
              </tr>
              ))}
          </tbody>
        </table>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button className="px-3 py-1 border rounded" onClick={() => setPage(p => Math.max(1, p-1))}>Trước</button>
        <span className="text-sm">Page {page}</span>
        <button className="px-3 py-1 border rounded" onClick={() => setPage(p => p+1)}>Sau</button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận hành động"
        message={pendingAction?.action === 'status'
          ? `Bạn có chắc muốn đổi trạng thái của người dùng sang ${pendingAction?.value}?`
          : pendingAction?.action === 'role'
            ? `Bạn có chắc muốn đổi vai trò thành ${pendingAction?.value}?`
            : `Bạn có chắc muốn xóa người dùng này?`}
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmOpen(false); setPendingAction(null); }}
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
      />
    </div>
  );
}
