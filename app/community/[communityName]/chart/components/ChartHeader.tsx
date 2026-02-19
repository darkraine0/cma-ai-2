import React from "react";
import { useRouter } from "next/navigation";
import TypeTabs from "../../../../components/TypeTabs";
import { getCommunityImage } from "../../../../utils/communityImages";
import { RefreshCw } from "lucide-react";
import { cn } from "../../../../utils/utils";

interface ProductLineOption {
  _id: string;
  name: string;
  label: string;
}

interface ChartHeaderProps {
  communityName: string;
  communitySlug: string;
  selectedType: string;
  onTypeChange: (type: string) => void;
  productLines?: ProductLineOption[];
  selectedProductLineId?: string;
  onProductLineChange?: (id: string) => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export default function ChartHeader({
  communityName,
  communitySlug,
  selectedType,
  onTypeChange,
  productLines = [],
  selectedProductLineId = "__all__",
  onProductLineChange,
  onSync,
  isSyncing = false,
}: ChartHeaderProps) {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden h-36 sm:h-40 rounded-t-lg">
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
      <div className="absolute inset-0 p-3 sm:p-4 md:p-6 flex flex-col justify-between">
        {/* Top Row: Title and Action Buttons */}
        <div className="flex items-start justify-between gap-2">
          {/* Title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg md:text-2xl font-bold text-white mb-0.5 sm:mb-1 truncate">
              {communityName} - Price Analysis
            </h2>
            <p className="text-xs sm:text-sm text-white/90 hidden sm:block">
              Price vs Square Footage by Builder
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
            {onSync && (
              <button
                onClick={onSync}
                disabled={isSyncing}
                title={isSyncing ? "Syncing data..." : "Update to date - Re-scrape data"}
                className={`p-1.5 sm:p-2 rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all duration-200 ${
                  isSyncing ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => router.push(`/community/${communitySlug}`)}
              title="Back to Plans"
              className="p-1.5 sm:p-2 rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Row: Type Tabs + Product Line */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <TypeTabs selected={selectedType} onSelect={onTypeChange} />
          {productLines.length > 0 && onProductLineChange && (
            <div className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
              <button
                type="button"
                onClick={() => onProductLineChange("__all__")}
                className={cn(
                  "px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md border transition-all duration-200",
                  "border-white/20",
                  selectedProductLineId === "__all__"
                    ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onProductLineChange("__none__")}
                className={cn(
                  "px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md border transition-all duration-200",
                  "border-white/20",
                  selectedProductLineId === "__none__"
                    ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                None
              </button>
              {productLines.map((seg) => (
                <button
                  key={seg._id}
                  type="button"
                  onClick={() => onProductLineChange(seg._id)}
                  className={cn(
                    "px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md border transition-all duration-200",
                    "border-white/20",
                    selectedProductLineId === seg._id
                      ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  )}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
