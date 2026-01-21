"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Loader from "./Loader"

const publicRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify-email"]

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const checkingRef = useRef(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // All hooks must be called before any early returns
  // Start with loading false - only show spinner if check takes > 150ms
  const [isLoading, setIsLoading] = useState(false)
  const [shouldShowContent, setShouldShowContent] = useState(false)
  
  // Get pathname immediately - use window.location as fallback for client-side initial render
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
    
    // Skip auth check for public routes
    if (isCurrentRoutePublic) {
      setShouldShowContent(true)
      return
    }
    
    // Prevent duplicate calls
    if (checkingRef.current) return
    
    // Ensure we have a valid pathname before checking
    if (!currentPathname) {
      // Wait for pathname to be available
      return
    }
    
    checkingRef.current = true
    
    // Delay showing loading spinner - only show if check takes more than 150ms
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(true)
    }, 150)
    
    checkAuth().finally(() => {
      checkingRef.current = false
      // Clear the timeout if check completed quickly
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
      setIsLoading(false)
    })
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }
  }, [pathname])

  const checkAuth = async () => {
    const currentPathname = pathname || getCurrentPath()
    
    // This shouldn't be reached for public routes, but just in case
    if (publicRoutes.includes(currentPathname)) {
      setShouldShowContent(true)
      setIsLoading(false)
      return
    }

    // Admin routes - check admin access separately
    if (currentPathname.startsWith("/admin")) {
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

  // For public routes, immediately show content without any loading state
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Show loading only if explicitly loading
  // This prevents showing loader on fast auth checks (< 150ms)
  if (isLoading) {
    return <Loader />
  }

  // Show content once auth is verified
  if (shouldShowContent) {
    return <>{children}</>
  }

  // While checking (but not showing loader yet), show a minimal placeholder
  // This prevents flash of content before auth check completes
  return <div style={{ minHeight: '100vh' }} />
}
