"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import PageIndicator from "./PageIndicator"
import TestimonialBox from "./TestimonialBox"

interface AuthRightPanelProps {
  alt?: string
}

export default function AuthRightPanel({ alt = "Authentication" }: AuthRightPanelProps) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which theme is active
  const currentTheme = mounted ? (theme === "system" ? resolvedTheme : theme) : "light"
  const isDark = currentTheme === "dark"

  return (
    <div className="relative bg-muted min-h-[300px] lg:min-h-screen overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={isDark ? "/auth/bg-dark.avif" : "/auth/bg.jpg"}
        alt={alt}
        className="w-full h-full object-cover animate-fade-in"
      />
      <PageIndicator />
      <TestimonialBox />
    </div>
  )
}
