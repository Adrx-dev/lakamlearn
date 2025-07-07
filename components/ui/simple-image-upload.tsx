"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { lightweightUpload, type SimpleUploadProgress } from "@/lib/lightweight-upload"
import { Upload, X, Camera, ImageIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SimpleImageUploadProps {
  value?: string
  onChange: (url: string | null) => void
  onError?: (error: string) => void
  disabled?: boolean
  variant?: "avatar" | "cover"
  fallback?: string
  userId: string
}

export function SimpleImageUpload({
  value,
  onChange,
  onError,
  disabled = false,
  variant = "cover",
  fallback = "Upload",
  userId,
}: SimpleImageUploadProps) {
  const [progress, setProgress] = useState<SimpleUploadProgress>({ percentage: 0, status: "idle" })
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    if (!file || disabled) return

    const result = await lightweightUpload.uploadImage(
      file,
      userId,
      variant === "avatar" ? "avatar" : "post",
      setProgress,
    )

    if (result.error) {
      onError?.(result.error)
    } else if (result.url) {
      onChange(result.url)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  const handleRemove = () => {
    onChange(null)
    setProgress({ percentage: 0, status: "idle" })
    if (inputRef.current) inputRef.current.value = ""
  }

  const isUploading = progress.status === "uploading"

  if (variant === "avatar") {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="relative group">
          <Avatar className="h-24 w-24">
            <AvatarImage src={value || "/placeholder.svg"} alt="Profile picture" />
            <AvatarFallback className="bg-lakambini-gradient text-white text-2xl">{fallback.charAt(0)}</AvatarFallback>
          </Avatar>

          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <div className="text-white text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                <div className="text-xs">{progress.percentage}%</div>
              </div>
            </div>
          )}

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

        <Input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
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

        <p className="text-xs text-muted-foreground text-center">JPEG, PNG, WebP (max 3MB)</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed",
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
              <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
                <div className="text-white text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <div className="text-sm">{progress.percentage}%</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
                <p className="text-sm font-medium">Uploading... {progress.percentage}%</p>
              </div>
            ) : (
              <>
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Click to upload an image</p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, WebP (max 3MB)</p>
                </div>
              </>
            )}
            <Input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
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
    </div>
  )
}
