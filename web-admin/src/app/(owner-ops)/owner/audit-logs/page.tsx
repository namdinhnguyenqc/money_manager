"use client";

import { useEffect, useState } from 'react'
import RBACGuard from '@/components/RBACGuard'
import { apiGet } from '@/utils/apiClient'

type AuditLog = {
  id: string
  actor: string
  action: string
  resourceType: string
  resourceId?: string
  createdAt?: string
}

export default function OwnerAuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiGet<any>('/owner/audit-logs')
        setItems(response?.data ?? [])
      } catch (err: any) {
        setError(err?.message ?? 'Không tải được audit log.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-950">Nhật ký thao tác</h1>
          <p className="text-sm text-slate-500">Theo dõi các hành động booking quan trọng.</p>
        </div>
        {loading && <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải audit log...</div>}
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && items.length === 0 && <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">Chưa có audit log.</div>}
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="border-b border-slate-200 px-4 py-2">Actor</th>
                <th className="border-b border-slate-200 px-4 py-2">Thao tác</th>
                <th className="border-b border-slate-200 px-4 py-2">Resource</th>
                <th className="border-b border-slate-200 px-4 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border-b border-slate-100 px-4 py-2">{item.actor}</td>
                  <td className="border-b border-slate-100 px-4 py-2">{item.action}</td>
                  <td className="border-b border-slate-100 px-4 py-2">{item.resourceType}:{item.resourceId ?? '-'}</td>
                  <td className="border-b border-slate-100 px-4 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RBACGuard>
  )
}
