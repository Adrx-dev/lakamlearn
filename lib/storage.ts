import { createClient } from "@/lib/supabase/client"

export class StorageManager {
  private supabase = createClient()

  async uploadAvatar(file: File, userId: string): Promise<string | null> {
    try {
      // Validate file
      if (!this.isValidImageFile(file)) {
        throw new Error("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.")
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB.")
      }

      // Delete old avatar if exists
      await this.deleteOldAvatars(userId)

      // Generate unique filename
      const fileExt = file.name.split(".").pop()?.toLowerCase()
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`

      // Upload file
      const { error: uploadError } = await this.supabase.storage.from("images").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data } = this.supabase.storage.from("images").getPublicUrl(fileName)

      return data.publicUrl
    } catch (error: any) {
      console.error("Avatar upload error:", error)
      throw error
    }
  }

  async uploadPostImage(file: File, userId: string): Promise<string | null> {
    try {
      // Validate file
      if (!this.isValidImageFile(file)) {
        throw new Error("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.")
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB.")
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop()?.toLowerCase()
      const fileName = `${userId}/posts/post-${Date.now()}.${fileExt}`

      // Upload file
      const { error: uploadError } = await this.supabase.storage.from("images").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data } = this.supabase.storage.from("images").getPublicUrl(fileName)

      return data.publicUrl
    } catch (error: any) {
      console.error("Post image upload error:", error)
      throw error
    }
  }

  private async deleteOldAvatars(userId: string): Promise<void> {
    try {
      const { data: files } = await this.supabase.storage.from("images").list(`${userId}`, {
        limit: 100,
      })

      if (files && files.length > 0) {
        const avatarFiles = files.filter((file) => file.name.startsWith("avatar-"))
        if (avatarFiles.length > 0) {
          const filesToDelete = avatarFiles.map((file) => `${userId}/${file.name}`)
          await this.supabase.storage.from("images").remove(filesToDelete)
        }
      }
    } catch (error) {
      console.error("Error deleting old avatars:", error)
      // Don't throw error, just log it
    }
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    return validTypes.includes(file.type)
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage.from("images").remove([filePath])
      return !error
    } catch (error) {
      console.error("Error deleting file:", error)
      return false
    }
  }

  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage.from("images").getPublicUrl(filePath)
    return data.publicUrl
  }
}

export const storageManager = new StorageManager()
