"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UploadProgress } from "@/components/ui/upload-progress"
import { uploadService, type UploadProgress as UploadProgressType } from "@/lib/upload"
import { Upload, X, Camera, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedImageUploadProps {
  value?: string
  onChange: (url: string | null) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
  variant?: "avatar" | "cover"
  fallback?: string
  maxSize?: number // in MB
  quality?: number // 0-1 for compression
  userId: string
}

export function EnhancedImageUpload({
  value,
  onChange,
  onError,
  disabled = false,
  className,
  variant = "cover",
  fallback = "Upload",
  maxSize = 5,
  quality = 0.8,
  userId,
}: EnhancedImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgressType>({ loaded: 0, total: 0, percentage: 0 })
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [uploadError, setUploadError] = useState<string>("")
  const [fileName, setFileName] = useState<string>("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file || disabled) return

      setFileName(file.name)
      setUploadStatus("uploading")
      setUploadError("")
      setUploadProgress({ loaded: 0, total: file.size, percentage: 0 })

      try {
        const path = variant === "avatar" ? `${userId}/avatars` : `${userId}/posts`

        const result = await uploadService.uploadFile(file, path, {
          maxSize: maxSize * 1024 * 1024,
          quality,
          onProgress: (progress) => {
            setUploadProgress(progress)
          },
        })

        if (result.error) {
          setUploadStatus("error")
          setUploadError(result.error)
          onError?.(result.error)
        } else if (result.url) {
          setUploadStatus("success")
          onChange(result.url)

          // Clean up old files
          if (variant === "avatar") {
            uploadService.cleanupUserFiles(`${userId}/avatars`, 3)
          }
        }
      } catch (error: any) {
        setUploadStatus("error")
        const errorMessage = error.message || "Upload failed"
        setUploadError(errorMessage)
        onError?.(errorMessage)
      }
    },
    [disabled, variant, userId, maxSize, quality, onChange, onError],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      handleUpload(files[0])
    },
    [handleUpload],
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (disabled) return
      handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
    },
    [handleFiles],
  )

  const handleRemove = useCallback(() => {
    if (value && value.startsWith("blob:")) {
      URL.revokeObjectURL(value)
    }
    onChange(null)
    setUploadStatus("idle")
    setUploadError("")
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }, [value, onChange])

  const isUploading = uploadStatus === "uploading"

  if (variant === "avatar") {
    return (
      <div className={cn("flex flex-col items-center space-y-4", className)}>
        <div className="relative group">
          <Avatar className="h-24 w-24">
            <AvatarImage src={value || "/placeholder.svg"} alt="Profile picture" />
            <AvatarFallback className="bg-lakambini-gradient text-white text-2xl">{fallback.charAt(0)}</AvatarFallback>
          </Avatar>

          {!disabled && !isUploading && (
            <div
              className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-6 w-6 text-white" />
            </div>
          )}

          {value && !disabled && !isUploading && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex flex-col items-center space-y-2">
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {!isUploading && (
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Change Avatar
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">JPG, PNG, GIF or WebP (max {maxSize}MB)</p>
        </div>

        <UploadProgress
          progress={uploadProgress.percentage}
          status={uploadStatus}
          fileName={fileName}
          error={uploadError}
          className="w-full max-w-sm"
        />
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Cover Image</Label>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed",
          isUploading && "pointer-events-none",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {value ? (
          <div className="relative">
            <img src={value || "/placeholder.svg"} alt="Preview" className="w-full h-48 object-cover rounded-md" />
            {!disabled && !isUploading && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isUploading ? "Uploading..." : "Drop your image here, or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP (max {maxSize}MB)</p>
            </div>
            <Input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
              disabled={disabled || isUploading}
            />
            {!isUploading && (
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
                Select Image
              </Button>
            )}
          </div>
        )}
      </div>

      <UploadProgress
        progress={uploadProgress.percentage}
        status={uploadStatus}
        fileName={fileName}
        error={uploadError}
      />
    </div>
  )
}
