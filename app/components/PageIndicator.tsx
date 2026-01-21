"use client"

import { usePathname } from "next/navigation"

export default function PageIndicator() {
  const pathname = usePathname()
  
  // Determine active page number
  let activePage = 1
  if (pathname === "/signup") {
    activePage = 2
  } else if (pathname === "/verify-email") {
    activePage = 3
  } else if (pathname === "/forgot-password" || pathname === "/reset-password") {
    activePage = 4
  }
  
  // 4 bars with 3 margins between them
  // Total width = 4 bars + 3 margins
  // Using flexbox with gap for proper spacing
  // Each bar takes equal flex space, gaps are 0.5rem (8px)
  
  return (
    <div className="absolute top-8 left-0 right-0 px-8 z-20">
      <div className="flex gap-2 items-center w-full">
        {[1, 2, 3, 4].map((page) => (
          <div
            key={page}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              page === activePage
                ? "bg-primary"
                : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
