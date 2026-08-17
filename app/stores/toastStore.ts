import { proxy, useSnapshot } from 'valtio'

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastState {
  toasts: Toast[]
}

const DEFAULT_TOAST_DURATION = 5000

export const toastStore = proxy<ToastState>({ toasts: [] })

/** Pending auto-dismiss timer ids, keyed by toast id. Kept out of the proxy. */
const timers = new Map<string, number>()

let lastId = 0

const dismiss = (id: string) => {
  clearTimeout(timers.get(id))
  timers.delete(id)

  const index = toastStore.toasts.findIndex((t) => t.id === id)
  if (index !== -1) {
    toastStore.toasts.splice(index, 1)
  }
}

const scheduleDismiss = (id: string, duration: number) => {
  clearTimeout(timers.get(id))

  if (duration > 0 && typeof window !== 'undefined') {
    timers.set(
      id,
      window.setTimeout(() => dismiss(id), duration)
    )
  }
}

const show = (type: ToastType, message: string, duration = DEFAULT_TOAST_DURATION): string => {
  // Repeated failures (e.g. every magnet link hitting the same model 404) refresh
  // the existing toast instead of stacking identical copies.
  const existing = toastStore.toasts.find((t) => t.type === type && t.message === message)
  if (existing) {
    scheduleDismiss(existing.id, duration)
    return existing.id
  }

  const id = `toast-${++lastId}`
  toastStore.toasts.push({ id, type, message, duration })
  scheduleDismiss(id, duration)

  return id
}

export const toast = {
  error: (message: string, duration?: number) => show('error', message, duration),
  success: (message: string, duration?: number) => show('success', message, duration),
  info: (message: string, duration?: number) => show('info', message, duration),
  dismiss,
}

export const useToasts = () => useSnapshot(toastStore).toasts
