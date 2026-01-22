"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import AuthBrand from "@/app/components/AuthBrand"
import AuthRightPanel from "@/app/components/AuthRightPanel"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Main Panel Container */}
        <div className="relative z-10 w-full h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
            {/* Left Side - Success Message */}
            <div className="flex flex-col justify-center p-8 lg:p-12 bg-white">
              <div className="max-w-[80%] mx-auto w-full">
                {/* Logo/Brand */}
                <AuthBrand />

                {/* Success Card */}
                <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="space-y-2 text-left pb-4">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <CardTitle className="text-4xl font-bold animate-fade-in-down" style={{ animationDelay: '0.3s' }}>Verification Code Sent</CardTitle>
                  <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                    We've sent a verification code to <strong>{email}</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 border border-border animate-fade-in-down" style={{ animationDelay: '0.5s' }}>
                    <p className="text-sm text-muted-foreground text-center">
                      If an account exists with this email, you'll receive a verification code shortly.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Link href={`/reset-password?email=${encodeURIComponent(email)}`} className="animate-fade-in-down" style={{ animationDelay: '0.6s', display: 'block' }}>
                      <Button className="w-full h-12 text-base font-semibold">
                        Continue to Reset Password
                      </Button>
                    </Link>
                    <Link href="/signin" className="animate-fade-in-down" style={{ animationDelay: '0.7s', display: 'block' }}>
                      <Button
                        variant="outline"
                        className="w-full h-12 text-base font-semibold"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Sign In
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>

            {/* Right Side - Image */}
            <AuthRightPanel alt="Password Reset" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Main Panel Container */}
      <div className="relative z-10 w-full h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
          {/* Left Side - Forgot Password Form */}
          <div className="flex flex-col justify-center p-8 lg:p-12 bg-white">
            <div className="max-w-[80%] mx-auto w-full">
              {/* Logo/Brand */}
              <AuthBrand />

              {/* Forgot Password Card */}
              <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="space-y-2 text-left pb-4">
                <CardTitle className="text-4xl font-bold mb-1 animate-fade-in-down" style={{ animationDelay: '0.2s' }}>Forgot Password?</CardTitle>
                <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.3s' }}>
                  Enter your email address and we'll send you instructions to reset your password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5" key="forgot-password-form" autoComplete="off">
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

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold animate-fade-in-down"
                    style={{ animationDelay: '0.5s' }}
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Submit"}
                  </Button>
                </form>

                <div className="mt-6 text-center animate-fade-in-down" style={{ animationDelay: '0.6s' }}>
                  <p className="text-sm text-muted-foreground">
                    Remember Password?{" "}
                    <Link
                      href="/signin"
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Right Side - Image */}
          <AuthRightPanel alt="Forgot Password" />
        </div>
      </div>
    </div>
  )
}
