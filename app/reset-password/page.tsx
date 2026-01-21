"use client"

import React, { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { CheckCircle2, AlertCircle } from "lucide-react"
import PageIndicator from "@/app/components/PageIndicator"
import TestimonialBox from "@/app/components/TestimonialBox"

function ResetPasswordForm() {
  const [step, setStep] = useState<"verify" | "reset" | "success">("verify")
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState(["", "", "", ""])
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
  }, [searchParams])

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return
    }

    const newCode = [...verificationCode]
    newCode[index] = value
    setVerificationCode(newCode)

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-verify when all 4 digits are filled
    if (value && index === 3) {
      const codeString = newCode.join("")
      if (codeString.length === 4) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          handleVerifyCode(codeString)
        }, 100)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData("text")
    const digits = pastedText.replace(/\D/g, "").slice(0, 4).split("")
    const newCode = [...verificationCode]
    digits.forEach((digit, i) => {
      if (i < 4) {
        newCode[i] = digit
      }
    })
    setVerificationCode(newCode)
    // Focus the last filled input or the last input
    const lastFilledIndex = Math.min(digits.length - 1, 3)
    inputRefs.current[lastFilledIndex]?.focus()
    
    // Auto-verify if all 4 digits were pasted
    if (digits.length === 4) {
      setTimeout(() => {
        handleVerifyCode(digits.join(""))
      }, 100)
    }
  }

  const handleVerifyCode = async (codeString?: string) => {
    const finalCode = codeString || verificationCode.join("")
    
    if (!email) {
      setError("Email is required")
      return
    }

    if (finalCode.length !== 4) {
      setError("Please enter a complete 4-digit code")
      return
    }

    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/validate-reset-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: finalCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Invalid verification code")
        setLoading(false)
        // Clear code on error
        setVerificationCode(["", "", "", ""])
        inputRefs.current[0]?.focus()
        return
      }

      // Code is valid, proceed to reset password
      setStep("reset")
      setLoading(false)
    } catch (err: any) {
      setError("Failed to verify code")
      setLoading(false)
      // Clear code on error
      setVerificationCode(["", "", "", ""])
      inputRefs.current[0]?.focus()
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: verificationCode.join(""), password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to reset password")
        setLoading(false)
        return
      }

      // Success
      setSuccess(true)
      setStep("success")
      setLoading(false)

      // Redirect to signin after 3 seconds
      setTimeout(() => {
        router.push("/signin")
      }, 3000)
    } catch (err: any) {
      setError(err.message || "An error occurred")
      setLoading(false)
    }
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Main Panel Container */}
        <div className="relative z-10 w-full h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
            {/* Left Side - Success Message */}
            <div className="flex flex-col justify-center p-8 lg:p-12 bg-white">
              <div className="max-w-md mx-auto w-full">
                <div className="text-left pl-6 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
                  <Link href="/" className="inline-block text-2xl font-bold text-foreground mb-2 hover:opacity-80 transition-opacity">
                    MarketMap Homes
                  </Link>
                </div>

                <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="space-y-2 text-left pb-4">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <CardTitle className="text-3xl font-bold animate-fade-in-down" style={{ animationDelay: '0.3s' }}>Password Reset!</CardTitle>
                  <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                    Your password has been successfully reset. Redirecting to sign in...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/signin" className="animate-fade-in-down" style={{ animationDelay: '0.5s', display: 'block' }}>
                    <Button className="w-full h-12 text-base font-semibold">
                      Go to Sign In
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              </div>
            </div>

            {/* Right Side - Image */}
            <div className="relative bg-muted min-h-[300px] lg:min-h-screen">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/auth/bg_image2.png"
                alt="Password Reset Success"
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

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Main Panel Container */}
        <div className="relative z-10 w-full h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
            {/* Left Side - Verification Code Form */}
            <div className="flex flex-col justify-center p-8 lg:p-12 bg-white">
              <div className="max-w-md mx-auto w-full">
                <div className="text-left pl-6 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
                  <Link href="/" className="inline-block text-2xl font-bold text-foreground mb-2 hover:opacity-80 transition-opacity">
                    MarketMap Homes
                  </Link>
                </div>

                <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="space-y-2 text-left pb-4">
                  <CardTitle className="text-3xl font-bold animate-fade-in-down" style={{ animationDelay: '0.3s' }}>Enter Verification Code</CardTitle>
                  <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                    Verify your code
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode(); }} className="space-y-5">
                    {error && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in-down" style={{ animationDelay: '0.5s' }}>
                        <p className="text-sm text-destructive font-medium">{error}</p>
                      </div>
                    )}

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
                      <label className="text-sm font-semibold text-foreground block text-center">
                        Verification Code
                      </label>
                      <div className="flex justify-center gap-3">
                        {verificationCode.map((digit, index) => (
                          <Input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleCodeChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            placeholder="-"
                            className="w-16 h-16 rounded-full text-center text-2xl font-bold border focus:border-primary focus:ring-2 focus:ring-primary/20"
                            autoFocus={index === 0 && !email}
                            disabled={loading}
                          />
                        ))}
                      </div>
                    </div>

                    {loading && (
                      <div className="text-center animate-fade-in-down" style={{ animationDelay: '0.7s' }}>
                        <p className="text-sm text-muted-foreground">Verifying...</p>
                      </div>
                    )}
                  </form>

                  <div className="mt-6 text-center animate-fade-in-down" style={{ animationDelay: '0.9s' }}>
                    <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
                      Resend verification code
                    </Link>
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>

            {/* Right Side - Image */}
            <div className="relative bg-muted min-h-[300px] lg:min-h-screen">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/auth/bg_image2.png"
                alt="Reset Password"
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

  // Step: reset password
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Main Panel Container */}
      <div className="relative z-10 w-full h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
          {/* Left Side - Reset Password Form */}
          <div className="flex flex-col justify-center p-8 lg:p-12 bg-white">
            <div className="max-w-md mx-auto w-full">
              <div className="text-left pl-6 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
                <Link href="/" className="inline-block text-2xl font-bold text-foreground mb-2 hover:opacity-80 transition-opacity">
                  MarketMap Homes
                </Link>
              </div>

              <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="space-y-2 text-left pb-4">
                <CardTitle className="text-3xl font-bold animate-fade-in-down" style={{ animationDelay: '0.2s' }}>Reset Password</CardTitle>
                <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                  Must be at least 6 characters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-5">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in-down" style={{ animationDelay: '0.5s' }}>
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2 animate-fade-in-down" style={{ animationDelay: '0.5s' }}>
                    <label htmlFor="password" className="text-sm font-semibold text-foreground">
                      New Password*
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
                  </div>

                  <div className="space-y-2 animate-fade-in-down" style={{ animationDelay: '0.6s' }}>
                    <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
                      Confirm New Password*
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
                    style={{ animationDelay: '0.7s' }}
                    disabled={loading}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Right Side - Image */}
          <div className="relative bg-muted min-h-[300px] lg:min-h-screen">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/auth/bg_image.png"
              alt="Reset Password"
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
