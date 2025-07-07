"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { useCenteredToastContext } from "@/components/providers/toast-provider"
import { Settings, Bell, Shield, Globe, Palette } from "lucide-react"
import type { UserPreferences } from "@/lib/types"

export default function SettingsPage() {
  const { user } = useAuth()
  const { toast } = useCenteredToastContext()
  const router = useRouter()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState("")
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    fetchPreferences()
  }, [user, router])

  const fetchPreferences = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).single()

      if (error && error.code !== "PGRST116") {
        console.error("Preferences fetch error:", error)
      }

      if (data) {
        setPreferences(data)
      } else {
        // Create default preferences
        await createDefaultPreferences()
      }
    } catch (error) {
      console.error("Preferences fetch error:", error)
      await createDefaultPreferences()
    } finally {
      setInitialLoading(false)
    }
  }

  const createDefaultPreferences = async () => {
    if (!user) return

    try {
      const defaultPrefs = {
        user_id: user.id,
        theme: "system" as const,
        email_notifications: true,
        push_notifications: true,
        newsletter_subscription: true,
        privacy_profile_public: true,
        privacy_show_email: false,
        language: "en" as const,
        timezone: "Asia/Manila",
      }

      const { data, error } = await supabase.from("user_preferences").insert(defaultPrefs).select().single()

      if (error) {
        console.error("Default preferences creation error:", error)
      } else if (data) {
        setPreferences(data)
      }
    } catch (error) {
      console.error("Default preferences creation error:", error)
    }
  }

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user || !preferences) return

    setLoading(true)
    setError("")

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      if (data) {
        setPreferences(data)
        toast({
          title: "Settings Updated! ⚙️",
          description: "Your preferences have been saved successfully.",
          variant: "success",
          duration: 3000,
        })
      }
    } catch (error: any) {
      console.error("Preferences update error:", error)
      const errorMessage = error.message || "Failed to update preferences."
      setError(errorMessage)
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "error",
        duration: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchChange = (key: keyof UserPreferences, value: boolean) => {
    if (preferences) {
      const updatedPrefs = { ...preferences, [key]: value }
      setPreferences(updatedPrefs)
      updatePreferences({ [key]: value })
    }
  }

  const handleSelectChange = (key: keyof UserPreferences, value: string) => {
    if (preferences) {
      const updatedPrefs = { ...preferences, [key]: value }
      setPreferences(updatedPrefs)
      updatePreferences({ [key]: value })
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
            <p className="text-muted-foreground">Loading settings...</p>
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
        <div className="container max-w-4xl py-8">
          <div className="flex items-center space-x-3 mb-8">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your account preferences and privacy settings</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Appearance</span>
                </CardTitle>
                <CardDescription>Customize how Lakambini Learn looks and feels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                  </div>
                  <Select
                    value={preferences?.theme || "system"}
                    onValueChange={(value) => handleSelectChange("theme", value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Language</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred language</p>
                  </div>
                  <Select
                    value={preferences?.language || "en"}
                    onValueChange={(value) => handleSelectChange("language", value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fil">Filipino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notifications</span>
                </CardTitle>
                <CardDescription>Control how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={preferences?.email_notifications || false}
                    onCheckedChange={(checked) => handleSwitchChange("email_notifications", checked)}
                    disabled={loading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                  </div>
                  <Switch
                    checked={preferences?.push_notifications || false}
                    onCheckedChange={(checked) => handleSwitchChange("push_notifications", checked)}
                    disabled={loading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Newsletter Subscription</Label>
                    <p className="text-sm text-muted-foreground">Receive our weekly newsletter</p>
                  </div>
                  <Switch
                    checked={preferences?.newsletter_subscription || false}
                    onCheckedChange={(checked) => handleSwitchChange("newsletter_subscription", checked)}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Privacy</span>
                </CardTitle>
                <CardDescription>Manage your privacy and visibility settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Public Profile</Label>
                    <p className="text-sm text-muted-foreground">Make your profile visible to other users</p>
                  </div>
                  <Switch
                    checked={preferences?.privacy_profile_public || false}
                    onCheckedChange={(checked) => handleSwitchChange("privacy_profile_public", checked)}
                    disabled={loading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Email Address</Label>
                    <p className="text-sm text-muted-foreground">Display your email on your public profile</p>
                  </div>
                  <Switch
                    checked={preferences?.privacy_show_email || false}
                    onCheckedChange={(checked) => handleSwitchChange("privacy_show_email", checked)}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Regional Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Regional</span>
                </CardTitle>
                <CardDescription>Set your location and timezone preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Timezone</Label>
                    <p className="text-sm text-muted-foreground">Your local timezone for date and time display</p>
                  </div>
                  <Select
                    value={preferences?.timezone || "Asia/Manila"}
                    onValueChange={(value) => handleSelectChange("timezone", value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Manila">Asia/Manila (GMT+8)</SelectItem>
                      <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible and destructive actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-destructive">Delete Account</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button variant="destructive" disabled>
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
