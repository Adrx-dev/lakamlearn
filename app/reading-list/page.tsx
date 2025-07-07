"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PostCard } from "@/components/posts/post-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { Bookmark, BookOpen } from "lucide-react"
import Link from "next/link"
import type { Post } from "@/lib/types"

export default function ReadingListPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchReadingList()
    }
  }, [user])

  const fetchReadingList = async () => {
    if (!user) return

    const { data: readingList } = await supabase
      .from("reading_list")
      .select(`
        post_id,
        posts!inner(
          *,
          author:profiles(*),
          category:categories(*)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (readingList) {
      // Get likes and comments count for each post
      const postsWithCounts = await Promise.all(
        readingList.map(async (item: any) => {
          const post = item.posts
          const [{ count: likesCount }, { count: commentsCount }] = await Promise.all([
            supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
            supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
          ])

          // Check if user liked this post
          const { data: userLike } = await supabase
            .from("likes")
            .select("id")
            .eq("user_id", user.id)
            .eq("post_id", post.id)
            .single()

          return {
            ...post,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            is_liked: !!userLike,
            is_saved: true, // Always true since it's in reading list
          }
        }),
      )

      setPosts(postsWithCounts)
    }
    setLoading(false)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-muted-foreground mb-4">Please log in to view your reading list</p>
              <Button asChild>
                <Link href="/auth/login">Log In</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container max-w-6xl py-8">
          <div className="flex items-center space-x-3 mb-8">
            <Bookmark className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">My Reading List</h1>
              <p className="text-muted-foreground">Articles you've saved for later</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No saved articles yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your reading list by saving articles you want to read later
                </p>
                <Button asChild>
                  <Link href="/">Explore Articles</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onRemoveFromReadingList={fetchReadingList} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
