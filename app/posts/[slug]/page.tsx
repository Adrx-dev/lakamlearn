import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { PostContent } from "@/components/posts/post-content"
import { PostActions } from "@/components/posts/post-actions"
import { CommentsSection } from "@/components/posts/comments-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { dbService } from "@/lib/database-service"
import { notFound, redirect } from "next/navigation"
import { validateSlug, sanitizeSlug } from "@/lib/utils"
import { FileX, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PostPage({ params }: PageProps) {
  let slug: string

  try {
    const resolvedParams = await params
    slug = resolvedParams.slug
  } catch (error) {
    console.error("Error resolving params:", error)
    notFound()
  }

  // Handle invalid slugs
  if (!slug || !validateSlug(slug)) {
    const sanitized = sanitizeSlug(slug)
    if (sanitized !== slug && sanitized !== "untitled-post") {
      redirect(`/posts/${sanitized}`)
    }

    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6 text-center">
              <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Invalid Post URL</h3>
              <p className="text-muted-foreground mb-4">The post URL appears to be malformed or invalid.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild variant="outline">
                  <Link href="/posts">
                    <Home className="h-4 w-4 mr-2" />
                    Browse Posts
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/">Go Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  const post = await dbService.getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Navigation */}
        <div className="border-b bg-muted/30">
          <div className="container max-w-4xl py-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/posts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Posts
              </Link>
            </Button>
          </div>
        </div>

        <article className="container max-w-4xl py-8">
          <PostContent post={post} />
          <PostActions post={post} />
          <div id="comments-section">
            <CommentsSection postId={post.id} />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  try {
    const resolvedParams = await params
    const slug = resolvedParams.slug

    if (!validateSlug(slug)) {
      return {
        title: "Invalid Post | Lakambini Learn",
        description: "The requested post URL is invalid or malformed.",
      }
    }

    const post = await dbService.getPostBySlug(slug)

    if (!post) {
      return {
        title: "Post Not Found | Lakambini Learn",
        description: "The requested post could not be found.",
      }
    }

    return {
      title: `${post.title} | Lakambini Learn`,
      description: post.excerpt || post.content.substring(0, 200),
      keywords: `${post.category?.name || "education"}, Grade XI, Lakambini, learning, ${post.title}`,
      authors: [{ name: post.author?.full_name || "Lakambini Learn" }],
      openGraph: {
        title: `${post.title} | Lakambini Learn`,
        description: post.excerpt || post.content.substring(0, 200),
        url: `https://lakambini-learn.vercel.app/posts/${post.slug}`,
        siteName: "Lakambini Learn",
        images: [
          {
            url: post.cover_image_url || "/images/lakambini-logo.png",
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
        type: "article",
        publishedTime: post.created_at,
        modifiedTime: post.updated_at,
        authors: [post.author?.full_name || "Lakambini Learn"],
        section: post.category?.name || "Education",
        tags: [post.category?.name || "education", "Grade XI", "Lakambini"],
      },
      twitter: {
        card: "summary_large_image",
        title: `${post.title} | Lakambini Learn`,
        description: post.excerpt || post.content.substring(0, 200),
        images: [post.cover_image_url || "/images/lakambini-logo.png"],
        creator: `@${post.author?.full_name?.replace(/\s+/g, "").toLowerCase() || "lakambinilearn"}`,
      },
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Error | Lakambini Learn",
      description: "An error occurred while loading this post.",
    }
  }
}
