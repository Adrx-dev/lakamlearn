"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/layout/header"
import { ImageUpload } from "@/components/ui/image-upload"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { useCenteredToastContext } from "@/components/providers/toast-provider"
import { storageManager } from "@/lib/storage"
import { generateSlug, extractExcerpt } from "@/lib/utils"
import { Save, Eye, AlertCircle } from "lucide-react"
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
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [slugPreview, setSlugPreview] = useState("")
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    fetchCategories()
  }, [user, router])

  useEffect(() => {
    // Update slug preview when title changes
    if (title.trim()) {
      setSlugPreview(generateSlug(title))
    } else {
      setSlugPreview("")
    }
  }, [title])

  useEffect(() => {
    // Auto-generate excerpt if not provided
    if (content.trim() && !excerpt.trim()) {
      setExcerpt(extractExcerpt(content, 200))
    }
  }, [content, excerpt])

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name")

    if (data) {
      setCategories(data)
    }
  }

  const handleCoverImageChange = (file: File | null, previewUrl: string) => {
    setCoverImageFile(file)
    setCoverImageUrl(previewUrl)

    if (file) {
      toast({
        title: "Cover Image Selected",
        description: "Cover image ready for upload.",
        variant: "info",
        duration: 2000,
      })
    }
  }

  const checkSlugExists = async (slug: string): Promise<boolean> => {
    const { data } = await supabase.from("posts").select("id").eq("slug", slug).single()
    return !!data
  }

  const handleSave = async (published = false) => {
    if (!user || !title.trim() || !content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both the title and content before saving.",
        variant: "warning",
        duration: 4000,
      })
      return
    }

    setLoading(true)
    try {
      let finalCoverImageUrl = null
      if (coverImageFile) {
        setUploading(true)
        try {
          finalCoverImageUrl = await storageManager.uploadPostImage(coverImageFile, user.id)
          setUploading(false)

          if (!finalCoverImageUrl) {
            throw new Error("Failed to upload cover image")
          }

          toast({
            title: "Image Uploaded",
            description: "Cover image uploaded successfully.",
            variant: "success",
            duration: 2000,
          })
        } catch (uploadError: any) {
          setUploading(false)
          toast({
            title: "Upload Failed",
            description: uploadError.message || "Failed to upload cover image.",
            variant: "error",
            duration: 4000,
          })
          setLoading(false)
          return
        }
      }

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

      const { data, error } = await supabase
        .from("posts")
        .insert({
          title: title.trim(),
          slug,
          content: content.trim(),
          excerpt: finalExcerpt,
          cover_image_url: finalCoverImageUrl,
          author_id: user.id,
          category_id: categoryId || null,
          published,
        })
        .select()
        .single()

      if (error) {
        throw error
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

      // Small delay to show the success message
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
      setUploading(false)
    }
  }

  if (!user) {
    return null
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
                className="text-lg"
                disabled={loading}
              />
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
                maxLength={300}
              />
              <div className="text-xs text-muted-foreground">
                {excerpt.length}/300 characters {!excerpt.trim() && content.trim() && "(will be auto-generated)"}
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

            <ImageUpload
              variant="cover"
              value={coverImageUrl}
              onChange={handleCoverImageChange}
              disabled={loading || uploading}
              maxSize={5}
            />

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your post content here... (Markdown supported)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="font-mono"
                disabled={loading}
              />
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>You can use Markdown formatting in your content.</span>
              </div>
            </div>

            {(!title.trim() || !content.trim()) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please fill in the title and content before saving your post.</AlertDescription>
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
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>

                <Button
                  onClick={() => handleSave(true)}
                  disabled={loading || !title.trim() || !content.trim()}
                  className="lakambini-gradient text-white"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Publish"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
