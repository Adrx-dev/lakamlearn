"use client"

import { cn } from "@/lib/utils"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/layout/header"
import { EnhancedImageUpload } from "@/components/ui/enhanced-image-upload"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { useCenteredToastContext } from "@/components/providers/toast-provider"
import { generateSlug, extractExcerpt } from "@/lib/utils"
import { Save, Eye, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Category } from "@/lib/types"

export default function WritePage() {
  const { user } = useAuth()
  const { toast } = useCenteredToastContext()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [coverImageUrl, setCoverImageUrl] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [slugPreview, setSlugPreview] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    fetchCategories()
  }, [user, router])

  useEffect(() => {
    if (title.trim()) {
      setSlugPreview(generateSlug(title))
    } else {
      setSlugPreview("")
    }
  }, [title])

  useEffect(() => {
    if (content.trim() && !excerpt.trim()) {
      setExcerpt(extractExcerpt(content, 200))
    }
  }, [content, excerpt])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")

      if (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Error",
          description: "Failed to load categories. Please refresh the page.",
          variant: "error",
          duration: 4000,
        })
        return
      }

      if (data) {
        setCategories(data)
      }
    } catch (error) {
      console.error("Unexpected error fetching categories:", error)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = "Title is required"
    } else if (title.length > 200) {
      newErrors.title = "Title must be less than 200 characters"
    }

    if (!content.trim()) {
      newErrors.content = "Content is required"
    } else if (content.length < 50) {
      newErrors.content = "Content must be at least 50 characters"
    }

    if (excerpt && excerpt.length > 500) {
      newErrors.excerpt = "Excerpt must be less than 500 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkSlugExists = async (slug: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from("posts").select("id").eq("slug", slug).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error checking slug:", error)
      }

      return !!data
    } catch (error) {
      console.error("Unexpected error checking slug:", error)
      return false
    }
  }

  const handleSave = async (published = false) => {
    if (!user || !validateForm()) {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to create posts.",
          variant: "warning",
          duration: 4000,
        })
      }
      return
    }

    setLoading(true)
    try {
      let slug = generateSlug(title)

      // Check if slug already exists and modify if needed
      let slugExists = await checkSlugExists(slug)
      let counter = 1
      const originalSlug = slug

      while (slugExists) {
        slug = `${originalSlug}-${counter}`
        slugExists = await checkSlugExists(slug)
        counter++
      }

      const finalExcerpt = excerpt.trim() || extractExcerpt(content, 200)

      const postData = {
        title: title.trim(),
        slug,
        content: content.trim(),
        excerpt: finalExcerpt,
        cover_image_url: coverImageUrl || null,
        author_id: user.id,
        category_id: categoryId || null,
        published,
      }

      const { data, error } = await supabase.from("posts").insert(postData).select().single()

      if (error) {
        console.error("Post creation error:", error)
        throw new Error(error.message || "Failed to create post")
      }

      const selectedCategory = categories.find((cat) => cat.id === categoryId)

      toast({
        title: published ? "Article Published! 🎉" : "Draft Saved! 📝",
        description: published
          ? `Your article "${title}" has been published successfully${
              selectedCategory ? ` in ${selectedCategory.name}` : ""
            }.`
          : `Your draft "${title}" has been saved and can be published later.`,
        variant: "success",
        duration: 4000,
      })

      // Redirect after success
      setTimeout(() => {
        router.push(published ? `/posts/${slug}` : "/dashboard")
      }, 2000)
    } catch (error: any) {
      console.error("Save error:", error)
      toast({
        title: published ? "Publishing Failed" : "Save Failed",
        description: error.message || "Failed to save your article. Please try again.",
        variant: "error",
        duration: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (url: string | null) => {
    setCoverImageUrl(url || "")
  }

  const handleImageError = (error: string) => {
    toast({
      title: "Upload Failed",
      description: error,
      variant: "error",
      duration: 4000,
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Write a New Post</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter your post title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={cn("text-lg", errors.title && "border-destructive")}
                disabled={loading}
                maxLength={200}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              {slugPreview && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">URL Preview:</span> /posts/{slugPreview}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                placeholder="Brief description of your post (auto-generated if left empty)..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                disabled={loading}
                maxLength={500}
                className={errors.excerpt ? "border-destructive" : ""}
              />
              {errors.excerpt && <p className="text-sm text-destructive">{errors.excerpt}</p>}
              <div className="text-xs text-muted-foreground">
                {excerpt.length}/500 characters {!excerpt.trim() && content.trim() && "(will be auto-generated)"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <EnhancedImageUpload
              variant="cover"
              value={coverImageUrl}
              onChange={handleImageUpload}
              onError={handleImageError}
              disabled={loading}
              maxSize={5}
              quality={0.8}
              userId={user.id}
            />

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your post content here... (Markdown supported)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className={cn("font-mono", errors.content && "border-destructive")}
                disabled={loading}
              />
              {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>You can use Markdown formatting in your content.</span>
              </div>
            </div>

            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please fix the errors above before saving your post.</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => router.back()} disabled={loading}>
                Cancel
              </Button>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={loading || !title.trim() || !content.trim()}
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Draft
                </Button>

                <Button
                  onClick={() => handleSave(true)}
                  disabled={loading || !title.trim() || !content.trim()}
                  className="lakambini-gradient text-white"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                  Publish
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
