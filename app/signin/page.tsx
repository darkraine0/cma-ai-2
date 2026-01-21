"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import ErrorMessage from "@/app/components/ErrorMessage"
import PageIndicator from "@/app/components/PageIndicator"
import TestimonialBox from "@/app/components/TestimonialBox"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Ensure fields are empty on mount
    setEmail("")
    setPassword("")
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
    setLoading(true)

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if email verification is required
        if (data.requiresVerification) {
          setError(data.error || "Email verification required")
          // Optionally redirect to verification page
          // router.push("/verify-email")
        } else {
          setError(data.error || "Failed to sign in")
        }
        setLoading(false)
        return
      }

      // Successfully signed in
      router.push("/")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "An error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Main Panel Container */}
      <div className="relative z-10 w-full h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
          {/* Left Side - Sign In Form */}
          <div className="flex flex-col justify-center p-8 lg:p-12 bg-white">
            <div className="max-w-md mx-auto w-full">
              {/* Logo/Brand */}
              <div className="text-left pl-6 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
                <Link href="/" className="inline-block text-2xl font-bold text-foreground mb-2 hover:opacity-80 transition-opacity">
                  MarketMap Homes
                </Link>
              </div>

              {/* Sign In Card */}
              <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="space-y-2 text-left pb-4">
                <CardTitle className="text-3xl font-bold animate-fade-in-down" style={{ animationDelay: '0.2s' }}>Sign In</CardTitle>
                <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.3s' }}>Welcome back</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5" key="signin-form" autoComplete="off">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2 animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                    <label htmlFor="email" className="text-sm font-semibold text-foreground">
                      Email*
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      disabled={loading}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2 animate-fade-in-down" style={{ animationDelay: '0.5s' }}>
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-semibold text-foreground">
                        Password*
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-sm font-semibold text-primary hover:underline transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      className="h-12 text-base"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold animate-fade-in-down"
                    style={{ animationDelay: '0.6s' }}
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="mt-6 text-center animate-fade-in-down" style={{ animationDelay: '0.7s' }}>
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link
                      href="/signup"
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      Sign up
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
              src="/auth/bg_image.png"
              alt="Sign In"
              className="w-full h-full object-cover"
            />
            <PageIndicator />
            <TestimonialBox />
          </div>
        </div>
      </div>
    </div>
  )
}
