import { createClient } from "@/lib/supabase/server"
import type { Post } from "@/lib/types"

export class DatabaseService {
  private static instance: DatabaseService
  private supabase: any

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  // Optimized post fetching with caching
  async getPosts(
    options: {
      limit?: number
      offset?: number
      publishedOnly?: boolean
      authorId?: string
      categoryId?: string
    } = {},
  ): Promise<{ data: Post[]; error: any }> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc("get_posts_with_stats", {
        limit_count: options.limit || 10,
        offset_count: options.offset || 0,
        published_only: options.publishedOnly !== false,
        author_filter: options.authorId || null,
        category_filter: options.categoryId || null,
      })

      if (error) {
        console.error("Database error fetching posts:", error)
        return { data: [], error }
      }

      // Transform the data to match our Post type
      const posts: Post[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        content: row.content,
        excerpt: row.excerpt,
        cover_image_url: row.cover_image_url,
        author_id: row.author_id,
        category_id: row.category_id,
        published: row.published,
        created_at: row.created_at,
        updated_at: row.updated_at,
        author: row.author_name
          ? {
              id: row.author_id,
              email: row.author_email,
              full_name: row.author_name,
              avatar_url: row.author_avatar_url,
              bio: "",
              created_at: "",
              updated_at: "",
            }
          : undefined,
        category: row.category_name
          ? {
              id: row.category_id,
              name: row.category_name,
              slug: row.category_slug,
              description: "",
              created_at: "",
            }
          : undefined,
        likes_count: Number(row.likes_count) || 0,
        comments_count: Number(row.comments_count) || 0,
      }))

      return { data: posts, error: null }
    } catch (error) {
      console.error("Unexpected error fetching posts:", error)
      return { data: [], error }
    }
  }

  // Optimized single post fetching
  async getPostBySlug(slug: string): Promise<{ data: Post | null; error: any }> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc("get_post_by_slug", {
        post_slug: slug,
      })

      if (error) {
        console.error("Database error fetching post:", error)
        return { data: null, error }
      }

      if (!data || data.length === 0) {
        return { data: null, error: null }
      }

      const row = data[0]
      const post: Post = {
        id: row.id,
        title: row.title,
        slug: row.slug,
        content: row.content,
        excerpt: row.excerpt,
        cover_image_url: row.cover_image_url,
        author_id: row.author_id,
        category_id: row.category_id,
        published: row.published,
        created_at: row.created_at,
        updated_at: row.updated_at,
        author: {
          id: row.author_id,
          email: row.author_email,
          full_name: row.author_name,
          avatar_url: row.author_avatar_url,
          bio: row.author_bio || "",
          created_at: "",
          updated_at: "",
        },
        category: row.category_name
          ? {
              id: row.category_id,
              name: row.category_name,
              slug: row.category_slug,
              description: "",
              created_at: "",
            }
          : undefined,
        likes_count: Number(row.likes_count) || 0,
        comments_count: Number(row.comments_count) || 0,
      }

      return { data: post, error: null }
    } catch (error) {
      console.error("Unexpected error fetching post:", error)
      return { data: null, error }
    }
  }

  // Batch operations for better performance
  async batchUpdatePostStats(postIds: string[]): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      await supabase.rpc("refresh_post_stats")
    } catch (error) {
      console.error("Error refreshing post stats:", error)
    }
  }

  // Connection health check
  async healthCheck(): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("profiles").select("id").limit(1)
      return !error
    } catch (error) {
      console.error("Database health check failed:", error)
      return false
    }
  }
}

export const db = DatabaseService.getInstance()
