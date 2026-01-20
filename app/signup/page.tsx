"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        router.push("/")
      }
    } catch (error) {
      // User is not authenticated
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = "Failed to create account"
        try {
          const data = await response.json()
          errorMessage = data.error || data.message || errorMessage
          // Provide helpful message for database errors
          if (errorMessage.includes("Database connection") || errorMessage.includes("MongoDB")) {
            errorMessage = "Database connection failed. Please ensure MongoDB is running and check your .env.local file."
          }
        } catch {
          errorMessage = `Server error (${response.status}). Please check the console for details.`
        }
        setError(errorMessage)
        setLoading(false)
        return
      }

      let data
      try {
        data = await response.json()
      } catch {
        setError("Failed to parse server response")
        setLoading(false)
        return
      }

      // Successfully signed up - redirect to email verification page
      // The verification code will be in console for now (email service needed)
      router.push("/verify-email?message=check-email")
      router.refresh()
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Request timed out. Please check your database connection and try again.")
      } else {
        setError(err.message || "An error occurred. Please check the console for details.")
        console.error("Signup error:", err)
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Main Panel Container */}
      <div className="relative z-10 w-full h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
          {/* Left Side - Sign Up Form */}
          <div className="flex flex-col justify-center p-8 lg:p-12 bg-white">
            <div className="max-w-md mx-auto w-full">
              {/* Logo/Brand */}
              <div className="text-center mb-8 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
                <Link href="/" className="inline-block text-2xl font-bold text-foreground mb-2 hover:opacity-80 transition-opacity">
                  MarketMap Homes
                </Link>
                <p className="text-muted-foreground font-medium">Create your account</p>
              </div>

              {/* Sign Up Card */}
              <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="space-y-2 text-center pb-4">
                <CardTitle className="text-3xl font-bold animate-fade-in-down" style={{ animationDelay: '0.2s' }}>Sign Up</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2 animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                    <label htmlFor="name" className="text-sm font-semibold text-foreground">
                      Full Name*
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2 animate-fade-in-down" style={{ animationDelay: '0.5s' }}>
                    <label htmlFor="email" className="text-sm font-semibold text-foreground">
                      Email*
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2 animate-fade-in-down" style={{ animationDelay: '0.6s' }}>
                    <label htmlFor="password" className="text-sm font-semibold text-foreground">
                      Password*
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 text-base"
                    />
                    <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                  </div>

                  <div className="space-y-2 animate-fade-in-down" style={{ animationDelay: '0.7s' }}>
                    <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
                      Confirm Password*
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 text-base"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold animate-fade-in-down"
                    style={{ animationDelay: '0.8s' }}
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>

                <div className="mt-6 text-center animate-fade-in-down" style={{ animationDelay: '0.9s' }}>
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      href="/signin"
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Right Side - Image */}
          <div className="relative bg-muted min-h-[300px] lg:min-h-screen">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/auth/bg_image1.png"
              alt="Sign Up"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
