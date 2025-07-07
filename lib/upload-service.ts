import { createClient } from "@/lib/supabase/client"

export interface UploadProgress {
  percentage: number
  status: "idle" | "uploading" | "processing" | "success" | "error"
  message?: string
}

export class UploadService {
  private supabase = createClient()
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private readonly ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  private readonly COMPRESSION_QUALITY = 0.8
  private readonly MAX_DIMENSION = 1920

  async uploadImage(
    file: File,
    userId: string,
    type: "avatar" | "post" | "cover",
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      // Initial validation
      const validationError = this.validateFile(file)
      if (validationError) {
        onProgress?.({ percentage: 0, status: "error", message: validationError })
        return { url: null, error: validationError }
      }

      onProgress?.({ percentage: 10, status: "uploading", message: "Preparing upload..." })

      // Process image
      const processedFile = await this.processImage(file, (progress) => {
        onProgress?.({ percentage: 10 + progress * 0.4, status: "processing", message: "Processing image..." })
      })

      onProgress?.({ percentage: 50, status: "uploading", message: "Uploading to server..." })

      // Generate unique filename
      const fileName = this.generateFileName(userId, type, processedFile)

      // Upload to Supabase Storage
      const { error: uploadError } = await this.supabase.storage.from("images").upload(fileName, processedFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        onProgress?.({ percentage: 0, status: "error", message: "Upload failed" })
        return { url: null, error: uploadError.message }
      }

      onProgress?.({ percentage: 90, status: "uploading", message: "Finalizing..." })

      // Get public URL
      const { data } = this.supabase.storage.from("images").getPublicUrl(fileName)

      onProgress?.({ percentage: 100, status: "success", message: "Upload complete!" })

      // Clean up old files in background
      this.cleanupOldFiles(userId, type).catch(console.error)

      return { url: data.publicUrl, error: null }
    } catch (error: any) {
      console.error("Upload service error:", error)
      onProgress?.({ percentage: 0, status: "error", message: "Upload failed" })
      return { url: null, error: error.message || "Upload failed" }
    }
  }

  private validateFile(file: File): string | null {
    if (!file) {
      return "No file selected"
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please use JPEG, PNG, WebP, or GIF"
    }

    return null
  }

  private async processImage(file: File, onProgress?: (progress: number) => void): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        try {
          onProgress?.(0.2)

          // Calculate new dimensions
          let { width, height } = img

          if (width > this.MAX_DIMENSION || height > this.MAX_DIMENSION) {
            const ratio = Math.min(this.MAX_DIMENSION / width, this.MAX_DIMENSION / height)
            width = Math.floor(width * ratio)
            height = Math.floor(height * ratio)
          }

          onProgress?.(0.5)

          // Set canvas size
          canvas.width = width
          canvas.height = height

          // Draw image
          ctx?.drawImage(img, 0, 0, width, height)

          onProgress?.(0.8)

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const processedFile = new File([blob], file.name, {
                  type: file.type === "image/png" ? "image/png" : "image/jpeg",
                  lastModified: Date.now(),
                })
                onProgress?.(1)
                resolve(processedFile)
              } else {
                reject(new Error("Failed to process image"))
              }
            },
            file.type === "image/png" ? "image/png" : "image/jpeg",
            this.COMPRESSION_QUALITY,
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  private generateFileName(userId: string, type: string, file: File): string {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = this.getFileExtension(file)
    return `${userId}/${type}/${timestamp}_${randomString}.${extension}`
  }

  private getFileExtension(file: File): string {
    const extension = file.name.split(".").pop()?.toLowerCase()
    if (extension === "jpeg") return "jpg"
    return extension || "jpg"
  }

  private async cleanupOldFiles(userId: string, type: string): Promise<void> {
    try {
      const { data: files } = await this.supabase.storage.from("images").list(`${userId}/${type}`, {
        limit: 20,
        sortBy: { column: "created_at", order: "desc" },
      })

      if (files && files.length > 5) {
        const filesToDelete = files.slice(5).map((file) => `${userId}/${type}/${file.name}`)

        await this.supabase.storage.from("images").remove(filesToDelete)
      }
    } catch (error) {
      console.error("Cleanup error:", error)
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage.from("images").remove([filePath])

      return !error
    } catch (error) {
      console.error("Delete error:", error)
      return false
    }
  }
}

export const uploadService = new UploadService()
