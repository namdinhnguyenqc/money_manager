"use client";

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

type Stats = {
  total: number
  active: number
  blocked: number
  newThisMonth: number
  loginsThisMonth?: number
}

type User = {
  role: 'USER' | 'OWNER' | 'ADMIN' | 'SUPER_ADMIN'
  status: 'ACTIVE' | 'BLOCKED' | 'DELETED'
}

export default function SuperAdminReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const loadData = async () => {
    if (!token) {
      window.location.href = '/login/admin'
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/users?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (!statsRes.ok) {
        const data = await statsRes.json().catch(() => ({}))
        throw new Error(data?.message || data?.error || 'Failed to load stats')
      }
      if (!usersRes.ok) {
        const data = await usersRes.json().catch(() => ({}))
        throw new Error(data?.message || data?.error || 'Failed to load users')
      }

      const statsData = await statsRes.json()
      const usersData = await usersRes.json()
      setStats(statsData)
      setUsers(usersData?.data || [])
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được báo cáo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const owners = users.filter((user) => user.role === 'OWNER').length
  const admins = users.filter((user) => ['ADMIN', 'SUPER_ADMIN'].includes(user.role)).length
  const deleted = users.filter((user) => user.status === 'DELETED').length

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-950">Super Admin Reports</h1>
              <p className="text-sm text-slate-500">Ảnh chụp nhanh về người dùng và hoạt động gần đây.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700">
                Tải lại
              </button>
              <Link href="/admin" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Mở admin dashboard</Link>
            </div>
          </div>

          {loading && <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Đang tải báo cáo...</div>}
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {stats && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Tổng user</div>
                <div className="mt-2 text-2xl font-bold text-slate-950">{stats.total}</div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Active</div>
                <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.active}</div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Blocked</div>
                <div className="mt-2 text-2xl font-bold text-red-700">{stats.blocked}</div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Mới tháng này</div>
                <div className="mt-2 text-2xl font-bold text-blue-700">{stats.newThisMonth}</div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Logins tháng này</div>
                <div className="mt-2 text-2xl font-bold text-violet-700">{stats.loginsThisMonth ?? 0}</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Owner accounts</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{owners}</div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Admin accounts</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{admins}</div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Deleted accounts</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{deleted}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
