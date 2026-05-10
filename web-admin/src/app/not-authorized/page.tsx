"use client";

import Link from 'next/link'
import React from 'react'

export default function NotAuthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-[8px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Không đủ quyền truy cập</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Tài khoản hiện tại không có quyền vào trang này. Hãy quay lại đúng cổng đăng nhập theo vai trò.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/login/owner" className="rounded-[8px] bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Vào owner login</Link>
          <Link href="/login/admin" className="rounded-[8px] border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">Vào admin login</Link>
        </div>
      </div>
    </main>
  )
}
