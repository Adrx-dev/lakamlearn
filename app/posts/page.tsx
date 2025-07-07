import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PostCard } from "@/components/posts/post-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { BookOpen, PenTool } from "lucide-react"
import type { Post } from "@/lib/types"

async function getAllPosts() {
  const supabase = await createClient()

  try {
    const { data: posts } = await supabase
      .from("posts")
      .select(`
        *,
        author:profiles(*),
        category:categories(*)
      `)
      .eq("published", true)
      .order("created_at", { ascending: false })

    if (!posts) return []

    // Get likes and comments count for each post
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const [likesResult, commentsResult] = await Promise.all([
          supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
          supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
        ])

        return {
          ...post,
          likes_count: likesResult.count || 0,
          comments_count: commentsResult.count || 0,
        }
      }),
    )

    return postsWithCounts as Post[]
  } catch (error) {
    console.error("Error fetching posts:", error)
    return []
  }
}

async function getCategories() {
  const supabase = await createClient()

  try {
    const { data: categories } = await supabase.from("categories").select("*").order("name")
    return categories || []
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

export default async function PostsPage() {
  const [posts, categories] = await Promise.all([getAllPosts(), getCategories()])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container max-w-6xl py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">All Articles</h1>
                <p className="text-muted-foreground">Explore educational content from our community</p>
              </div>
            </div>

            <Button asChild>
              <Link href="/write">
                <PenTool className="h-4 w-4 mr-2" />
                Write Article
              </Link>
            </Button>
          </div>

          {/* Categories Filter */}
          {categories && categories.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Browse by Category</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-sm py-2 px-4 hover:bg-primary/10">
                  <Link href="/posts">All</Link>
                </Badge>
                {categories.map((category) => (
                  <Badge key={category.id} variant="secondary" className="text-sm py-2 px-4 hover:bg-primary/10">
                    <Link href={`/posts?category=${category.slug}`}>{category.name}</Link>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Posts Grid */}
          {posts && posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No articles yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to share knowledge with the community</p>
                <Button asChild>
                  <Link href="/write">Write the First Article</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
