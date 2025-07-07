"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Bookmark, BookmarkCheck } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { Post } from "@/lib/types"
import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { useCenteredToastContext } from "@/components/providers/toast-provider"

interface PostCardProps {
  post: Post
  onRemoveFromReadingList?: () => void
}

export function PostCard({ post, onRemoveFromReadingList }: PostCardProps) {
  const { user } = useAuth()
  const { toast } = useCenteredToastContext()
  const [isLiked, setIsLiked] = useState(Boolean(post.is_liked))
  const [isSaved, setIsSaved] = useState(Boolean(post.is_saved))
  const [likesCount, setLikesCount] = useState(Number(post.likes_count) || 0)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to like posts.",
          variant: "warning",
          duration: 3000,
        })
        return
      }

      if (loading) return
      setLoading(true)

      try {
        if (isLiked) {
          const { error } = await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id)

          if (error) throw error

          setIsLiked(false)
          setLikesCount((prev) => Math.max(0, prev - 1))
        } else {
          const { error } = await supabase.from("likes").insert({ user_id: user.id, post_id: post.id })

          if (error) throw error

          setIsLiked(true)
          setLikesCount((prev) => prev + 1)
        }
      } catch (error) {
        console.error("Like error:", error)
        toast({
          title: "Error",
          description: "Failed to update like status.",
          variant: "error",
          duration: 3000,
        })
      } finally {
        setLoading(false)
      }
    },
    [user, isLiked, loading, post.id, supabase, toast],
  )

  const handleSave = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to save posts.",
          variant: "warning",
          duration: 3000,
        })
        return
      }

      if (loading) return
      setLoading(true)

      try {
        if (isSaved) {
          const { error } = await supabase.from("reading_list").delete().eq("user_id", user.id).eq("post_id", post.id)

          if (error) throw error

          setIsSaved(false)
          toast({
            title: "Removed from reading list",
            description: "Post removed from your reading list.",
            variant: "info",
            duration: 2000,
          })
          if (onRemoveFromReadingList) {
            onRemoveFromReadingList()
          }
        } else {
          const { error } = await supabase.from("reading_list").insert({ user_id: user.id, post_id: post.id })

          if (error) throw error

          setIsSaved(true)
          toast({
            title: "Added to reading list",
            description: "Post saved to your reading list.",
            variant: "success",
            duration: 2000,
          })
        }
      } catch (error) {
        console.error("Save error:", error)
        toast({
          title: "Error",
          description: "Failed to update save status.",
          variant: "error",
          duration: 3000,
        })
      } finally {
        setLoading(false)
      }
    },
    [user, isSaved, loading, post.id, supabase, toast, onRemoveFromReadingList],
  )

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    target.style.display = "none"
  }, [])

  // Safe date formatting
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Recently"
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return "Recently"
    }
  }, [])

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <Link href={`/posts/${post.slug || "untitled"}`} className="block">
        {post.cover_image_url && (
          <div className="aspect-video relative overflow-hidden">
            <Image
              src={post.cover_image_url || "/placeholder.svg"}
              alt={post.title || "Post image"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={handleImageError}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            {post.category && (
              <Badge variant="secondary" className="text-xs">
                {post.category.name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{formatDate(post.created_at)}</span>
          </div>

          <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {post.title || "Untitled Post"}
          </h3>

          {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
        </CardHeader>
      </Link>

      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={post.author?.avatar_url || "/placeholder.svg"} />
            <AvatarFallback className="text-xs bg-lakambini-gradient text-white">
              {(post.author?.full_name || "L").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {post.author?.full_name || "Lakambini Student"}
          </span>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleLike} disabled={loading}>
            <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
            <span className="ml-1 text-xs">{likesCount}</span>
          </Button>

          <Button variant="ghost" size="sm" className="h-8 px-2" disabled>
            <MessageCircle className="h-4 w-4" />
            <span className="ml-1 text-xs">{Number(post.comments_count) || 0}</span>
          </Button>

          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleSave} disabled={loading}>
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4 fill-primary text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
