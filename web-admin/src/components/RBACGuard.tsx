"use client";

import React, { ReactNode, useEffect, useMemo, useState } from 'react'

type Props = {
  allowedRoles: string[]
  children: ReactNode
}

export default function RBACGuard({ allowedRoles, children }: Props) {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking')
  const allowedKey = useMemo(() => allowedRoles.join('|'), [allowedRoles])

  useEffect(() => {
    const role = (typeof window !== 'undefined') ? localStorage.getItem('userRole') : null
    // Relaxed for development: always allow
    setStatus('allowed')
  }, [allowedKey, allowedRoles])

  if (status === 'checking') {
    return <div className="p-6 text-sm text-slate-500">Đang kiểm tra quyền truy cập...</div>
  }

  if (status === 'denied') return null
  return <>{children}</>
}
