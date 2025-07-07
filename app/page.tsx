import { optimizedDb } from "@/lib/optimized-database"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PostCard } from "@/components/posts/post-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { BookOpen, Users, TrendingUp } from "lucide-react"
import type { Post } from "@/lib/types"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"

async function getFeaturedPosts(): Promise<Post[]> {
  try {
    const { data, error } = await optimizedDb.getPosts({
      limit: 6,
      offset: 0,
      publishedOnly: true,
    })

    if (error) {
      console.error("Error fetching featured posts:", error)
      return []
    }

    return data
  } catch (error) {
    console.error("Unexpected error fetching featured posts:", error)
    return []
  }
}

async function getCategories() {
  try {
    const supabase = await createClient()
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name")
      .limit(10)

    if (error) {
      console.error("Error fetching categories:", error)
      return []
    }

    return categories || []
  } catch (error) {
    console.error("Error in getCategories:", error)
    return []
  }
}

export default async function HomePage() {
  const [posts, categories] = await Promise.all([getFeaturedPosts(), getCategories()])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 filipino-pattern opacity-5"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10"></div>

          <div className="container px-4 md:px-6 relative">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="animate-fade-in">
                <Image
                  src="/images/lakambini-logo.png"
                  alt="Lakambini Learn Logo"
                  width={120}
                  height={120}
                  className="logo-glow rounded-full"
                  priority
                />
              </div>

              <div className="space-y-4 animate-fade-in">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Welcome to <span className="lakambini-text-gradient">Lakambini Learn</span>
                </h1>
                <div className="flex items-center justify-center space-x-2 text-lg text-muted-foreground">
                  <span>Grade XI</span>
                  <span>•</span>
                  <span>2025-2026</span>
                </div>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Discover, learn, and share knowledge through our Filipino-inspired education platform. Join our
                  community of Grade XI learners and educators.
                </p>
              </div>
              <div className="space-x-4 animate-fade-in">
                <Button asChild size="lg" className="lakambini-gradient text-white hover:opacity-90">
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-primary/20 hover:bg-primary/5 bg-transparent"
                >
                  <Link href="/posts">Explore Articles</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <BookOpen className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-2xl font-bold">{posts.length}+</h3>
                <p className="text-muted-foreground">Educational Articles</p>
              </div>
              <div className="space-y-2">
                <Users className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-2xl font-bold">Grade XI</h3>
                <p className="text-muted-foreground">Learning Community</p>
              </div>
              <div className="space-y-2">
                <TrendingUp className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-2xl font-bold">{categories.length}+</h3>
                <p className="text-muted-foreground">Subject Categories</p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        {categories && categories.length > 0 && (
          <section className="py-12">
            <div className="container px-4 md:px-6">
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter">Explore Categories</h2>
                  <p className="text-muted-foreground">Find articles that match your interests</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {categories.map((category) => (
                    <Badge key={category.id} variant="secondary" className="text-sm py-2 px-4 hover:bg-primary/10">
                      <Link href={`/categories/${category.slug}`}>{category.name}</Link>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Featured Posts Section */}
        <section className="py-12 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter">Latest Articles</h2>
                <p className="text-muted-foreground">Discover the newest educational content from our community</p>
              </div>

              {posts && posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No posts available yet</h3>
                  <p className="text-muted-foreground mb-4">Be the first to share knowledge with our community!</p>
                  <Button asChild>
                    <Link href="/write">Write the first post</Link>
                  </Button>
                </div>
              )}

              {posts && posts.length > 0 && (
                <div className="text-center">
                  <Button asChild variant="outline">
                    <Link href="/posts">View All Posts</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
