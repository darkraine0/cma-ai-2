"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import Loader from "@/app/components/Loader"
import { Home, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to send reset email")
        setLoading(false)
        return
      }

      // Success - show success message
      setSuccess(true)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || "An error occurred")
      setLoading(false)
    }
  }

  if (!mounted) {
    return <Loader />
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Main Panel Container */}
        <div className="relative z-10 w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-card rounded-2xl shadow-2xl overflow-hidden border-2 border-border">
            {/* Left Side - Success Message */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              {/* Logo/Brand */}
              <div className="text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-foreground mb-2 hover:opacity-80 transition-opacity">
                  <Home className="w-8 h-8 text-primary" />
                  <span>MarketMap Homes</span>
                </Link>
              </div>

              {/* Success Card */}
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="space-y-2 text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <CardTitle className="text-3xl font-bold">Check your email</CardTitle>
                  <CardDescription className="text-base">
                    We've sent password reset instructions to <strong>{email}</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground text-center">
                      If an account exists with this email, you'll receive password reset instructions shortly.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Link href="/signin">
                      <Button
                        variant="outline"
                        className="w-full h-12 text-base font-semibold"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Sign In
                      </Button>
                    </Link>
                    <Button
                      onClick={() => {
                        setSuccess(false)
                        setEmail("")
                      }}
                      className="w-full h-12 text-base font-semibold"
                    >
                      Send another email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Image */}
            <div className="relative bg-muted min-h-[300px] lg:min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/auth/bg_image2.png"
                alt="Password Reset"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Panel Container */}
      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-card rounded-2xl shadow-2xl overflow-hidden border-2 border-border">
          {/* Left Side - Forgot Password Form */}
          <div className="flex flex-col justify-center p-8 lg:p-12">
            {/* Logo/Brand */}
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-foreground mb-2 hover:opacity-80 transition-opacity">
                <Home className="w-8 h-8 text-primary" />
                <span>MarketMap Homes</span>
              </Link>
              <p className="text-muted-foreground font-medium">Reset your password</p>
            </div>

            {/* Forgot Password Card */}
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="space-y-2 text-center pb-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold">Forgot Password?</CardTitle>
                <CardDescription className="text-base">
                  Enter your email address and we'll send you instructions to reset your password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-foreground">
                      Email Address
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

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/signin"
                    className="inline-flex items-center text-sm font-semibold text-primary hover:underline transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Image */}
          <div className="relative bg-muted min-h-[300px] lg:min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/auth/bg_image2.png"
              alt="Forgot Password"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
