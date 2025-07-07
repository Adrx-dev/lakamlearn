"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Upload, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadProgressProps {
  progress: number
  status: "idle" | "uploading" | "success" | "error"
  fileName?: string
  error?: string
  className?: string
}

export function UploadProgress({ progress, status, fileName, error, className }: UploadProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return <Upload className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case "uploading":
        return `Uploading... ${progress}%`
      case "success":
        return "Upload complete!"
      case "error":
        return error || "Upload failed"
      default:
        return "Ready to upload"
    }
  }

  const getProgressColor = () => {
    switch (status) {
      case "success":
        return "bg-green-500"
      case "error":
        return "bg-destructive"
      default:
        return "bg-primary"
    }
  }

  if (status === "idle") return null

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName || "File"}</p>
              <p className={cn("text-xs", status === "error" ? "text-destructive" : "text-muted-foreground")}>
                {getStatusText()}
              </p>
            </div>
          </div>

          {status === "uploading" && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress}%</span>
                <span>{progress === 100 ? "Processing..." : "Uploading..."}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
