import React from "react";
import { useRouter } from "next/navigation";
import TypeTabs from "../../../../components/TypeTabs";
import { getCommunityImage } from "../../../../utils/communityImages";

interface ChartHeaderProps {
  communityName: string;
  communitySlug: string;
  selectedType: string;
  onTypeChange: (type: string) => void;
}

export default function ChartHeader({
  communityName,
  communitySlug,
  selectedType,
  onTypeChange,
}: ChartHeaderProps) {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden h-40 rounded-t-lg">
      {/* Background Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getCommunityImage(communitySlug)}
        alt={communityName}
        className="w-full h-full object-cover"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />

      {/* Content Overlay */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between">
        {/* Top Row: Title and Back Button */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Title */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1">
              {communityName} - Price Analysis
            </h2>
            <p className="text-sm text-white/90">
              Price vs Square Footage by Builder
            </p>
          </div>

          {/* Back Button */}
          <button
            onClick={() => router.push(`/community/${communitySlug}`)}
            title="Back to Plans"
            className="p-2 rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>

        {/* Bottom Row: Type Tabs */}
        <div className="flex justify-start">
          <TypeTabs selected={selectedType} onSelect={onTypeChange} />
        </div>
      </div>
    </div>
  );
}
