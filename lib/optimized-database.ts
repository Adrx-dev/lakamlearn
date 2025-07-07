import { createClient } from "@/lib/supabase/server"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import type { Post } from "@/lib/types"

// Lightweight database service with minimal resource usage
export class OptimizedDatabaseService {
  private static instance: OptimizedDatabaseService
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  private constructor() {}

  public static getInstance(): OptimizedDatabaseService {
    if (!OptimizedDatabaseService.instance) {
      OptimizedDatabaseService.instance = new OptimizedDatabaseService()
    }
    return OptimizedDatabaseService.instance
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })

    // Simple cache cleanup - keep only last 50 items
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  // Optimized post fetching with minimal queries
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
      const cacheKey = `posts_${JSON.stringify(options)}`
      const cached = this.getCachedData(cacheKey)
      if (cached) {
        return { data: cached, error: null }
      }

      const supabase = await createClient()

      let query = supabase.from("posts").select(`
          *,
          author:profiles(id, full_name, email, avatar_url),
          category:categories(id, name, slug)
        `)

      if (options.publishedOnly !== false) {
        query = query.eq("published", true)
      }

      if (options.authorId) {
        query = query.eq("author_id", options.authorId)
      }

      if (options.categoryId) {
        query = query.eq("category_id", options.categoryId)
      }

      query = query.order("created_at", { ascending: false }).limit(options.limit || 10)

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data: posts, error } = await query

      if (error) {
        console.error("Database error fetching posts:", error)
        return { data: [], error }
      }

      // Get stats in batch for better performance
      const postsWithStats = await this.addStatsToPostsBatch(posts || [])

      this.setCachedData(cacheKey, postsWithStats)
      return { data: postsWithStats, error: null }
    } catch (error) {
      console.error("Unexpected error fetching posts:", error)
      return { data: [], error }
    }
  }

  // Batch stats fetching for better performance
  private async addStatsToPostsBatch(posts: any[]): Promise<Post[]> {
    if (!posts.length) return []

    try {
      const supabase = await createClient()
      const postIds = posts.map((p) => p.id)

      // Get all likes and comments in two queries instead of N queries
      const [likesResult, commentsResult] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("comments").select("post_id").in("post_id", postIds),
      ])

      // Count stats efficiently
      const likeCounts = new Map<string, number>()
      const commentCounts = new Map<string, number>()

      if (likesResult.data) {
        likesResult.data.forEach((like) => {
          likeCounts.set(like.post_id, (likeCounts.get(like.post_id) || 0) + 1)
        })
      }

      if (commentsResult.data) {
        commentsResult.data.forEach((comment) => {
          commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) || 0) + 1)
        })
      }

      // Transform posts with stats
      return posts.map((post) => ({
        ...post,
        likes_count: likeCounts.get(post.id) || 0,
        comments_count: commentCounts.get(post.id) || 0,
      }))
    } catch (error) {
      console.error("Error adding stats to posts:", error)
      return posts.map((post) => ({
        ...post,
        likes_count: 0,
        comments_count: 0,
      }))
    }
  }

  // Optimized single post fetching
  async getPostBySlug(slug: string): Promise<{ data: Post | null; error: any }> {
    try {
      const cacheKey = `post_${slug}`
      const cached = this.getCachedData(cacheKey)
      if (cached) {
        return { data: cached, error: null }
      }

      const supabase = await createClient()

      const { data: post, error } = await supabase
        .from("posts")
        .select(`
          *,
          author:profiles(id, full_name, email, avatar_url, bio),
          category:categories(id, name, slug, description)
        `)
        .eq("slug", slug)
        .eq("published", true)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          return { data: null, error: null }
        }
        console.error("Database error fetching post:", error)
        return { data: null, error }
      }

      if (!post) {
        return { data: null, error: null }
      }

      // Get stats for single post
      const [likesResult, commentsResult] = await Promise.all([
        supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
      ])

      const postWithStats = {
        ...post,
        likes_count: likesResult.count || 0,
        comments_count: commentsResult.count || 0,
      }

      this.setCachedData(cacheKey, postWithStats)
      return { data: postWithStats, error: null }
    } catch (error) {
      console.error("Unexpected error fetching post:", error)
      return { data: null, error }
    }
  }

  // Clear cache when needed
  clearCache(): void {
    this.cache.clear()
  }

  // Health check with minimal resource usage
  async healthCheck(): Promise<boolean> {
    try {
      const supabase = await createClient()
      const { error } = await supabase.from("profiles").select("id").limit(1).single()
      return error?.code === "PGRST116" || !error // No data or success is OK
    } catch (error) {
      return false
    }
  }
}

// Browser client for client-side operations
export class BrowserDatabaseService {
  private supabase = createBrowserClient()

  async toggleLike(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if already liked
      const { data: existingLike } = await this.supabase
        .from("likes")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .single()

      if (existingLike) {
        // Remove like
        const { error } = await this.supabase.from("likes").delete().eq("user_id", userId).eq("post_id", postId)

        return { success: !error, error: error?.message }
      } else {
        // Add like
        const { error } = await this.supabase.from("likes").insert({ user_id: userId, post_id: postId })

        return { success: !error, error: error?.message }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async toggleSave(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if already saved
      const { data: existingSave } = await this.supabase
        .from("reading_list")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .single()

      if (existingSave) {
        // Remove from reading list
        const { error } = await this.supabase.from("reading_list").delete().eq("user_id", userId).eq("post_id", postId)

        return { success: !error, error: error?.message }
      } else {
        // Add to reading list
        const { error } = await this.supabase.from("reading_list").insert({ user_id: userId, post_id: postId })

        return { success: !error, error: error?.message }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const optimizedDb = OptimizedDatabaseService.getInstance()
export const browserDb = new BrowserDatabaseService()
