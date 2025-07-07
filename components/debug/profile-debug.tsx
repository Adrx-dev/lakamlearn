"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export function ProfileDebug() {
  const { user, profile } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const supabase = createClient()

  const testProfileOperations = async () => {
    if (!user) return

    const results: any = {
      user: user,
      profile: profile,
    }

    try {
      // Test profile fetch
      const { data: fetchedProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      results.fetchTest = { data: fetchedProfile, error: fetchError }

      // Test profile update (dry run)
      const { data: updateTest, error: updateError } = await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select()

      results.updateTest = { data: updateTest, error: updateError }

      // Test table permissions
      const { data: permTest, error: permError } = await supabase.rpc("has_table_privilege", {
        table_name: "profiles",
        privilege: "UPDATE",
      })

      results.permissionTest = { data: permTest, error: permError }
    } catch (error) {
      results.error = error
    }

    setDebugInfo(results)
    console.log("Profile Debug Results:", results)
  }

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Profile Debug (Dev Only)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p>
            <strong>User ID:</strong> {user?.id || "None"}
          </p>
          <p>
            <strong>Profile ID:</strong> {profile?.id || "None"}
          </p>
          <p>
            <strong>Profile Name:</strong> {profile?.full_name || "None"}
          </p>
        </div>

        <Button onClick={testProfileOperations} size="sm">
          Test Profile Operations
        </Button>

        {debugInfo && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-64">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}
