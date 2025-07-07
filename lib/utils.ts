import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(title: string): string {
  if (!title || typeof title !== "string") {
    return "untitled-post"
  }

  try {
    return (
      title
        .toLowerCase()
        .trim()
        // Remove special characters except spaces and hyphens
        .replace(/[^a-z0-9\s-]/g, "")
        // Replace multiple spaces with single space
        .replace(/\s+/g, " ")
        // Replace spaces with hyphens
        .replace(/\s/g, "-")
        // Remove multiple consecutive hyphens
        .replace(/-+/g, "-")
        // Remove leading and trailing hyphens
        .replace(/^-+|-+$/g, "") ||
      // Ensure minimum length
      "untitled-post"
    )
  } catch (error) {
    console.error("Error generating slug:", error)
    return "untitled-post"
  }
}

export function validateSlug(slug: string): boolean {
  try {
    // Check if slug is valid
    if (!slug || typeof slug !== "string" || slug.length === 0) return false
    if (slug.length > 100) return false // Reasonable length limit
    if (slug.startsWith("-") || slug.endsWith("-")) return false
    if (slug.includes("--")) return false
    if (!/^[a-z0-9-]+$/.test(slug)) return false
    return true
  } catch (error) {
    console.error("Error validating slug:", error)
    return false
  }
}

export function sanitizeSlug(slug: string): string {
  try {
    if (!slug || typeof slug !== "string") return "untitled-post"

    return (
      slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 100) || "untitled-post" // Limit length
    )
  } catch (error) {
    console.error("Error sanitizing slug:", error)
    return "untitled-post"
  }
}

export function formatDate(date: string | Date): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return "Invalid date"

    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Invalid date"
  }
}

export function formatRelativeTime(date: string | Date): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return "Invalid date"

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

    if (diffInSeconds < 0) return "In the future"
    if (diffInSeconds < 60) return "just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return formatDate(d)
  } catch (error) {
    console.error("Error formatting relative time:", error)
    return "Invalid date"
  }
}

export function truncateText(text: string, maxLength: number): string {
  try {
    if (!text || typeof text !== "string") return ""
    if (maxLength <= 0) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + "..."
  } catch (error) {
    console.error("Error truncating text:", error)
    return ""
  }
}

export function extractExcerpt(content: string, maxLength = 200): string {
  try {
    if (!content || typeof content !== "string") return ""

    // Remove markdown formatting
    const plainText = content
      .replace(/#{1,6}\s+/g, "") // Remove headers
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.*?)\*/g, "$1") // Remove italic
      .replace(/`(.*?)`/g, "$1") // Remove code
      .replace(/\[([^\]]+)\]$$[^)]+$$/g, "$1") // Remove links
      .replace(/\n+/g, " ") // Replace newlines with spaces
      .trim()

    return truncateText(plainText, maxLength)
  } catch (error) {
    console.error("Error extracting excerpt:", error)
    return ""
  }
}

export function readingTime(content: string): number {
  try {
    if (!content || typeof content !== "string") return 0

    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  } catch (error) {
    console.error("Error calculating reading time:", error)
    return 1
  }
}

export function isValidEmail(email: string): boolean {
  try {
    if (!email || typeof email !== "string") return false

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254 // RFC 5321 limit
  } catch (error) {
    console.error("Error validating email:", error)
    return false
  }
}

export function isValidUrl(url: string): boolean {
  try {
    if (!url || typeof url !== "string") return false

    new URL(url)
    return true
  } catch {
    return false
  }
}

export function safeParseJSON(jsonString: string, fallback: any = null): any {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.error("Error parsing JSON:", error)
    return fallback
  }
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
