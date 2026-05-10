"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react'
import RBACGuard from '@/components/RBACGuard'
import { apiGet, apiPost } from '@/utils/apiClient'

type Conversation = {
  id: string
  boardingHouseId: string
  roomId: string
  guestName?: string
  guestPhone?: string
  topic?: string
  status: string
  lastMessage?: string
  updatedAt?: string
}

type Message = {
  id: string
  conversationId: string
  senderRole: 'GUEST' | 'OWNER' | string
  senderName?: string
  body: string
  createdAt?: string
}

export default function OwnerMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId])

  const selected = useMemo(() => conversations.find((item) => item.id === selectedId), [conversations, selectedId])

  const loadConversations = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiGet<any>('/owner/conversations')
      const rows = response?.data ?? response ?? []
      setConversations(rows)
      setSelectedId((current) => current || rows[0]?.id || '')
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được hội thoại.')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    setMessagesLoading(true)
    setError(null)
    try {
      const response = await apiGet<any>(`/owner/conversations/${conversationId}/messages`)
      setMessages(response?.data ?? response ?? [])
    } catch (err: any) {
      setError(err?.message ?? 'Không tải được tin nhắn.')
    } finally {
      setMessagesLoading(false)
    }
  }

  const sendReply = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || !reply.trim()) return
    setSending(true)
    setError(null)
    try {
      await apiPost(`/owner/conversations/${selectedId}/messages`, { body: reply.trim() })
      setReply('')
      await Promise.all([loadMessages(selectedId), loadConversations()])
    } catch (err: any) {
      setError(err?.message ?? 'Không gửi được tin nhắn.')
    } finally {
      setSending(false)
    }
  }

  return (
    <RBACGuard allowedRoles={["OWNER", "SUPER_ADMIN"]}>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Tin nhắn</h1>
            <p className="text-sm text-slate-500">Phản hồi lead và yêu cầu giữ chỗ từ public portal.</p>
          </div>
          <button onClick={loadConversations} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700">
            Tải lại
          </button>
        </div>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid min-h-[620px] grid-cols-1 overflow-hidden rounded border border-slate-200 bg-white lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Hội thoại</div>
            {loading && <div className="p-4 text-sm text-slate-500">Đang tải...</div>}
            {!loading && conversations.length === 0 && <div className="p-4 text-sm text-slate-500">Chưa có hội thoại.</div>}
            <div className="max-h-[560px] overflow-y-auto">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedId(conversation.id)}
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${selectedId === conversation.id ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-slate-950">{conversation.guestName ?? 'Khách thuê'}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{conversation.status}</span>
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{conversation.topic ?? conversation.roomId}</div>
                  <div className="mt-1 truncate text-xs text-slate-400">{conversation.lastMessage ?? 'Chưa có tin nhắn'}</div>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[620px] flex-col">
            {selected ? (
              <>
                <header className="border-b border-slate-200 px-4 py-3">
                  <h2 className="font-semibold text-slate-950">{selected.topic ?? 'Hội thoại'}</h2>
                  <p className="text-sm text-slate-500">{selected.guestName ?? 'Khách thuê'} · {selected.guestPhone ?? 'Chưa có SĐT'}</p>
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                  {messagesLoading && <div className="text-sm text-slate-500">Đang tải tin nhắn...</div>}
                  {!messagesLoading && messages.map((message) => {
                    const isOwner = message.senderRole === 'OWNER'
                    return (
                      <div key={message.id} className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded px-3 py-2 text-sm ${isOwner ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}>
                          <div>{message.body}</div>
                          <div className={`mt-1 text-[11px] ${isOwner ? 'text-blue-100' : 'text-slate-400'}`}>
                            {message.senderName ?? (isOwner ? 'Owner' : 'Guest')} · {message.createdAt ? new Date(message.createdAt).toLocaleString('vi-VN') : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <form onSubmit={sendReply} className="border-t border-slate-200 p-3">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Trả lời</label>
                  <div className="flex gap-2">
                    <input
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Nhập phản hồi cho khách..."
                      className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button disabled={sending || !reply.trim()} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                      Gửi
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">Chọn một hội thoại để xem tin nhắn.</div>
            )}
          </section>
        </div>
      </div>
    </RBACGuard>
  )
}
