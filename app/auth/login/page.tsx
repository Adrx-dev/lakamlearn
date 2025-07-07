"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { useCenteredToastContext } from "@/components/providers/toast-provider"
import Image from "next/image"
import { AuthDebug } from "@/components/debug/auth-debug"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useCenteredToastContext()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // First, check if the user exists and credentials are valid
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        console.error("Login error:", error)
        setError(error.message)
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "error",
          duration: 4000,
        })
      } else if (data.user) {
        // Check if user profile exists
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

        // Create profile if it doesn't exist
        if (!profile) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: data.user.user_metadata?.full_name || "",
          })
        }

        toast({
          title: "Welcome back! 🎉",
          description: "You have successfully logged in to Lakambini Learn.",
          variant: "success",
          duration: 3000,
        })

        // Redirect after a short delay
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 1000)
      }
    } catch (err: any) {
      console.error("Unexpected login error:", err)
      const errorMessage = "An unexpected error occurred. Please try again."
      setError(errorMessage)
      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "error",
        duration: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Image
              src="/images/lakambini-logo.png"
              alt="Lakambini Learn Logo"
              width={48}
              height={48}
              className="logo-glow rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold lakambini-text-gradient">Lakambini Learn</span>
              <span className="text-xs text-muted-foreground">Grade XI • 2025-2026</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full lakambini-gradient text-white" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/auth/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>

            <div className="text-center">
              <Link href="/auth/forgot-password" className="text-sm text-muted-foreground hover:underline">
                Forgot your password?
              </Link>
            </div>
          </CardFooter>
        </form>

        {/* Debug component - only shows in development */}
        <AuthDebug />
      </Card>
    </div>
  )
}
