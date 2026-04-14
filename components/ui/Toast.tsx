'use client'

import { useEffect } from 'react'

type ToastVariant = 'success' | 'error' | 'info'

const styles: Record<ToastVariant, string> = {
  success: 'bg-emerald-900/80 border-emerald-500/40 text-emerald-200',
  error:   'bg-red-900/80 border-red-500/40 text-red-200',
  info:    'bg-slate-800 border-slate-600 text-slate-200',
}

export default function Toast({
  message,
  variant = 'info',
  onClose,
  duration = 3000,
}: {
  message: string
  variant?: ToastVariant
  onClose: () => void
  duration?: number
}) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${styles[variant]}`}>
      {message}
    </div>
  )
}
