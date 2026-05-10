"use client";

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

type User = {
  id: string
  email: string
  name: string
  role: 'USER' | 'OWNER' | 'ADMIN' | 'SUPER_ADMIN'
  status: 'ACTIVE' | 'BLOCKED' | 'DELETED'
  provider?: string
  created_at?: string
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const loadUsers = async () => {
    if (!token) {
      window.location.href = '/login/admin'
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/admin/users?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || data?.error || 'Failed to load users')
      }
      const data = await res.json()
      setUsers(data?.data || [])
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được người dùng.')
    } finally {
      setLoading(false)
    }
  }

  const updateRole = async (userId: string, role: string) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || data?.error || 'Failed to update role')
      }
      await loadUsers()
    } catch (err: any) {
      setError(err?.message ?? 'Không đổi được vai trò.')
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl rounded border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Super Admin Users</h1>
            <p className="text-sm text-slate-500">Quản lý vai trò và theo dõi tài khoản hệ thống.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadUsers} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700">
              Tải lại
            </button>
            <Link href="/admin/users" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Mở admin view</Link>
          </div>
        </div>

        {loading && <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Đang tải người dùng...</div>}
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && users.length === 0 && <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Chưa có người dùng.</div>}

        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="border border-slate-200 px-4 py-2">User</th>
                  <th className="border border-slate-200 px-4 py-2">Role</th>
                  <th className="border border-slate-200 px-4 py-2">Status</th>
                  <th className="border border-slate-200 px-4 py-2">Provider</th>
                  <th className="border border-slate-200 px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="border border-slate-200 px-4 py-2">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="border border-slate-200 px-4 py-2">
                      {user.role === 'SUPER_ADMIN' ? (
                        <span className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">{user.role}</span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(event) => updateRole(user.id, event.target.value)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="USER">USER</option>
                          <option value="OWNER">OWNER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                    </td>
                    <td className="border border-slate-200 px-4 py-2">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : user.status === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-4 py-2">{user.provider ?? '-'}</td>
                    <td className="border border-slate-200 px-4 py-2">{user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
