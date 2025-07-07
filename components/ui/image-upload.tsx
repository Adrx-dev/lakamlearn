"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { uploadService, type UploadProgress } from "@/lib/upload-service"
import { Upload, X, Camera, ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  value?: string
  onChange: (url: string | null) => void
  onError?: (error: string) => void
  disabled?: boolean
  variant?: "avatar" | "cover" | "post"
  fallback?: string
  userId: string
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  onError,
  disabled = false,
  variant = "cover",
  fallback = "Upload",
  userId,
  className,
}: ImageUploadProps) {
  const [progress, setProgress] = useState<UploadProgress>({ percentage: 0, status: "idle" })
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    if (!file || disabled) return

    const result = await uploadService.uploadImage(
      file,
      userId,
      variant === "avatar" ? "avatar" : variant === "cover" ? "cover" : "post",
      setProgress,
    )

    if (result.error) {
      onError?.(result.error)
      setProgress({ percentage: 0, status: "error", message: result.error })
    } else if (result.url) {
      onChange(result.url)
      setTimeout(() => {
        setProgress({ percentage: 0, status: "idle" })
      }, 2000)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleRemove = () => {
    onChange(null)
    setProgress({ percentage: 0, status: "idle" })
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const isUploading = progress.status === "uploading" || progress.status === "processing"
  const isSuccess = progress.status === "success"
  const isError = progress.status === "error"

  if (variant === "avatar") {
    return (
      <div className={cn("flex flex-col items-center space-y-4", className)}>
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-muted">
            <AvatarImage src={value || "/placeholder.svg"} alt="Profile picture" />
            <AvatarFallback className="bg-lakambini-gradient text-white text-2xl">
              {fallback.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {isUploading && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin mb-1" />
              <span className="text-xs text-white font-medium">{progress.percentage}%</span>
            </div>
          )}

          {isSuccess && (
            <div className="absolute inset-0 bg-green-500/80 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 bg-red-500/80 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
          )}

          {!disabled && !isUploading && !isSuccess && (
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

        <Input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {!isUploading && !isSuccess && (
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

        {isUploading && (
          <div className="w-full max-w-xs">
            <Progress value={progress.percentage} className="h-2" />
            <p className="text-xs text-center mt-1 text-muted-foreground">{progress.message || "Uploading..."}</p>
          </div>
        )}

        {isError && <p className="text-xs text-center text-red-500 max-w-xs">{progress.message || "Upload failed"}</p>}

        <p className="text-xs text-muted-foreground text-center">JPEG, PNG, WebP, GIF (max 5MB)</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{variant === "cover" ? "Cover Image" : "Image"}</Label>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          isError && "border-red-300 bg-red-50/50",
        )}
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
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 rounded-md flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
                <div className="text-white text-sm font-medium mb-2">{progress.message || "Uploading..."}</div>
                <div className="w-32">
                  <Progress value={progress.percentage} className="h-2" />
                </div>
                <div className="text-white text-xs mt-1">{progress.percentage}%</div>
              </div>
            )}
            {isSuccess && (
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Uploaded!
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
                <p className="text-sm font-medium">{progress.message || "Uploading..."}</p>
                <div className="w-48 mt-2">
                  <Progress value={progress.percentage} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{progress.percentage}%</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center text-red-500">
                <AlertCircle className="h-12 w-12 mb-2" />
                <p className="text-sm font-medium">Upload Failed</p>
                <p className="text-xs text-center">{progress.message}</p>
              </div>
            ) : (
              <>
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Click to upload an image</p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF (max 5MB)</p>
                </div>
              </>
            )}

            <Input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled || isUploading}
            />

            {!isUploading && (
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
                {isError ? "Try Again" : "Select Image"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
