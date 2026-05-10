"use client";
import React, { useState } from 'react'

type Props = {
  onSubmit: (payload: any) => void | Promise<void>
  title?: string
  submitLabel?: string
}

export default function LeadForm({ onSubmit, title = 'Submit Lead', submitLabel = 'Send Lead' }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Vui lòng nhập tên của bạn.')
      return
    }
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại.')
      return
    }
    const payload = { guestName: name, guestPhone: phone, message }
    setSubmitting(true)
    try {
      await onSubmit(payload)
      setName('')
      setPhone('')
      setMessage('')
    } catch (err: any) {
      setError(err?.message ?? 'Không gửi được thông tin liên hệ.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[8px] border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-slate-900">{title}</div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input className="rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500" placeholder="Họ tên" value={name} onChange={e=>setName(e.target.value)} />
        <input className="rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500" placeholder="Số điện thoại" value={phone} onChange={e=>setPhone(e.target.value)} />
      </div>
      <textarea className="mt-2 w-full rounded-[8px] border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500" placeholder="Nội dung quan tâm" value={message} onChange={e=>setMessage(e.target.value)} rows={4} />
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      <button className="mt-3 inline-flex rounded-[8px] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={submitting}>
        {submitting ? 'Đang gửi...' : submitLabel}
      </button>
    </form>
  )
}
