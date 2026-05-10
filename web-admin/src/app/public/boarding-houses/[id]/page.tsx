"use client";

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import LeadForm from '@/components/LeadForm'
import { apiGet, apiPost } from '@/utils/apiClient'

type BoardingHouse = {
  id: string
  name?: string
  address?: string
  description?: string
  latitude?: number
  longitude?: number
}

type Room = {
  id: string
  name?: string
  number?: string
  price?: number
  status?: string
}

type DetailResponse = {
  data?: BoardingHouse
}

type RoomsResponse = {
  data?: Room[]
}

export default function PublicBoardingHouseDetailPage({ params }: { params: { id: string } }) {
  const boardingHouseId = params.id
  const [house, setHouse] = useState<BoardingHouse | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leadSent, setLeadSent] = useState(false)
  const [bookingSent, setBookingSent] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [houseResponse, roomsResponse] = await Promise.all([
          apiGet<DetailResponse | BoardingHouse>(`/public/boarding-houses/${boardingHouseId}`),
          apiGet<RoomsResponse | Room[]>(`/public/rooms?bhId=${boardingHouseId}`),
        ])
        const parsedHouse = (houseResponse as DetailResponse).data ?? (houseResponse as BoardingHouse)
        const parsedRooms = Array.isArray(roomsResponse) ? roomsResponse : roomsResponse.data ?? []
        setHouse(parsedHouse)
        setRooms(parsedRooms)
        setSelectedRoomId(parsedRooms[0]?.id ?? '')
      } catch (err: any) {
        setError(err?.message ?? 'Không tải được chi tiết dãy trọ.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [boardingHouseId])

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId), [rooms, selectedRoomId])

  const submitLead = async (payload: any) => {
    await apiPost('/public/leads', {
      ...payload,
      boardingHouseId,
      roomId: selectedRoomId || undefined,
    })
    setLeadSent(true)
  }

  const submitBooking = async (payload: any) => {
    if (!selectedRoomId) throw new Error('Vui lòng chọn phòng trước khi giữ chỗ.')
    await apiPost('/public/bookings', {
      ...payload,
      boardingHouseId,
      roomId: selectedRoomId,
    })
    setBookingSent(true)
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-6 text-sm text-slate-600">Đang tải chi tiết dãy trọ...</main>
  }

  if (error || !house) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? 'Không tìm thấy dãy trọ.'}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-5">
          <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
            <Link href="/public/boarding-houses" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
              Quay lại danh sách
            </Link>
            <h1 className="mt-3 text-2xl font-bold text-slate-950">{house.name ?? 'Dãy trọ'}</h1>
            <p className="mt-2 text-sm text-slate-600">{house.address ?? 'Chưa có địa chỉ'}</p>
            {house.description && <p className="mt-3 text-sm leading-6 text-slate-700">{house.description}</p>}
          </div>

          <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Phòng đang hiển thị</h2>
              <span className="text-sm text-slate-500">{rooms.length} phòng</span>
            </div>
            {rooms.length === 0 ? (
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Chưa có phòng công khai.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {rooms.map((room) => (
          <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`rounded-[8px] border p-3 text-left transition ${selectedRoomId === room.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                  >
                    <div className="font-semibold text-slate-950">{room.name ?? room.number ?? room.id}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {typeof room.price === 'number' ? `${room.price.toLocaleString('vi-VN')} đ/tháng` : 'Chưa có giá'}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-emerald-700">{room.status ?? 'AVAILABLE'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:self-start">
          <h2 className="text-lg font-semibold text-slate-950">Liên hệ chủ trọ</h2>
          {selectedRoom && (
            <div className="mt-2 rounded-[8px] bg-slate-50 p-3 text-sm text-slate-600">
              Đang hỏi về: <span className="font-semibold text-slate-900">{selectedRoom.name ?? selectedRoom.number ?? selectedRoom.id}</span>
            </div>
          )}
          {leadSent && <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Đã gửi thông tin. Chủ trọ sẽ liên hệ lại.</div>}
          <div className="mt-3">
            <LeadForm onSubmit={submitLead} title="Gửi liên hệ" submitLabel="Gửi liên hệ" />
          </div>
          <div className="my-4 border-t border-slate-200" />
          {bookingSent && <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">Đã gửi yêu cầu giữ chỗ. Chủ trọ sẽ duyệt trong dashboard.</div>}
          <LeadForm onSubmit={submitBooking} title="Yêu cầu giữ chỗ" submitLabel="Gửi yêu cầu giữ chỗ" />
        </aside>
      </div>
    </main>
  )
}
