"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export default function PageIndicator() {
  const pathname = usePathname()
  const [prevActivePage, setPrevActivePage] = useState(1)
  
  // Determine active page number
  let activePage = 1
  if (pathname === "/signup") {
    activePage = 2
  } else if (pathname === "/verify-email") {
    activePage = 3
  } else if (pathname === "/forgot-password" || pathname === "/reset-password") {
    activePage = 4
  }
  
  // Track previous active page for animation direction
  useEffect(() => {
    if (activePage !== prevActivePage) {
      setPrevActivePage(activePage)
    }
  }, [activePage, prevActivePage])
  
  return (
    <div className="absolute top-8 left-0 right-0 px-8 z-20">
      <div className="flex gap-2 items-center w-full">
        {[1, 2, 3, 4].map((page) => {
          const isActive = page === activePage
          
          return (
            <div
              key={page}
              className="relative flex-1"
            >
              {/* Background bar */}
              <div
                className={`h-1 rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden ${
                  isActive
                    ? "bg-primary h-1 page-indicator-active"
                    : "bg-white/30"
                }`}
              >
                {/* Shimmer effect on active bar */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                )}
              </div>
                           
              
              {/* Glow effect */}
              {isActive && (
                <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-primary/20 blur-sm animate-pulse-glow" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
