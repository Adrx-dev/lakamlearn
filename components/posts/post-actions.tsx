"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Bookmark, BookmarkCheck, Share2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { useCenteredToastContext } from "@/components/providers/toast-provider"
import type { Post } from "@/lib/types"

interface PostActionsProps {
  post: Post
}

export function PostActions({ post }: PostActionsProps) {
  const { user } = useAuth()
  const { toast } = useCenteredToastContext()
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      checkUserInteractions()
    }
  }, [user, post.id])

  const checkUserInteractions = async () => {
    if (!user) return

    try {
      // Check if user liked the post
      const { data: like } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .single()

      setIsLiked(!!like)

      // Check if user saved the post
      const { data: saved } = await supabase
        .from("reading_list")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .single()

      setIsSaved(!!saved)

      // Get updated counts
      const [likesResult, commentsResult] = await Promise.all([
        supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
      ])

      setLikesCount(likesResult.count || 0)
      setCommentsCount(commentsResult.count || 0)
    } catch (error) {
      console.error("Error checking user interactions:", error)
    }
  }

  const handleLike = async () => {
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
        await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id)

        setIsLiked(false)
        setLikesCount((prev) => Math.max(0, prev - 1))

        toast({
          title: "Like removed",
          description: "You unliked this post.",
          variant: "info",
          duration: 2000,
        })
      } else {
        await supabase.from("likes").insert({ user_id: user.id, post_id: post.id })

        setIsLiked(true)
        setLikesCount((prev) => prev + 1)

        toast({
          title: "Post liked! ❤️",
          description: "You liked this post.",
          variant: "success",
          duration: 2000,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status. Please try again.",
        variant: "error",
        duration: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
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
        await supabase.from("reading_list").delete().eq("user_id", user.id).eq("post_id", post.id)

        setIsSaved(false)
        toast({
          title: "Removed from reading list",
          description: "Post removed from your reading list.",
          variant: "info",
          duration: 3000,
        })
      } else {
        await supabase.from("reading_list").insert({ user_id: user.id, post_id: post.id })

        setIsSaved(true)
        toast({
          title: "Added to reading list! 📚",
          description: "Post saved to your reading list.",
          variant: "success",
          duration: 3000,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update save status. Please try again.",
        variant: "error",
        duration: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    const title = post.title
    const text = post.excerpt || "Check out this article on Lakambini Learn"

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        })

        toast({
          title: "Shared successfully! 🎉",
          description: "Thanks for sharing this post.",
          variant: "success",
          duration: 3000,
        })
      } catch (error) {
        // User cancelled sharing or error occurred
        if (error instanceof Error && error.name !== "AbortError") {
          await fallbackShare(url)
        }
      }
    } else {
      await fallbackShare(url)
    }
  }

  const fallbackShare = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Link copied! 📋",
        description: "Post URL copied to clipboard.",
        variant: "success",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Unable to share or copy link.",
        variant: "error",
        duration: 4000,
      })
    }
  }

  const scrollToComments = () => {
    const commentsSection = document.getElementById("comments-section")
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="sticky top-20 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-y py-4 my-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            disabled={loading}
            className={isLiked ? "bg-red-500 hover:bg-red-600 text-white" : ""}
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
            <span className="font-medium">{likesCount}</span>
            <span className="hidden sm:inline ml-1">{likesCount === 1 ? "Like" : "Likes"}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={scrollToComments}>
            <MessageCircle className="h-4 w-4 mr-2" />
            <span className="font-medium">{commentsCount}</span>
            <span className="hidden sm:inline ml-1">{commentsCount === 1 ? "Comment" : "Comments"}</span>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            disabled={loading}
            className={isSaved ? "bg-primary text-primary-foreground" : ""}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span className="hidden sm:inline ml-2">{isSaved ? "Saved" : "Save"}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Share</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
