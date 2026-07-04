"use client";

import { useEffect, useState } from 'react'
import RBACGuard from '@/components/RBACGuard'
import { apiGet } from '@/utils/apiClient'

type Notification = {
  id: string
  eventType: string
  title: string
  body: string
  readAt?: string | null
  createdAt?: string
}

export default function OwnerNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        // Mock data to prevent API 404 under demo/vercel environment
        if (typeof window !== "undefined" && (localStorage.getItem("demo_mode") === "true" || window.location.hostname.includes("vercel") || window.location.hostname.includes("localhost"))) {
          setItems([
            { id: "1", eventType: "payment", title: "Hóa đơn 202 được thanh toán", body: "SePay đã tự động gạch nợ thành công.", createdAt: new Date(Date.now() - 10 * 60000).toISOString() },
            { id: "2", eventType: "contract", title: "Hợp đồng 105 sắp hết hạn", body: "Hợp đồng thuê sẽ hết hiệu lực sau 15 ngày.", createdAt: new Date(Date.now() - 120 * 60000).toISOString() },
            { id: "3", eventType: "repair", title: "Yêu cầu sửa chữa mới", body: "Phòng 304 báo hỏng vòi nước nhà vệ sinh.", createdAt: new Date(Date.now() - 1440 * 60000).toISOString() }
          ]);
          setUnreadCount(3);
          setLoading(false);
          return;
        }

        const response = await apiGet<any>('/owner/notifications')
        setItems(response?.data ?? [])
        setUnreadCount(response?.unreadCount ?? 0)
      } catch (err: any) {
        setError(err?.message ?? 'Không tải được thông báo.')
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
          <h1 className="text-2xl font-semibold text-slate-950">Thông báo</h1>
          <p className="text-sm text-slate-500">{unreadCount} thông báo chưa đọc</p>
        </div>
        {loading && <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải thông báo...</div>}
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && items.length === 0 && <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">Chưa có thông báo.</div>}
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{item.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.eventType}</span>
              </div>
              <div className="mt-3 text-xs text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '-'}</div>
            </article>
          ))}
        </div>
      </div>
    </RBACGuard>
  )
}
