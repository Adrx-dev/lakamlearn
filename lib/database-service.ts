import { createClient } from "@/lib/supabase/server"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import type { Post, Category, Comment } from "@/lib/types"

export class DatabaseService {
  private static serverInstance: DatabaseService
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_TTL = 3 * 60 * 1000 // 3 minutes cache

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.serverInstance) {
      DatabaseService.serverInstance = new DatabaseService()
    }
    return DatabaseService.serverInstance
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

    // Keep cache size manageable
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
  }

  async getAllPosts(
    options: {
      limit?: number
      offset?: number
      categoryId?: string
      authorId?: string
    } = {},
  ): Promise<Post[]> {
    try {
      const cacheKey = `posts_${JSON.stringify(options)}`
      const cached = this.getCachedData(cacheKey)
      if (cached) return cached

      const supabase = await createClient()

      let query = supabase
        .from("posts")
        .select(`
          *,
          author:profiles(id, full_name, email, avatar_url),
          category:categories(id, name, slug)
        `)
        .eq("published", true)
        .order("created_at", { ascending: false })

      if (options.categoryId) {
        query = query.eq("category_id", options.categoryId)
      }

      if (options.authorId) {
        query = query.eq("author_id", options.authorId)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data: posts, error } = await query

      if (error) {
        console.error("Error fetching posts:", error)
        return []
      }

      if (!posts || posts.length === 0) {
        return []
      }

      // Get stats efficiently
      const postsWithStats = await this.addStatsToPostsBatch(posts)

      this.setCachedData(cacheKey, postsWithStats)
      return postsWithStats
    } catch (error) {
      console.error("Unexpected error fetching posts:", error)
      return []
    }
  }

  async getPostBySlug(slug: string): Promise<Post | null> {
    try {
      const cacheKey = `post_${slug}`
      const cached = this.getCachedData(cacheKey)
      if (cached) return cached

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
          return null // No data found
        }
        console.error("Error fetching post:", error)
        return null
      }

      if (!post) return null

      // Get stats for this post
      const postWithStats = await this.addStatsToSinglePost(post)

      this.setCachedData(cacheKey, postWithStats)
      return postWithStats
    } catch (error) {
      console.error("Unexpected error fetching post:", error)
      return null
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const cacheKey = "categories"
      const cached = this.getCachedData(cacheKey)
      if (cached) return cached

      const supabase = await createClient()

      const { data: categories, error } = await supabase.from("categories").select("*").order("name")

      if (error) {
        console.error("Error fetching categories:", error)
        return []
      }

      const result = categories || []
      this.setCachedData(cacheKey, result)
      return result
    } catch (error) {
      console.error("Unexpected error fetching categories:", error)
      return []
    }
  }

  async createPost(postData: {
    title: string
    slug: string
    content: string
    excerpt?: string
    cover_image_url?: string
    author_id: string
    category_id?: string
    published: boolean
  }): Promise<{ data: Post | null; error: string | null }> {
    try {
      const supabase = await createClient()

      // Check if slug already exists
      const { data: existingPost } = await supabase.from("posts").select("id").eq("slug", postData.slug).single()

      if (existingPost) {
        return { data: null, error: "A post with this title already exists. Please choose a different title." }
      }

      const { data: post, error } = await supabase
        .from("posts")
        .insert(postData)
        .select(`
          *,
          author:profiles(id, full_name, email, avatar_url),
          category:categories(id, name, slug)
        `)
        .single()

      if (error) {
        console.error("Error creating post:", error)
        return { data: null, error: error.message || "Failed to create post" }
      }

      if (!post) {
        return { data: null, error: "Failed to create post" }
      }

      // Clear cache
      this.clearCache()

      const postWithStats = await this.addStatsToSinglePost(post)
      return { data: postWithStats, error: null }
    } catch (error: any) {
      console.error("Unexpected error creating post:", error)
      return { data: null, error: error.message || "Failed to create post" }
    }
  }

  private async addStatsToPostsBatch(posts: any[]): Promise<Post[]> {
    if (!posts.length) return []

    try {
      const supabase = await createClient()
      const postIds = posts.map((p) => p.id)

      // Get all stats in parallel
      const [likesResult, commentsResult] = await Promise.all([
        supabase.from("likes").select("post_id").in("post_id", postIds),
        supabase.from("comments").select("post_id").in("post_id", postIds),
      ])

      // Count stats
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

  private async addStatsToSinglePost(post: any): Promise<Post> {
    try {
      const supabase = await createClient()

      const [likesResult, commentsResult] = await Promise.all([
        supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
      ])

      return {
        ...post,
        likes_count: likesResult.count || 0,
        comments_count: commentsResult.count || 0,
      }
    } catch (error) {
      console.error("Error adding stats to post:", error)
      return {
        ...post,
        likes_count: 0,
        comments_count: 0,
      }
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}

// Browser client for client-side operations
export class BrowserDatabaseService {
  private supabase = createBrowserClient()

  async toggleLike(postId: string, userId: string): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
    try {
      // Check current like status
      const { data: existingLike } = await this.supabase
        .from("likes")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .single()

      if (existingLike) {
        // Remove like
        const { error } = await this.supabase.from("likes").delete().eq("user_id", userId).eq("post_id", postId)

        return { success: !error, isLiked: false, error: error?.message }
      } else {
        // Add like
        const { error } = await this.supabase.from("likes").insert({ user_id: userId, post_id: postId })

        return { success: !error, isLiked: true, error: error?.message }
      }
    } catch (error: any) {
      return { success: false, isLiked: false, error: error.message }
    }
  }

  async toggleSave(postId: string, userId: string): Promise<{ success: boolean; isSaved: boolean; error?: string }> {
    try {
      // Check current save status
      const { data: existingSave } = await this.supabase
        .from("reading_list")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .single()

      if (existingSave) {
        // Remove from reading list
        const { error } = await this.supabase.from("reading_list").delete().eq("user_id", userId).eq("post_id", postId)

        return { success: !error, isSaved: false, error: error?.message }
      } else {
        // Add to reading list
        const { error } = await this.supabase.from("reading_list").insert({ user_id: userId, post_id: postId })

        return { success: !error, isSaved: true, error: error?.message }
      }
    } catch (error: any) {
      return { success: false, isSaved: false, error: error.message }
    }
  }

  async addComment(
    postId: string,
    userId: string,
    content: string,
    parentId?: string,
  ): Promise<{ success: boolean; comment?: Comment; error?: string }> {
    try {
      const { data: comment, error } = await this.supabase
        .from("comments")
        .insert({
          post_id: postId,
          author_id: userId,
          content: content.trim(),
          parent_id: parentId || null,
        })
        .select(`
          *,
          author:profiles(id, full_name, avatar_url)
        `)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, comment: comment as Comment }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async getComments(postId: string): Promise<Comment[]> {
    try {
      const { data: comments, error } = await this.supabase
        .from("comments")
        .select(`
          *,
          author:profiles(id, full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching comments:", error)
        return []
      }

      return comments || []
    } catch (error) {
      console.error("Unexpected error fetching comments:", error)
      return []
    }
  }
}

export const dbService = DatabaseService.getInstance()
export const browserDb = new BrowserDatabaseService()
