"use client";

import { useEffect, useState } from 'react'
import RBACGuard from '@/components/RBACGuard'
import { apiGet } from '@/utils/apiClient'
import PageContainer from '@/components/ui/PageContainer'
import PageHeader from '@/components/ui/PageHeader'
import DataTable from '@/components/ui/DataTable'
import LoadingSkeleton from '@/components/ops/LoadingSkeleton'
import EmptyState from '@/components/ops/EmptyState'
import { tableCell, tableRow } from '@/components/ui/design-tokens'

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
      <PageContainer width="wide">
        <PageHeader
          subtitle="Quản lý vận hành"
          title="Nhật ký thao tác"
          description="Theo dõi các hành động booking quan trọng."
        />
        {loading ? <LoadingSkeleton rows={5} /> : null}
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {!loading && items.length === 0 ? <EmptyState message="Chưa có audit log." /> : null}
        {items.length > 0 ? (
          <DataTable headers={["Actor", "Thao tác", "Resource", "Thời gian"]}>
            {items.map((item) => (
              <tr key={item.id} className={tableRow}>
                <td className={`${tableCell} font-medium text-slate-900`}>{item.actor}</td>
                <td className={tableCell}>{item.action}</td>
                <td className={tableCell}>{item.resourceType}:{item.resourceId ?? '-'}</td>
                <td className={`${tableCell} whitespace-nowrap`}>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '-'}</td>
              </tr>
            ))}
          </DataTable>
        ) : null}
      </PageContainer>
    </RBACGuard>
  )
}
