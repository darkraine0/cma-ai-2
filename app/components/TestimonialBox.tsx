"use client"

export default function TestimonialBox() {
  return (
    <div className="absolute bottom-8 left-0 right-0 px-8 z-20">
      <div className="bg-primary text-white rounded-2xl p-6 shadow-lg w-full mx-auto animate-fade-in-down" style={{ animationDelay: '0.5s' }}>
        <p className="text-sm leading-relaxed mb-4 italic">
          "I've never had a smoother real estate experience. Ardiu made buying feel effortless and stress-free."
        </p>
        <div className="flex flex-col">
          <span className="font-semibold text-base">Michael Grant</span>
          <span className="text-sm opacity-90">First-Time Homebuyer</span>
        </div>
      </div>
    </div>
  )
}
