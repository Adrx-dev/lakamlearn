import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/providers/auth-provider"
import { ToastProvider } from "@/components/providers/toast-provider"
import { ErrorBoundary } from "@/components/ui/error-boundary"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Lakambini Learn - Modern Education Blog Platform",
  description:
    "A platform for publishing and managing educational articles for Grade XI students. Join our Filipino-inspired learning community.",
  keywords: "education, blog, Grade XI, Lakambini, learning, Filipino, students, 2025-2026",
  authors: [{ name: "Lakambini Learn Team" }],
  creator: "Grade XI Lakambini",
  publisher: "Lakambini Learn",

  // Open Graph metadata for social sharing
  openGraph: {
    title: "Lakambini Learn - Grade XI Education Platform",
    description:
      "A modern education blog platform celebrating Filipino culture and academic excellence for Grade XI students.",
    url: "https://lakambini-learn.vercel.app",
    siteName: "Lakambini Learn",
    images: [
      {
        url: "/images/lakambini-logo.png",
        width: 512,
        height: 512,
        alt: "Lakambini Learn Logo - Grade XI 2025-2026",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "Lakambini Learn - Grade XI Education Platform",
    description: "A modern education blog platform celebrating Filipino culture and academic excellence.",
    images: ["/images/lakambini-logo.png"],
    creator: "@lakambinilearn",
  },

  // Icons and favicons
  icons: {
    icon: [
      { url: "/images/lakambini-logo.png", sizes: "32x32", type: "image/png" },
      { url: "/images/lakambini-logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/images/lakambini-logo.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/images/lakambini-logo.png",
  },

  // Additional metadata
  manifest: "/manifest.json",
  themeColor: "#d946ef",
  colorScheme: "light dark",
  viewport: "width=device-width, initial-scale=1",

  // Verification and other meta tags
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Lakambini Learn",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#d946ef",
    "msapplication-TileImage": "/images/lakambini-logo.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/lakambini-logo.png" />
        <link rel="apple-touch-icon" href="/images/lakambini-logo.png" />
        <meta name="theme-color" content="#d946ef" />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              {children}
              <Toaster />
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
