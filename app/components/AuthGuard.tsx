"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Loader from "./Loader"

const publicRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify-email"]

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Get pathname immediately - use window.location as fallback for client-side initial render
  const getCurrentPath = () => {
    if (pathname) return pathname
    if (typeof window !== 'undefined') return window.location.pathname
    return ''
  }
  
  const currentPath = getCurrentPath()
  const isPublicRoute = publicRoutes.includes(currentPath)
  
  // For public routes, immediately show content without any loading state
  if (isPublicRoute) {
    return <>{children}</>
  }
  
  const [isLoading, setIsLoading] = useState(true)
  const [shouldShowContent, setShouldShowContent] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [pathname])

  const checkAuth = async () => {
    // This shouldn't be reached for public routes, but just in case
    if (publicRoutes.includes(pathname || getCurrentPath())) {
      setShouldShowContent(true)
      setIsLoading(false)
      return
    }

    // Admin routes - check admin access separately
    if (pathname.startsWith("/admin")) {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          // Check if user is admin
          if (data.user?.role === "admin") {
            setShouldShowContent(true)
          } else {
            // Not admin, redirect to home
            router.replace("/")
            return
          }
        } else {
          // Not authenticated, redirect to signin
          router.replace("/signin")
          return
        }
      } catch (error) {
        router.replace("/signin")
        return
      } finally {
        setIsLoading(false)
      }
      return
    }

    // For protected routes, check authentication and approval status
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        const user = data.user

        // Check if user is approved (admins are always approved)
        if (user.role === "admin" || user.status === "approved") {
          // Authenticated and approved, show content
          setShouldShowContent(true)
        } else {
          // Not approved, show pending message or redirect
          // For now, redirect to a pending page or show message
          if (user.status === "pending") {
            // User is pending approval
            setShouldShowContent(true) // Allow access but show pending message
          } else {
            // Rejected or other status
            router.replace("/signin?message=account-rejected")
            return
          }
        }
      } else {
        // Not authenticated, redirect to signin
        router.replace("/signin")
        return
      }
    } catch (error) {
      // Error checking auth, redirect to signin
      router.replace("/signin")
      return
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking auth
  if (isLoading || !shouldShowContent) {
    return <Loader />
  }

  // Show the content
  return <>{children}</>
}
