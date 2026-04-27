import React, { useEffect } from 'react'

type ToastProps = {
  message: string
  type?: 'success' | 'error'
  duration?: number
  onHide?: () => void
}

export default function Toast({ message, type = 'success', duration = 3000, onHide }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => {
      onHide?.()
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onHide])

  const color = type === 'success' ? 'bg-green-600' : 'bg-red-600'
  return (
    <div className={`fixed bottom-4 right-4 ${color} text-white px-4 py-2 rounded shadow z-50`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
