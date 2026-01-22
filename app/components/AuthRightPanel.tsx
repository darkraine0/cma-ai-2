"use client"

import PageIndicator from "./PageIndicator"
import TestimonialBox from "./TestimonialBox"

interface AuthRightPanelProps {
  alt?: string
}

export default function AuthRightPanel({ alt = "Authentication" }: AuthRightPanelProps) {
  return (
    <div className="relative bg-muted min-h-[300px] lg:min-h-screen overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/auth/bg.jpg"
        alt={alt}
        className="w-full h-full object-cover animate-fade-in"
      />
      <PageIndicator />
      <TestimonialBox />
    </div>
  )
}
