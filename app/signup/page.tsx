"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Eye, EyeOff } from "lucide-react"
import PageIndicator from "@/app/components/PageIndicator"
import TestimonialBox from "@/app/components/TestimonialBox"

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
            <div className="max-w-[80%] mx-auto w-full">
              {/* Logo/Brand */}
              <div className="text-left pl-6 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
                <div className="inline-flex items-center gap-3 text-[18px] font-bold text-foreground mb-1">
                  <Image 
                    src="/logo.jpg" 
                    alt="UnionMainHomes Logo" 
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="h-[1.125em] w-auto object-contain"
                  />
                  UnionMainHomes CMA Tool
                </div>
              </div>

              {/* Sign Up Card */}
              <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="space-y-2 text-left pb-4">
                <CardTitle className="text-4xl font-bold animate-fade-in-down" style={{ animationDelay: '0.2s' }}>Sign Up</CardTitle>
                <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.3s' }}>Create your account</CardDescription>
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-12 text-base pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                  </div>

                  <div className="space-y-2 animate-fade-in-down" style={{ animationDelay: '0.7s' }}>
                    <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
                      Confirm Password*
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-12 text-base pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
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
          <div className="relative bg-muted min-h-[300px] lg:min-h-screen overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/auth/bg.jpg"
              alt="Sign Up"
              className="w-full h-full object-cover animate-cross-fade"
            />
            <PageIndicator />
            <TestimonialBox />
          </div>
        </div>
      </div>
    </div>
  )
}
