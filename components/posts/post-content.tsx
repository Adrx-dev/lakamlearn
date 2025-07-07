import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { Calendar, Clock, User } from "lucide-react"
import Link from "next/link"
import type { Post } from "@/lib/types"

interface PostContentProps {
  post: Post
}

export function PostContent({ post }: PostContentProps) {
  const formatContent = (content: string) => {
    return content.split("\n").map((paragraph, index) => {
      if (paragraph.trim() === "") {
        return <div key={index} className="h-4" />
      }

      // Simple markdown-like formatting
      const formattedParagraph = paragraph
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code class='bg-muted px-1 py-0.5 rounded text-sm font-mono'>$1</code>")

      if (paragraph.startsWith("# ")) {
        return (
          <h1 key={index} className="text-3xl font-bold mt-8 mb-4 text-foreground">
            {paragraph.substring(2)}
          </h1>
        )
      } else if (paragraph.startsWith("## ")) {
        return (
          <h2 key={index} className="text-2xl font-bold mt-6 mb-3 text-foreground">
            {paragraph.substring(3)}
          </h2>
        )
      } else if (paragraph.startsWith("### ")) {
        return (
          <h3 key={index} className="text-xl font-bold mt-4 mb-2 text-foreground">
            {paragraph.substring(4)}
          </h3>
        )
      } else if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
        return (
          <div key={index} className="flex items-start mb-2">
            <span className="text-primary mr-2 mt-2">•</span>
            <span dangerouslySetInnerHTML={{ __html: formattedParagraph.substring(2) }} />
          </div>
        )
      } else if (paragraph.startsWith("> ")) {
        return (
          <blockquote
            key={index}
            className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r"
          >
            <span dangerouslySetInnerHTML={{ __html: formattedParagraph.substring(2) }} />
          </blockquote>
        )
      } else {
        return (
          <p
            key={index}
            className="mb-4 leading-relaxed text-foreground"
            dangerouslySetInnerHTML={{ __html: formattedParagraph }}
          />
        )
      }
    })
  }

  const readingTime = Math.ceil(post.content.split(" ").length / 200)

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {post.category && (
            <Badge variant="secondary" className="text-sm">
              <Link href={`/categories/${post.category.slug}`} className="hover:underline">
                {post.category.name}
              </Link>
            </Badge>
          )}
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span>{readingTime} min read</span>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">{post.title}</h1>

        {post.excerpt && (
          <div className="border-l-4 border-primary pl-4 bg-muted/30 py-3 rounded-r">
            <p className="text-lg text-muted-foreground leading-relaxed italic">{post.excerpt}</p>
          </div>
        )}

        <div className="flex items-center justify-between py-4 border-y">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={post.author?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-lakambini-gradient text-white">
                {post.author?.full_name?.charAt(0) || "L"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{post.author?.full_name || "Lakambini Student"}</p>
              <p className="text-sm text-muted-foreground">{post.author?.bio || "Grade XI Student"}</p>
              <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                <span>{post.likes_count || 0} likes</span>
                <span>•</span>
                <span>{post.comments_count || 0} comments</span>
              </div>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="hidden sm:flex bg-transparent">
            <Link href={`/profile/${post.author_id}`}>
              <User className="h-4 w-4 mr-2" />
              View Profile
            </Link>
          </Button>
        </div>
      </header>

      {/* Cover Image */}
      {post.cover_image_url && (
        <div className="aspect-video relative overflow-hidden rounded-lg shadow-lg">
          <Image
            src={post.cover_image_url || "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover"
            priority
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = "none"
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <div className="text-foreground leading-relaxed space-y-4">{formatContent(post.content)}</div>
      </div>

      {/* Tags/Category at bottom */}
      {post.category && (
        <div className="pt-8 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted-foreground">Filed under:</span>
            <Badge variant="outline">
              <Link href={`/categories/${post.category.slug}`} className="hover:underline">
                {post.category.name}
              </Link>
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}
