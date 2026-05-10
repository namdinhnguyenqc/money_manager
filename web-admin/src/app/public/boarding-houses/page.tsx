"use client";

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/utils/apiClient'

type BoardingHouse = {
  id: string
  name?: string
  address?: string
  description?: string
  isPublic?: boolean
  createdAt?: string
}

type ListResponse = {
  data?: BoardingHouse[]
}

export default function PublicBoardingHousesPage() {
  const [items, setItems] = useState<BoardingHouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiGet<ListResponse | BoardingHouse[]>('/public/boarding-houses')
        const list = Array.isArray(response) ? response : response.data ?? []
        setItems(list)
      } catch (err: any) {
        setError(err?.message ?? 'Không tải được danh sách phòng trọ.')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((item) => {
      const text = `${item.name ?? ''} ${item.address ?? ''} ${item.description ?? ''}`.toLowerCase()
      return text.includes(normalized)
    })
  }, [items, query])

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Tìm phòng trọ</p>
              <h1 className="text-2xl font-bold text-slate-950">Danh sách dãy trọ công khai</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">Dùng bộ lọc nhanh để xem dãy trọ đang public, rồi đi tiếp sang chi tiết phòng, gửi lead hoặc yêu cầu giữ chỗ.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/login/owner" className="rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Đăng nhập chủ trọ
              </Link>
              <Link href="/login/admin" className="rounded-[8px] border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400">
                Admin
              </Link>
            </div>
          </div>
        </header>

        <div className="rounded-[8px] border border-slate-200 bg-white p-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Tìm theo tên, địa chỉ hoặc mô tả</label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ví dụ: Quận 10, gần trường, phòng yên tĩnh..."
            className="w-full rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {loading && <div className="rounded-[8px] border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải danh sách...</div>}
        {error && <div className="rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-[8px] border border-slate-200 bg-white p-6 text-sm text-slate-600">Chưa có dãy trọ công khai phù hợp với từ khóa đang tìm.</div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="flex min-h-56 flex-col justify-between rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Đang mở</span>
                  <span className="truncate text-xs text-slate-400">{item.id}</span>
                </div>
                <h2 className="line-clamp-2 text-lg font-semibold text-slate-950">{item.name ?? 'Dãy trọ'}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.address ?? 'Chưa có địa chỉ'}</p>
                {item.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{item.description}</p>}
              </div>
              <Link href={`/public/boarding-houses/${item.id}`} className="mt-5 rounded-[8px] bg-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700">
                Xem chi tiết và phòng
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
