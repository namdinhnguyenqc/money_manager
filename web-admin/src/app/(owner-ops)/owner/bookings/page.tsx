"use client";

import { useEffect, useState } from 'react'
import RBACGuard from '@/components/RBACGuard'
import { apiGet, apiPost } from '@/utils/apiClient'

type Booking = {
  id: string
  boardingHouseId: string
  roomId: string
  roomName?: string
  guestName?: string
  guestPhone?: string
  message?: string
  desiredMoveIn?: string
  status: string
  expiresAt?: string
  createdAt?: string
}

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiGet<any>('/owner/bookings')
      setBookings(response?.data ?? response ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được booking.')
    } finally {
      setLoading(false)
    }
  }

  const updateBooking = async (bookingId: string, action: 'confirm' | 'reject') => {
    setBusyId(bookingId)
    setError(null)
    try {
      await apiPost(`/owner/bookings/${bookingId}/${action}`, {})
      await loadBookings()
    } catch (err: any) {
      setError(err?.message ?? 'Không cập nhật được booking.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Yêu cầu giữ chỗ</h1>
            <p className="text-sm text-slate-500">Duyệt hoặc từ chối booking từ public portal.</p>
          </div>
          <button onClick={loadBookings} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700">
            Tải lại
          </button>
        </div>

        {loading && <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải booking...</div>}
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && bookings.length === 0 && <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">Chưa có yêu cầu giữ chỗ.</div>}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {bookings.map((booking) => (
            <article key={booking.id} className="rounded border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{booking.roomName ?? booking.roomId}</h2>
                  <p className="text-sm text-slate-500">BH: {booking.boardingHouseId}</p>
                </div>
                <span className={`rounded px-2 py-1 text-xs font-semibold ${booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : booking.status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  {booking.status}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <div><span className="text-slate-500">Khách:</span> {booking.guestName ?? '-'}</div>
                <div><span className="text-slate-500">SĐT:</span> {booking.guestPhone ?? '-'}</div>
                <div><span className="text-slate-500">Ngày vào:</span> {booking.desiredMoveIn ?? '-'}</div>
                <div><span className="text-slate-500">Hết hạn:</span> {booking.expiresAt ? new Date(booking.expiresAt).toLocaleString('vi-VN') : '-'}</div>
              </div>
              {booking.message && <p className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-600">{booking.message}</p>}
              {["PENDING", "HOLD"].includes(booking.status) && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateBooking(booking.id, 'confirm')}
                    disabled={busyId === booking.id}
                    className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Xác nhận
                  </button>
                  <button
                    onClick={() => updateBooking(booking.id, 'reject')}
                    disabled={busyId === booking.id}
                    className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </RBACGuard>
  )
}
