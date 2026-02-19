"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/app/contexts/AuthContext"

const publicRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify-email"]

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser } = useAuth()
  const checkingRef = useRef(false)

  const [shouldShowContent, setShouldShowContent] = useState(false)

  const getCurrentPath = () => {
    if (pathname) return pathname
    if (typeof window !== 'undefined') return window.location.pathname
    return ''
  }

  const currentPath = getCurrentPath()
  const isPublicRoute = publicRoutes.includes(currentPath)

  useEffect(() => {
    const currentPathname = pathname || getCurrentPath()
    const isCurrentRoutePublic = publicRoutes.includes(currentPathname)

    if (isCurrentRoutePublic) {
      setShouldShowContent(true)
      return
    }

    if (checkingRef.current) return
    if (!currentPathname) return

    checkingRef.current = true

    checkAuth().finally(() => {
      checkingRef.current = false
    })
  }, [pathname])

  const checkAuth = async () => {
    const currentPathname = pathname || getCurrentPath()

    if (publicRoutes.includes(currentPathname)) {
      setShouldShowContent(true)
      return
    }

    // Single /me call for all protected routes; result is stored in context for Navbar and pages
    try {
      const response = await fetch("/api/auth/me")
      if (!response.ok) {
        router.replace("/signin")
        return
      }
      const data = await response.json()
      const authUser = data.user
      setUser(authUser)

      if (currentPathname.startsWith("/admin")) {
        if (authUser?.role === "admin") {
          setShouldShowContent(true)
        } else {
          router.replace("/")
        }
        return
      }

      if (authUser.role !== "admin" && !authUser.emailVerified) {
        router.replace("/signin")
        return
      }

      if (authUser.role === "admin" || authUser.status === "approved") {
        setShouldShowContent(true)
      } else if (authUser.status === "pending") {
        setShouldShowContent(true)
      } else {
        router.replace("/signin?message=account-rejected")
      }
    } catch (error) {
      router.replace("/signin")
    }
  }

  // For public routes, immediately show content without any loading state
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Show content once auth is verified
  if (shouldShowContent) {
    return <>{children}</>
  }

  // While checking, show a minimal placeholder (no loading animation)
  // This prevents flash of content before auth check completes
  return <div style={{ minHeight: '100vh' }} />
}
