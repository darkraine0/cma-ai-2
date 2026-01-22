import Image from "next/image"

export default function AuthBrand() {
  return (
    <div className="text-left pl-6 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
      <div className="inline-flex items-center gap-3 text-[18px] font-bold text-gray-600 mb-1">
        <Image 
          src="/logo.jpg" 
          alt="UnionMainHomes Logo" 
          width={0}
          height={0}
          sizes="100vw"
          className="h-[1.125em] w-auto object-contain"
        />
        UnionMainHomes CMA Tool
      </div>
    </div>
  )
}
