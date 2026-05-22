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
      window.location.href = '/login'
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
        throw new Error(data?.message || data?.error || 'KhÃ´ng thá»ƒ táº£i thá»‘ng kÃª.')
      }
      if (!usersRes.ok) {
        const data = await usersRes.json().catch(() => ({}))
        throw new Error(data?.message || data?.error || 'KhÃ´ng thá»ƒ táº£i ngÆ°á»i dÃ¹ng.')
      }

      const statsData = await statsRes.json()
      const usersData = await usersRes.json()
      setStats(statsData)
      setUsers(usersData?.data || [])
    } catch (err: any) {
      setError(err?.message ?? 'KhÃ´ng táº£i Ä‘Æ°á»£c bÃ¡o cÃ¡o.')
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
              <h1 className="text-xl font-semibold text-slate-950">BÃ¡o cÃ¡o Super Admin</h1>
              <p className="text-sm text-slate-500">áº¢nh chá»¥p nhanh vá» ngÆ°á»i dÃ¹ng vÃ  hoáº¡t Ä‘á»™ng gáº§n Ä‘Ã¢y.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700">
                Táº£i láº¡i
              </button>
              <Link href="/admin" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Má»Ÿ dashboard Admin</Link>
            </div>
          </div>

          {loading && <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Äang táº£i bÃ¡o cÃ¡o...</div>}
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {stats && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Tá»•ng ngÆ°á»i dÃ¹ng</div>
                <div className="mt-2 text-2xl font-bold text-slate-950">{stats.total}</div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Äang hoáº¡t Ä‘á»™ng</div>
                <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.active}</div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Bá»‹ khÃ³a</div>
                <div className="mt-2 text-2xl font-bold text-red-700">{stats.blocked}</div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Má»›i thÃ¡ng nÃ y</div>
                <div className="mt-2 text-2xl font-bold text-blue-700">{stats.newThisMonth}</div>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">ÄÄƒng nháº­p thÃ¡ng nÃ y</div>
                <div className="mt-2 text-2xl font-bold text-violet-700">{stats.loginsThisMonth ?? 0}</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">TÃ i khoáº£n chá»§ trá»</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{owners}</div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">TÃ i khoáº£n Admin</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{admins}</div>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">TÃ i khoáº£n Ä‘Ã£ xÃ³a</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{deleted}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
