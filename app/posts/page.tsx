import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PostCard } from "@/components/posts/post-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { dbService } from "@/lib/database-service"
import Link from "next/link"
import { BookOpen, PenTool } from "lucide-react"

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const categorySlug = params.category

  // Get categories and posts in parallel
  const [categories, posts] = await Promise.all([
    dbService.getCategories(),
    dbService.getAllPosts({
      limit: 20,
      categoryId: categorySlug ? categories.find((c) => c.slug === categorySlug)?.id : undefined,
    }),
  ])

  const selectedCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container max-w-6xl py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">{selectedCategory ? selectedCategory.name : "All Articles"}</h1>
                <p className="text-muted-foreground">
                  {selectedCategory
                    ? selectedCategory.description || `Articles in ${selectedCategory.name}`
                    : "Explore educational content from our community"}
                </p>
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
                <Badge
                  variant={!selectedCategory ? "default" : "outline"}
                  className="text-sm py-2 px-4 hover:bg-primary/10"
                >
                  <Link href="/posts">All</Link>
                </Badge>
                {categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant={selectedCategory?.id === category.id ? "default" : "secondary"}
                    className="text-sm py-2 px-4 hover:bg-primary/10"
                  >
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
                <h3 className="text-lg font-semibold mb-2">
                  {selectedCategory ? `No articles in ${selectedCategory.name}` : "No articles yet"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {selectedCategory
                    ? `Be the first to write about ${selectedCategory.name.toLowerCase()}`
                    : "Be the first to share knowledge with the community"}
                </p>
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
