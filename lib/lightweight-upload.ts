import { createClient } from "@/lib/supabase/client"

export interface SimpleUploadProgress {
  percentage: number
  status: "idle" | "uploading" | "success" | "error"
}

export class LightweightUploadService {
  private supabase = createClient()
  private readonly MAX_SIZE = 3 * 1024 * 1024 // 3MB limit for better performance
  private readonly ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

  async uploadImage(
    file: File,
    userId: string,
    type: "avatar" | "post",
    onProgress?: (progress: SimpleUploadProgress) => void,
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      // Quick validation
      if (!this.validateFile(file)) {
        return { url: null, error: "Invalid file. Use JPEG, PNG, or WebP under 3MB." }
      }

      onProgress?.({ percentage: 0, status: "uploading" })

      // Compress if needed
      const processedFile = await this.quickCompress(file)

      onProgress?.({ percentage: 30, status: "uploading" })

      // Generate simple filename
      const fileName = `${userId}/${type}/${Date.now()}.${this.getFileExtension(processedFile)}`

      onProgress?.({ percentage: 60, status: "uploading" })

      // Upload
      const { error: uploadError } = await this.supabase.storage.from("images").upload(fileName, processedFile, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        onProgress?.({ percentage: 0, status: "error" })
        return { url: null, error: uploadError.message }
      }

      onProgress?.({ percentage: 90, status: "uploading" })

      // Get URL
      const { data } = this.supabase.storage.from("images").getPublicUrl(fileName)

      onProgress?.({ percentage: 100, status: "success" })

      // Cleanup old files in background (don't wait)
      this.cleanupOldFiles(userId, type).catch(console.error)

      return { url: data.publicUrl, error: null }
    } catch (error: any) {
      onProgress?.({ percentage: 0, status: "error" })
      return { url: null, error: error.message || "Upload failed" }
    }
  }

  private validateFile(file: File): boolean {
    return file && file.size <= this.MAX_SIZE && this.ALLOWED_TYPES.includes(file.type)
  }

  private getFileExtension(file: File): string {
    const ext = file.name.split(".").pop()?.toLowerCase()
    return ext === "jpeg" ? "jpg" : ext || "jpg"
  }

  private async quickCompress(file: File): Promise<File> {
    // Only compress if file is large
    if (file.size < 1024 * 1024) return file // Skip compression for files under 1MB

    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        // Simple resize logic
        const maxDim = 1200
        let { width, height } = img

        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type }))
            } else {
              resolve(file)
            }
          },
          file.type,
          0.8, // 80% quality
        )
      }

      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  private async cleanupOldFiles(userId: string, type: string): Promise<void> {
    try {
      const { data: files } = await this.supabase.storage
        .from("images")
        .list(`${userId}/${type}`, { limit: 10, sortBy: { column: "created_at", order: "desc" } })

      if (files && files.length > 3) {
        const filesToDelete = files.slice(3).map((file) => `${userId}/${type}/${file.name}`)
        await this.supabase.storage.from("images").remove(filesToDelete)
      }
    } catch (error) {
      console.error("Cleanup error:", error)
    }
  }
}

export const lightweightUpload = new LightweightUploadService()
