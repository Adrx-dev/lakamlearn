"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X, Camera } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  value?: string
  onChange: (file: File | null, previewUrl: string) => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
  variant?: "avatar" | "cover"
  fallback?: string
  maxSize?: number // in MB
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  className,
  variant = "cover",
  fallback = "Upload",
  maxSize = 5,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    onChange(file, previewUrl)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (disabled) return

    handleFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const handleRemove = () => {
    if (value && value.startsWith("blob:")) {
      URL.revokeObjectURL(value)
    }
    onChange(null, "")
    onRemove?.()
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  if (variant === "avatar") {
    return (
      <div className={cn("flex flex-col items-center space-y-4", className)}>
        <div className="relative group">
          <Avatar className="h-24 w-24">
            <AvatarImage src={value || "/placeholder.svg"} alt="Profile picture" />
            <AvatarFallback className="bg-lakambini-gradient text-white text-2xl">{fallback.charAt(0)}</AvatarFallback>
          </Avatar>

          {!disabled && (
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-6 w-6 text-white" />
            </div>
          )}

          {value && !disabled && (
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
            disabled={disabled}
          />
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
          <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP (max {maxSize}MB)</p>
        </div>
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
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {value ? (
          <div className="relative">
            <img src={value || "/placeholder.svg"} alt="Preview" className="w-full h-48 object-cover rounded-md" />
            {!disabled && (
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
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop your image here, or click to browse</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP (max {maxSize}MB)</p>
            </div>
            <Input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
              disabled={disabled}
            />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
              Select Image
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
