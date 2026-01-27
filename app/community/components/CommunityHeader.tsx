import React from "react";
import { useRouter } from "next/navigation";
import TypeTabs from "../../components/TypeTabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { getCommunityImage } from "../../utils/communityImages";
import { SortKey, SortOrder } from "../types";

interface CommunityHeaderProps {
  communityName: string;
  communitySlug: string;
  selectedType: string;
  onTypeChange: (type: string) => void;
  sortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
  sortOrder: SortOrder;
  onSortOrderChange: () => void;
  onExportCSV: () => void;
}

export default function CommunityHeader({
  communityName,
  communitySlug,
  selectedType,
  onTypeChange,
  sortKey,
  onSortKeyChange,
  sortOrder,
  onSortOrderChange,
  onExportCSV,
}: CommunityHeaderProps) {
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
        {/* Top Row: Title and Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Community Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1">{communityName}</h2>
            <p className="text-sm text-white/90">Home plans and pricing information</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/community/${communitySlug}/chart?type=${selectedType.toLowerCase()}`)}
              title="View Chart"
              className="p-2 rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <button
              onClick={onExportCSV}
              title="Export CSV"
              className="p-2 rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Row: Type Tabs and Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Type Tabs */}
          <div className="flex justify-start">
            <TypeTabs selected={selectedType} onSelect={onTypeChange} />
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <span className="text-sm font-medium text-white/90">Sort by:</span>
            <div className="relative z-50">
              <Select value={sortKey} onValueChange={(value) => onSortKeyChange(value as SortKey)}>
                <SelectTrigger className="w-[180px] bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm">
                  <SelectValue placeholder="Select sort option" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="plan_name">Plan Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="sqft">Sq Ft</SelectItem>
                  <SelectItem value="last_updated">Last Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={onSortOrderChange}
              title="Toggle sort order"
              className="px-3 py-2 text-sm font-medium rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
