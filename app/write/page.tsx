"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/layout/header"
import { ImageUpload } from "@/components/ui/image-upload"
import { useAuth } from "@/components/providers/auth-provider"
import { useCenteredToastContext } from "@/components/providers/toast-provider"
import { dbService } from "@/lib/database-service"
import { generateSlug, extractExcerpt, cn } from "@/lib/utils"
import { Save, Eye, AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Category } from "@/lib/types"

export default function WritePage() {
  const { user } = useAuth()
  const { toast } = useCenteredToastContext()
  const router = useRouter()

  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [coverImageUrl, setCoverImageUrl] = useState("")

  // UI state
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [slugPreview, setSlugPreview] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [wordCount, setWordCount] = useState(0)

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    loadCategories()
  }, [user, router])

  // Update slug preview when title changes
  useEffect(() => {
    if (title.trim()) {
      setSlugPreview(generateSlug(title))
    } else {
      setSlugPreview("")
    }
  }, [title])

  // Auto-generate excerpt and count words
  useEffect(() => {
    if (content.trim()) {
      const words = content.trim().split(/\s+/).length
      setWordCount(words)

      if (!excerpt.trim()) {
        setExcerpt(extractExcerpt(content, 200))
      }
    } else {
      setWordCount(0)
    }
  }, [content, excerpt])

  const loadCategories = async () => {
    try {
      const categoriesData = await dbService.getCategories()
      setCategories(categoriesData)
    } catch (error) {
      console.error("Error loading categories:", error)
      toast({
        title: "Error",
        description: "Failed to load categories. Please refresh the page.",
        variant: "error",
        duration: 4000,
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Title validation
    if (!title.trim()) {
      newErrors.title = "Title is required"
    } else if (title.length > 200) {
      newErrors.title = "Title must be less than 200 characters"
    }

    // Content validation
    if (!content.trim()) {
      newErrors.content = "Content is required"
    } else if (content.length < 100) {
      newErrors.content = "Content must be at least 100 characters"
    }

    // Excerpt validation
    if (excerpt && excerpt.length > 500) {
      newErrors.excerpt = "Excerpt must be less than 500 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
      const slug = generateSlug(title)
      const finalExcerpt = excerpt.trim() || extractExcerpt(content, 200)

      const postData = {
        title: title.trim(),
        slug,
        content: content.trim(),
        excerpt: finalExcerpt,
        cover_image_url: coverImageUrl || undefined,
        author_id: user.id,
        category_id: categoryId || undefined,
        published,
      }

      const result = await dbService.createPost(postData)

      if (result.error) {
        throw new Error(result.error)
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
        if (published && result.data) {
          router.push(`/posts/${result.data.slug}`)
        } else {
          router.push("/dashboard")
        }
      }, 1500)
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

  // Show loading if user is not loaded yet
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
        {/* Navigation */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Write a New Article
              <div className="text-sm font-normal text-muted-foreground">{wordCount} words</div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter your article title..."
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
              <div className="text-xs text-muted-foreground">{title.length}/200 characters</div>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                placeholder="Brief description of your article (auto-generated if left empty)..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                disabled={loading}
                maxLength={500}
                className={errors.excerpt ? "border-destructive" : ""}
              />
              {errors.excerpt && <p className="text-sm text-destructive">{errors.excerpt}</p>}
              <div className="text-xs text-muted-foreground">
                {excerpt.length}/500 characters
                {!excerpt.trim() && content.trim() && " (will be auto-generated)"}
              </div>
            </div>

            {/* Category */}
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

            {/* Cover Image */}
            <ImageUpload
              variant="cover"
              value={coverImageUrl}
              onChange={handleImageUpload}
              onError={handleImageError}
              disabled={loading}
              userId={user.id}
            />

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your article content here... (Markdown supported)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className={cn("font-mono text-sm", errors.content && "border-destructive")}
                disabled={loading}
              />
              {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>You can use Markdown formatting in your content.</span>
                </div>
                <span>{wordCount} words</span>
              </div>
            </div>

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please fix the errors above before saving your article.</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
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
                  Publish Article
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
