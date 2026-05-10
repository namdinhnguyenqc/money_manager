"use client";

import React, { useEffect, useState } from 'react'

export type Room = {
  id: string
  name?: string
  status?: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
  price?: number
  isPublic?: boolean
}

type Props = {
  open: boolean
  room?: Room | null
  onClose: () => void
  onSave: (payload: Partial<Room>) => void
}

export default function RoomEditModal({ open, room, onClose, onSave }: Props) {
  const [local, setLocal] = useState<Room>({ id: room?.id ?? '', name: room?.name ?? '', status: room?.status ?? 'AVAILABLE', price: room?.price ?? 0, isPublic: room?.isPublic ?? false })

  useEffect(() => {
    if (open) {
      setLocal({ id: room?.id ?? '', name: room?.name ?? '', status: room?.status ?? 'AVAILABLE', price: room?.price ?? 0, isPublic: room?.isPublic ?? false })
    }
  }, [open, room])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-label="Edit Room">
      <div className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950">Cập nhật phòng</h3>
          <button onClick={onClose} className="text-sm font-medium text-slate-500">Đóng</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tên phòng</label>
            <input name="name" className="w-full rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm" value={local.name ?? ''} onChange={(e)=>setLocal((l)=>({...l, name: e.target.value}))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
            <select name="status" className="w-full rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm" value={local.status ?? 'AVAILABLE'} onChange={(e)=>setLocal((l)=>({...l, status: e.target.value as any}))}>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="OCCUPIED">OCCUPIED</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Giá thuê</label>
            <input name="price" type="number" min={0} className="w-full rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm" value={local.price ?? 0} onChange={(e)=>setLocal((l)=>({...l, price: Number(e.target.value)}))} />
          </div>
          <div>
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input name="isPublic" type="checkbox" checked={local.isPublic ?? false} onChange={(e)=>setLocal((l)=>({...l, isPublic: e.target.checked}))} />
              Hiển thị công khai
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="rounded-[8px] bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={()=>onSave(local)}>Lưu thay đổi</button>
          <button className="ml-2 rounded-[8px] bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  )
}
