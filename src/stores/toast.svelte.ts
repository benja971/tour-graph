type ToastVariant = 'default' | 'success' | 'error'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
  duration: number
}

export const toasts = $state<{ list: Toast[] }>({ list: [] })

let counter = 0

export function showToast(message: string, variant: ToastVariant = 'default', duration = 3000): void {
  const id = ++counter
  toasts.list.push({ id, message, variant, duration })
  setTimeout(() => {
    const idx = toasts.list.findIndex(t => t.id === id)
    if (idx >= 0) toasts.list.splice(idx, 1)
  }, duration)
}

export const toastSuccess = (msg: string, duration?: number) => showToast(msg, 'success', duration)
export const toastError   = (msg: string, duration?: number) => showToast(msg, 'error', duration)
export const toast        = (msg: string, duration?: number) => showToast(msg, 'default', duration)
