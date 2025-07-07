"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImageUpload } from "@/components/ui/image-upload"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { useCenteredToastContext } from "@/components/providers/toast-provider"
import { storageManager } from "@/lib/storage"
import { Save, User } from "lucide-react"
import { ProfileDebug } from "@/components/debug/profile-debug"
import type { Profile } from "@/lib/types"

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth()
  const { toast } = useCenteredToastContext()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [initialLoading, setInitialLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    fetchProfile()
  }, [user, router])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error && error.code !== "PGRST116") {
        console.error("Profile fetch error:", error)
        if (error.code === "PGRST116") {
          await createInitialProfile()
        }
      } else if (profile) {
        setProfile(profile)
        setFullName(profile.full_name || "")
        setBio(profile.bio || "")
        setAvatarUrl(profile.avatar_url || "")
      } else {
        await createInitialProfile()
      }
    } catch (error) {
      console.error("Profile fetch error:", error)
      await createInitialProfile()
    } finally {
      setInitialLoading(false)
    }
  }

  const createInitialProfile = async () => {
    if (!user) return

    try {
      const newProfile = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || "",
        bio: "",
        avatar_url: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("profiles").insert(newProfile).select().single()

      if (error) {
        console.error("Profile creation error:", error)
        toast({
          title: "Profile Creation Failed",
          description: "Could not create your profile. Please try refreshing the page.",
          variant: "error",
          duration: 4000,
        })
      } else if (data) {
        setProfile(data)
        setFullName(data.full_name || "")
        setBio(data.bio || "")
        setAvatarUrl(data.avatar_url || "")

        toast({
          title: "Profile Created",
          description: "Your profile has been created. You can now edit your information.",
          variant: "success",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("Profile creation error:", error)
    }
  }

  const handleAvatarChange = (file: File | null, previewUrl: string) => {
    setAvatarFile(file)
    setAvatarUrl(previewUrl)

    if (file) {
      toast({
        title: "Avatar Selected",
        description: "Profile picture ready for upload.",
        variant: "info",
        duration: 2000,
      })
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!fullName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name.",
        variant: "warning",
        duration: 3000,
      })
      return
    }

    setLoading(true)
    setError("")

    try {
      let finalAvatarUrl = profile?.avatar_url

      // Upload new avatar if selected
      if (avatarFile) {
        setUploading(true)
        try {
          finalAvatarUrl = await storageManager.uploadAvatar(avatarFile, user.id)
          setUploading(false)

          if (!finalAvatarUrl) {
            throw new Error("Failed to upload avatar")
          }

          toast({
            title: "Avatar Uploaded",
            description: "Profile picture uploaded successfully.",
            variant: "success",
            duration: 2000,
          })
        } catch (uploadError: any) {
          setUploading(false)
          toast({
            title: "Upload Failed",
            description: uploadError.message || "Failed to upload avatar image.",
            variant: "error",
            duration: 4000,
          })
          setLoading(false)
          return
        }
      }

      const updateData = {
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      }

      console.log("Updating profile with data:", updateData)

      const { data, error } = await supabase.from("profiles").update(updateData).eq("id", user.id).select().single()

      if (error) {
        console.error("Profile update error:", error)
        throw error
      }

      console.log("Profile updated successfully:", data)

      toast({
        title: "Profile Updated! ✨",
        description: "Your profile information has been saved successfully.",
        variant: "success",
        duration: 3000,
      })

      // Update local state
      if (data) {
        setProfile(data)
        setFullName(data.full_name || "")
        setBio(data.bio || "")
        setAvatarUrl(data.avatar_url || "")
      }

      // Refresh the auth context
      await refreshProfile()
      setAvatarFile(null)
    } catch (error: any) {
      console.error("Profile save error:", error)
      const errorMessage = error.message || "Failed to update profile."
      setError(errorMessage)
      toast({
        title: "Update Failed",
        description: errorMessage,
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

  if (initialLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container max-w-2xl py-8">
          <div className="flex items-center space-x-3 mb-8">
            <User className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Edit Profile</h1>
              <p className="text-muted-foreground">Update your personal information</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>

            <form onSubmit={handleSave}>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Avatar Section */}
                <ImageUpload
                  variant="avatar"
                  value={avatarUrl}
                  onChange={handleAvatarChange}
                  disabled={loading || uploading}
                  fallback={fullName || user.email || "L"}
                  maxSize={5}
                />

                {/* Form Fields */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={500}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">{bio.length}/500 characters</p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                    Cancel
                  </Button>

                  <Button type="submit" disabled={loading || uploading} className="lakambini-gradient text-white">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Saving..." : uploading ? "Uploading..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          {/* Debug component - only shows in development */}
          <ProfileDebug />
        </div>
      </main>

      <Footer />
    </div>
  )
}
