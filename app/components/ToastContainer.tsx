'use client'

import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Toast, toast, ToastType, useToasts } from '../stores/toastStore'

const STYLES_BY_TYPE: Record<ToastType, string> = {
  error: 'bg-red-950/95 border-red-800 text-red-200',
  success: 'bg-green-950/95 border-green-800 text-green-200',
  info: 'bg-gray-900/95 border-gray-700 text-gray-200',
}

const ICONS_BY_TYPE: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
}

export const ToastContainer = () => {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
    </div>
  )
}

const ToastItem = ({ item }: { item: Toast }) => {
  const [isVisible, setIsVisible] = useState(false)
  const Icon = ICONS_BY_TYPE[item.type]

  // Mount at 0 opacity, then flip on the next frame so the transition runs.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border p-3 text-sm shadow-xl backdrop-blur-sm transition-all duration-200 ease-out ${
        STYLES_BY_TYPE[item.type]
      } ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <Icon className="mt-px h-4 w-4 shrink-0" />
      <span className="flex-1 break-words">{item.message}</span>
      <button
        type="button"
        onClick={() => toast.dismiss(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-current"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
