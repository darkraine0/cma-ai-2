"use client"

import React, { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import Loader from "@/app/components/Loader"
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import PageIndicator from "@/app/components/PageIndicator"
import TestimonialBox from "@/app/components/TestimonialBox"

function VerifyEmailForm() {
  const [code, setCode] = useState(["", "", "", ""])
  const [status, setStatus] = useState<"input" | "verifying" | "success" | "error">("input")
  const [message, setMessage] = useState("")
  const [isResending, setIsResending] = useState(false)
  const [hasAutoSent, setHasAutoSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const messageParam = searchParams.get("message")
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (messageParam === "check-email") {
      setMessage("Please check your email for the 4-digit verification code.")
    } else {
      setMessage("Please enter the 4-digit verification code sent to your email.")
    }
  }, [messageParam])

  // Automatically send verification code when page loads (if coming from signin)
  useEffect(() => {
    const autoSendCode = async () => {
      // Only auto-send once and only if coming from signin (check-email message)
      if (hasAutoSent || messageParam !== "check-email") return
      
      setHasAutoSent(true)
      setIsResending(true)
      
      try {
        const response = await fetch("/api/auth/resend-verification", {
          method: "POST",
        })

        const data = await response.json()

        if (response.ok) {
          setMessage("Verification code sent! Please check your email.")
        } else {
          // If auto-send fails, don't show error - user can manually resend
          console.error("Auto-send verification code failed:", data.error)
        }
      } catch (error) {
        // If auto-send fails, don't show error - user can manually resend
        console.error("Auto-send verification code error:", error)
      } finally {
        setIsResending(false)
      }
    }

    autoSendCode()
  }, [messageParam, hasAutoSent])

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return
    }

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

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
          verifyEmail(codeString)
        }, 100)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // Note: Paste is handled by handlePaste event, this is just for reference
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData("text")
    const digits = pastedText.replace(/\D/g, "").slice(0, 4).split("")
    const newCode = [...code]
    digits.forEach((digit, i) => {
      if (i < 4) {
        newCode[i] = digit
      }
    })
    setCode(newCode)
    // Focus the last filled input or the last input
    const lastFilledIndex = Math.min(digits.length - 1, 3)
    inputRefs.current[lastFilledIndex]?.focus()
    
    // Auto-verify if all 4 digits were pasted
    if (digits.length === 4) {
      setTimeout(() => {
        verifyEmail(digits.join(""))
      }, 100)
    }
  }

  const verifyEmail = async (codeString?: string) => {
    const finalCode = codeString || code.join("")
    
    if (finalCode.length !== 4) {
      setMessage("Please enter a complete 4-digit code")
      return
    }

    setStatus("verifying")
    setMessage("")

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: finalCode }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message || "Email verified successfully!")
        // Redirect to home after 3 seconds
        setTimeout(() => {
          router.push("/")
        }, 3000)
      } else {
        setStatus("error")
        setMessage(data.error || "Failed to verify email")
        // Clear code on error
        setCode(["", "", "", ""])
        inputRefs.current[0]?.focus()
      }
    } catch (error: any) {
      setStatus("error")
      setMessage("An error occurred while verifying your email")
      // Clear code on error
      setCode(["", "", "", ""])
      inputRefs.current[0]?.focus()
    }
  }

  const resendVerification = async () => {
    setIsResending(true)
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Verification code sent! Please check your email.")
        setCode(["", "", "", ""])
        inputRefs.current[0]?.focus()
      } else {
        setMessage(data.error || "Failed to resend verification code")
      }
    } catch (error) {
      setMessage("An error occurred while resending the code")
    } finally {
      setIsResending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Auto-verification is handled in handleCodeChange, but keep this as fallback
    if (code.join("").length === 4) {
      verifyEmail()
    }
  }

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Main Panel Container */}
      <div className="relative z-10 w-full h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
          {/* Left Side - Verification Form */}
          <div className="flex flex-col justify-center p-8 lg:p-12 bg-white">
            <div className="max-w-[80%] mx-auto w-full">
              <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="space-y-2 text-center pb-4">
                {status === "success" ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 mx-auto animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    </div>
                    <CardTitle className="text-4xl font-bold animate-fade-in-down" style={{ animationDelay: '0.3s' }}>Email Verified!</CardTitle>
                    <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                      {message}
                    </CardDescription>
                  </>
                ) : status === "error" ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 mx-auto animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
                      <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <CardTitle className="text-4xl font-bold animate-fade-in-down" style={{ animationDelay: '0.3s' }}>Verification Failed</CardTitle>
                    <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                      {message}
                    </CardDescription>
                  </>
                ) : (
                  <>
                    <CardTitle className="text-4xl font-bold animate-fade-in-down" style={{ animationDelay: '0.2s' }}>Verify Your Email</CardTitle>
                    <CardDescription className="text-base animate-fade-in-down" style={{ animationDelay: '0.3s' }}>
                      {message || "Please enter the 4-digit verification code sent to your email."}
                    </CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {status === "success" ? (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border animate-fade-in-down" style={{ animationDelay: '0.5s' }}>
                    <p className="text-sm text-muted-foreground text-center">
                      Your account is pending admin approval. You'll be able to access the application once approved.
                    </p>
                  </div>
                ) : status === "error" ? (
                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        setStatus("input")
                        setCode(["", "", "", ""])
                        inputRefs.current[0]?.focus()
                      }}
                      className="w-full h-12 text-base font-semibold animate-fade-in-down"
                      style={{ animationDelay: '0.5s' }}
                    >
                      Try Again
                    </Button>
                    <div className="text-center space-y-2 animate-fade-in-down" style={{ animationDelay: '0.6s' }}>
                      <div>
                        <span className="text-sm text-foreground">
                          Didn't receive code?{" "}
                          <button
                            type="button"
                            onClick={resendVerification}
                            disabled={isResending}
                            className="text-sm font-semibold text-primary hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isResending ? (
                              <span className="inline-flex items-center">
                                <RefreshCw className={`w-4 h-4 mr-1 inline animate-spin`} />
                                Sending...
                              </span>
                            ) : (
                              "Resend Code"
                            )}
                          </button>
                        </span>
                      </div>
                      <div>
                        <Link href="/signin" className="text-sm font-semibold text-primary hover:underline transition-colors">
                          Back to Sign In
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center gap-3 animate-fade-in-down" style={{ animationDelay: '0.5s' }}>
                      {code.map((digit, index) => (
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
                          autoFocus={index === 0}
                        />
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="text-center space-y-2 animate-fade-in-down" style={{ animationDelay: '0.6s' }}>
                        <div>
                          <span className="text-sm text-foreground">
                            Didn't receive code?{" "}
                            <button
                              type="button"
                              onClick={resendVerification}
                              disabled={isResending}
                              className="text-sm font-semibold text-primary hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isResending ? (
                                <span className="inline-flex items-center">
                                  <RefreshCw className={`w-4 h-4 mr-1 inline animate-spin`} />
                                  Sending...
                                </span>
                              ) : (
                                "Resend Code"
                              )}
                            </button>
                          </span>
                        </div>
                        <div>
                          <Link href="/signin" className="text-sm font-semibold text-primary hover:underline transition-colors">
                            Back to Sign In
                          </Link>
                        </div>
                      </div>
                    </div>

                  </form>
                )}
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Right Side - Image */}
          <div className="relative bg-muted min-h-[300px] lg:min-h-screen overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/auth/bg.jpg"
              alt="Verify Email"
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Loader />}>
      <VerifyEmailForm />
    </Suspense>
  )
}
