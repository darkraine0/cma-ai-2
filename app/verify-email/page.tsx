"use client"

import React, { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import Loader from "@/app/components/Loader"
import { Home, Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"

function VerifyEmailForm() {
  const [code, setCode] = useState(["", "", "", ""])
  const [status, setStatus] = useState<"input" | "verifying" | "success" | "error">("input")
  const [message, setMessage] = useState("")
  const [isResending, setIsResending] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const messageParam = searchParams.get("message")
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (messageParam === "check-email") {
      setMessage("Please check your email for the 4-digit verification code. Check the console for the code (in development).")
    } else {
      setMessage("Please enter the 4-digit verification code sent to your email.")
    }
  }, [messageParam])

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Loader />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-foreground mb-2 hover:opacity-80 transition-opacity">
            <Home className="w-8 h-8 text-primary" />
            <span>MarketMap Homes</span>
          </Link>
        </div>

        <Card className="border-2 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-2 text-center pb-4">
            {status === "success" ? (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <CardTitle className="text-3xl font-bold">Email Verified!</CardTitle>
                <CardDescription className="text-base">
                  {message}
                </CardDescription>
              </>
            ) : status === "error" ? (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle className="text-3xl font-bold">Verification Failed</CardTitle>
                <CardDescription className="text-base">
                  {message}
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold">Verify Your Email</CardTitle>
                <CardDescription className="text-base">
                  {message || "Please enter the 4-digit verification code sent to your email."}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "success" ? (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
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
                  className="w-full h-12 text-base font-semibold"
                >
                  Try Again
                </Button>
                <Button
                  onClick={resendVerification}
                  disabled={isResending}
                  variant="outline"
                  className="w-full h-12 text-base font-semibold"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                  {isResending ? "Sending..." : "Resend Code"}
                </Button>
                <Link href="/signin">
                  <Button variant="outline" className="w-full h-12 text-base font-semibold">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-center gap-3">
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
                      className="w-16 h-16 text-center text-2xl font-bold border-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={resendVerification}
                    disabled={isResending}
                    variant="outline"
                    className="w-full h-12 text-base font-semibold"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? "Sending..." : "Resend Code"}
                  </Button>
                  <Link href="/signin">
                    <Button type="button" variant="outline" className="w-full h-12 text-base font-semibold">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    In development mode, check the server console for the verification code.
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
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
