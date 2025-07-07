"use client"

import { useState, useCallback } from "react"

interface ToastOptions {
  title: string
  description?: string
  variant?: "default" | "success" | "error" | "warning" | "info"
  duration?: number
}

export function useCenteredToast() {
  const [toasts, setToasts] = useState<Array<ToastOptions & { id: string; open: boolean }>>([])

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...options, id, open: true }

    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, options.duration || 3000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)))
    // Remove from array after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 200)
  }, [])

  return {
    toast,
    toasts,
    dismissToast,
  }
}
