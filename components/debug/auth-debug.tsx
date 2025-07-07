"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export function AuthDebug() {
  const { user, profile, loading } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const supabase = createClient()

  const checkSession = async () => {
    const { data, error } = await supabase.auth.getSession()
    setSessionInfo({ data, error })
    console.log("Session check:", { data, error })
  }

  const testConnection = async () => {
    const { data, error } = await supabase.from("profiles").select("count").single()
    console.log("Database connection test:", { data, error })
  }

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Auth Debug (Dev Only)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p>
            <strong>Loading:</strong> {loading ? "Yes" : "No"}
          </p>
          <p>
            <strong>User:</strong> {user ? user.email : "None"}
          </p>
          <p>
            <strong>Profile:</strong> {profile ? profile.full_name : "None"}
          </p>
          <p>
            <strong>User ID:</strong> {user?.id || "None"}
          </p>
        </div>

        <div className="flex space-x-2">
          <Button onClick={checkSession} size="sm">
            Check Session
          </Button>
          <Button onClick={testConnection} size="sm">
            Test DB
          </Button>
        </div>

        {sessionInfo && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto">{JSON.stringify(sessionInfo, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  )
}
