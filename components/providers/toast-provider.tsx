"use client"

import type React from "react"

import { CenteredToast } from "@/components/ui/centered-toast"
import { useCenteredToast } from "@/hooks/use-centered-toast"
import { createContext, useContext } from "react"

interface ToastContextType {
  toast: (options: {
    title: string
    description?: string
    variant?: "default" | "success" | "error" | "warning" | "info"
    duration?: number
  }) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toast, toasts, dismissToast } = useCenteredToast()

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.map((toastItem) => (
        <CenteredToast
          key={toastItem.id}
          open={toastItem.open}
          onOpenChange={(open) => !open && dismissToast(toastItem.id)}
          title={toastItem.title}
          description={toastItem.description}
          variant={toastItem.variant}
          duration={toastItem.duration}
        />
      ))}
    </ToastContext.Provider>
  )
}

export function useCenteredToastContext() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useCenteredToastContext must be used within a ToastProvider")
  }
  return context
}
