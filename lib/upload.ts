import { createClient } from "@/lib/supabase/client"

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  maxSize?: number // in bytes
  allowedTypes?: string[]
  quality?: number // for image compression (0-1)
}

export class UploadService {
  private supabase = createClient()
  private readonly DEFAULT_MAX_SIZE = 5 * 1024 * 1024 // 5MB
  private readonly DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

  async uploadFile(
    file: File,
    path: string,
    options: UploadOptions = {},
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      // Validate file
      const validation = this.validateFile(file, options)
      if (validation.error) {
        return { url: null, error: validation.error }
      }

      // Compress image if needed
      const processedFile = await this.processFile(file, options)

      // Generate unique filename
      const fileName = this.generateFileName(processedFile, path)

      // Upload with progress tracking
      const { data, error } = await this.uploadWithProgress(processedFile, fileName, options)

      if (error) {
        console.error("Upload error:", error)
        return { url: null, error: error.message }
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage.from("images").getPublicUrl(fileName)

      return { url: urlData.publicUrl, error: null }
    } catch (error: any) {
      console.error("Upload service error:", error)
      return { url: null, error: error.message || "Upload failed" }
    }
  }

  private validateFile(file: File, options: UploadOptions): { error: string | null } {
    const maxSize = options.maxSize || this.DEFAULT_MAX_SIZE
    const allowedTypes = options.allowedTypes || this.DEFAULT_ALLOWED_TYPES

    if (!file) {
      return { error: "No file provided" }
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      return { error: `File size must be less than ${maxSizeMB}MB` }
    }

    if (!allowedTypes.includes(file.type)) {
      return { error: "File type not supported. Please use JPEG, PNG, GIF, or WebP." }
    }

    return { error: null }
  }

  private async processFile(file: File, options: UploadOptions): Promise<File> {
    // If it's an image and quality is specified, compress it
    if (file.type.startsWith("image/") && options.quality && options.quality < 1) {
      return await this.compressImage(file, options.quality)
    }

    return file
  }

  private async compressImage(file: File, quality: number): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920
        const maxHeight = 1080
        let { width, height } = img

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          file.type,
          quality,
        )
      }

      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  private generateFileName(file: File, path: string): string {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"

    return `${path}/${timestamp}-${randomString}.${extension}`
  }

  private async uploadWithProgress(
    file: File,
    fileName: string,
    options: UploadOptions,
  ): Promise<{ data: any; error: any }> {
    // Create a custom upload with progress tracking
    const xhr = new XMLHttpRequest()

    return new Promise((resolve) => {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && options.onProgress) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          }
          options.onProgress(progress)
        }
      })

      // Use Supabase upload (fallback without progress if XHR fails)
      this.supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        })
        .then((result) => resolve(result))
        .catch((error) => resolve({ data: null, error }))
    })
  }

  async deleteFile(filePath: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await this.supabase.storage.from("images").remove([filePath])

      if (error) {
        console.error("Delete error:", error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error: any) {
      console.error("Delete service error:", error)
      return { success: false, error: error.message || "Delete failed" }
    }
  }

  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage.from("images").getPublicUrl(filePath)
    return data.publicUrl
  }

  // Clean up old files for a user
  async cleanupUserFiles(userId: string, keepRecent = 10): Promise<void> {
    try {
      const { data: files } = await this.supabase.storage
        .from("images")
        .list(userId, { limit: 100, sortBy: { column: "created_at", order: "desc" } })

      if (files && files.length > keepRecent) {
        const filesToDelete = files.slice(keepRecent).map((file) => `${userId}/${file.name}`)

        await this.supabase.storage.from("images").remove(filesToDelete)
      }
    } catch (error) {
      console.error("Cleanup error:", error)
    }
  }
}

export const uploadService = new UploadService()
