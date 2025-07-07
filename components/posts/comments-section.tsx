"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { useCenteredToastContext } from "@/components/providers/toast-provider"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle, Reply, MoreHorizontal, Edit, Trash2, Send } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import type { Comment } from "@/lib/types"

interface CommentsSectionProps {
  postId: string
}

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[]
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const { user } = useAuth()
  const { toast } = useCenteredToastContext()
  const [comments, setComments] = useState<CommentWithReplies[]>([])
  const [newComment, setNewComment] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const fetchComments = useCallback(async () => {
    if (!postId) return

    setLoading(true)
    try {
      const { data: comments, error } = await supabase
        .from("comments")
        .select(`
          *,
          author:profiles(*)
        `)
        .eq("post_id", postId)
        .is("parent_id", null)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching comments:", error)
        return
      }

      if (comments) {
        // Fetch replies for each comment
        const commentsWithReplies = await Promise.all(
          comments.map(async (comment) => {
            try {
              const { data: replies, error: repliesError } = await supabase
                .from("comments")
                .select(`
                  *,
                  author:profiles(*)
                `)
                .eq("parent_id", comment.id)
                .order("created_at", { ascending: true })

              if (repliesError) {
                console.error("Error fetching replies:", repliesError)
                return { ...comment, replies: [] }
              }

              return {
                ...comment,
                replies: replies || [],
              }
            } catch (error) {
              console.error("Error processing comment:", error)
              return { ...comment, replies: [] }
            }
          }),
        )

        setComments(commentsWithReplies)
      }
    } catch (error) {
      console.error("Error in fetchComments:", error)
    } finally {
      setLoading(false)
    }
  }, [postId, supabase])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmitComment = useCallback(async () => {
    if (!user || !newComment.trim()) {
      toast({
        title: "Authentication required",
        description: "Please log in to comment.",
        variant: "warning",
        duration: 3000,
      })
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from("comments").insert({
        content: newComment.trim(),
        author_id: user.id,
        post_id: postId,
      })

      if (error) throw error

      setNewComment("")
      await fetchComments()

      toast({
        title: "Comment posted! 💬",
        description: "Your comment has been added successfully.",
        variant: "success",
        duration: 3000,
      })
    } catch (error) {
      console.error("Error posting comment:", error)
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "error",
        duration: 4000,
      })
    } finally {
      setSubmitting(false)
    }
  }, [user, newComment, postId, supabase, toast, fetchComments])

  const handleSubmitReply = useCallback(
    async (parentId: string) => {
      if (!user || !replyContent.trim()) return

      setSubmitting(true)
      try {
        const { error } = await supabase.from("comments").insert({
          content: replyContent.trim(),
          author_id: user.id,
          post_id: postId,
          parent_id: parentId,
        })

        if (error) throw error

        setReplyContent("")
        setReplyTo(null)
        await fetchComments()

        toast({
          title: "Reply posted! 💬",
          description: "Your reply has been added successfully.",
          variant: "success",
          duration: 3000,
        })
      } catch (error) {
        console.error("Error posting reply:", error)
        toast({
          title: "Error",
          description: "Failed to post reply. Please try again.",
          variant: "error",
          duration: 4000,
        })
      } finally {
        setSubmitting(false)
      }
    },
    [user, replyContent, postId, supabase, toast, fetchComments],
  )

  const handleEditComment = useCallback(
    async (commentId: string) => {
      if (!editContent.trim()) return

      setSubmitting(true)
      try {
        const { error } = await supabase
          .from("comments")
          .update({
            content: editContent.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", commentId)

        if (error) throw error

        setEditingComment(null)
        setEditContent("")
        await fetchComments()

        toast({
          title: "Comment updated! ✏️",
          description: "Your comment has been updated successfully.",
          variant: "success",
          duration: 3000,
        })
      } catch (error) {
        console.error("Error updating comment:", error)
        toast({
          title: "Error",
          description: "Failed to update comment. Please try again.",
          variant: "error",
          duration: 4000,
        })
      } finally {
        setSubmitting(false)
      }
    },
    [editContent, supabase, toast, fetchComments],
  )

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!confirm("Are you sure you want to delete this comment?")) return

      try {
        const { error } = await supabase.from("comments").delete().eq("id", commentId)

        if (error) throw error

        await fetchComments()

        toast({
          title: "Comment deleted! 🗑️",
          description: "Your comment has been removed.",
          variant: "success",
          duration: 3000,
        })
      } catch (error) {
        console.error("Error deleting comment:", error)
        toast({
          title: "Error",
          description: "Failed to delete comment. Please try again.",
          variant: "error",
          duration: 4000,
        })
      }
    },
    [supabase, toast, fetchComments],
  )

  const startEdit = useCallback((comment: CommentWithReplies) => {
    setEditingComment(comment.id)
    setEditContent(comment.content)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingComment(null)
    setEditContent("")
  }, [])

  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Recently"
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return "Recently"
    }
  }, [])

  const CommentItem = useCallback(
    ({ comment, isReply = false }: { comment: CommentWithReplies; isReply?: boolean }) => {
      const isAuthor = user?.id === comment.author_id
      const isEditing = editingComment === comment.id

      return (
        <div className={`${isReply ? "ml-8 border-l-2 border-muted pl-4" : ""}`}>
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback className="bg-lakambini-gradient text-white text-sm">
                      {(comment.author?.full_name || "L").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{comment.author?.full_name || "Lakambini Student"}</span>
                      {isAuthor && (
                        <Badge variant="secondary" className="text-xs">
                          Author
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                      {comment.updated_at !== comment.created_at && (
                        <span className="text-xs text-muted-foreground">(edited)</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="text-sm"
                          disabled={submitting}
                        />
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => handleEditComment(comment.id)} disabled={submitting}>
                            <Send className="h-3 w-3 mr-1" />
                            Update
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={submitting}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                    )}
                  </div>
                </div>

                {isAuthor && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEdit(comment)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteComment(comment.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>

            {!isEditing && (
              <CardContent className="pt-0">
                <div className="flex items-center space-x-4">
                  {user && !isReply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs"
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Reply Form */}
          {replyTo === comment.id && (
            <Card className="ml-8 mb-4">
              <CardContent className="pt-4">
                <div className="flex space-x-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback className="bg-lakambini-gradient text-white text-xs">
                      {(user?.user_metadata?.full_name || user?.email || "L").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      className="text-sm"
                      disabled={submitting}
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={submitting || !replyContent.trim()}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyTo(null)
                          setReplyContent("")
                        }}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-2">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply={true} />
              ))}
            </div>
          )}
        </div>
      )
    },
    [
      user,
      editingComment,
      editContent,
      submitting,
      replyTo,
      replyContent,
      formatDate,
      startEdit,
      cancelEdit,
      handleEditComment,
      handleDeleteComment,
      handleSubmitReply,
    ],
  )

  return (
    <div className="space-y-6 mt-12">
      <div className="flex items-center space-x-2 pb-4 border-b">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h3 className="text-xl font-semibold">Comments ({comments.length})</h3>
      </div>

      {/* New Comment Form */}
      {user ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-lakambini-gradient text-white">
                  {(user.user_metadata?.full_name || user.email || "L").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Share your thoughts about this post..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  disabled={submitting}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">Be respectful and constructive in your comments.</p>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={submitting || !newComment.trim()}
                    className="lakambini-gradient text-white"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <MessageCircle className="h-4 w-4" />
          <AlertDescription>
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>{" "}
            to join the conversation and share your thoughts on this post.
          </AlertDescription>
        </Alert>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-muted rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 w-24 bg-muted rounded"></div>
                    <div className="h-3 w-16 bg-muted rounded"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">No comments yet</h4>
            <p className="text-muted-foreground">Be the first to share your thoughts about this post!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  )
}
