"use client";
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initializeGoogleSignIn()
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const initializeGoogleSignIn = () => {
    if ((window as any).google?.accounts?.id) {
      const clientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '')
      ;(window as any).google.accounts.id.initialize({ client_id: clientId, callback: handleCredentialResponse })
      const btn = document.getElementById('google-signin-button')
      if (btn) {
        ;(window as any).google.accounts.id.renderButton(btn, { type: 'standard', shape: 'rectangular', theme: 'outline', size: 'large' })
      }
    }
  }

  const handleCredentialResponse = async (response: any) => {
    const idToken = response?.credential
    if (!idToken) { setError('Không nhận được token từ Google'); return }
    try {
      setLoading(true)
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.message || 'Đăng nhập thất bại')
      }
      const data = await res.json()
      if (data?.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
      }
      router.push('/admin/users')
    } catch (e: any) {
      setError(e?.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }} className="flex items-center justify-center bg-slate-50">
      <div className="p-6 bg-white rounded-xl shadow-md w-full max-w-md text-center">
        <h1 className="text-xl font-bold mb-4">Admin Sign In</h1>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div id="google-signin-button" />
        {loading && <div className="mt-2 text-sm">Đang đăng nhập...</div>}
      </div>
    </div>
  )
}
