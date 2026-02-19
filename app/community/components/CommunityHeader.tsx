import React from "react";
import { useRouter } from "next/navigation";
import TypeTabs from "../../components/TypeTabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { getCommunityImage } from "../../utils/communityImages";
import { cn } from "../../utils/utils";
import { SortKey, SortOrder } from "../types";
import { Community } from "../types";
import { ProductLineOption } from "../hooks/usePlansFilter";
import { RefreshCw } from "lucide-react";

interface CommunityHeaderProps {
  communityName: string;
  communitySlug: string;
  /** When set, title shows as "parentCommunityName [communityName]" (e.g. Cambridge Crossing [Cross Creek Meadows]) */
  parentCommunityName?: string | null;
  childCommunities?: Community[];
  /** Currently selected subcommunity (when user picks from dropdown without navigating) */
  selectedSubcommunity?: Community | null;
  /** Called when user selects a subcommunity from dropdown; pass null for "All" */
  onSubcommunityChange?: (community: Community | null) => void;
  /** Product lines (segments) for this community */
  productLines?: ProductLineOption[];
  selectedProductLineId?: string;
  onProductLineChange?: (id: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  sortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
  sortOrder: SortOrder;
  onSortOrderChange: () => void;
  onExportCSV: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export default function CommunityHeader({
  communityName,
  communitySlug,
  parentCommunityName,
  childCommunities = [],
  selectedSubcommunity = null,
  onSubcommunityChange,
  productLines = [],
  selectedProductLineId = "__all__",
  onProductLineChange,
  selectedType,
  onTypeChange,
  sortKey,
  onSortKeyChange,
  sortOrder,
  onSortOrderChange,
  onExportCSV,
  onSync,
  isSyncing = false,
}: CommunityHeaderProps) {
  const router = useRouter();
  const hasSubcommunities = childCommunities.length > 0;
  // Show "Parent [Subcommunity]" when a subcommunity is selected from dropdown, or when we're on a subcommunity's page
  const displayTitle = selectedSubcommunity
    ? `${communityName} [${selectedSubcommunity.name}]`
    : parentCommunityName
      ? `${parentCommunityName} [${communityName}]`
      : communityName;

  const handleSubcommunitySelect = (value: string) => {
    if (!onSubcommunityChange) return;
    if (value === "__all__" || !value) {
      onSubcommunityChange(null);
      return;
    }
    const child = childCommunities.find((c) => c._id === value || c.name === value);
    if (child) onSubcommunityChange(child);
  };

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
          {/* Community Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-0.5 sm:mb-1 truncate">{displayTitle}</h2>
            <p className="text-xs sm:text-sm text-white/90 hidden sm:block">Home plans and pricing information</p>
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
              onClick={() => router.push(`/community/${communitySlug}/chart?type=${selectedType.toLowerCase()}`)}
              title="View Chart"
              className="p-1.5 sm:p-2 rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <button
              onClick={onExportCSV}
              title="Export CSV"
              className="p-1.5 sm:p-2 rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all duration-200"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Row: Type Tabs + Product line, and Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          {/* Type Tabs + Product line (next to Plan button) */}
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

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
            {hasSubcommunities && (
              <>
                <span className="text-xs sm:text-sm font-medium text-white/90 hidden sm:inline">Subcommunity:</span>
                <Select
                  value={selectedSubcommunity?._id ?? "__all__"}
                  onValueChange={handleSubcommunitySelect}
                >
                  <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] h-8 sm:h-10 text-xs sm:text-sm bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm">
                    <span className={cn(!selectedSubcommunity && "text-white/70")}>
                      {selectedSubcommunity ? selectedSubcommunity.name : "Select subcommunity"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {childCommunities.map((child) => (
                      <SelectItem key={child._id} value={child._id}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <span className="text-xs sm:text-sm font-medium text-white/90 hidden sm:inline">Sort by:</span>
            <div className="relative flex-1 sm:flex-initial">
              <Select value={sortKey} onValueChange={(value) => onSortKeyChange(value as SortKey)}>
                <SelectTrigger className="w-full sm:w-[140px] md:w-[180px] h-8 sm:h-10 text-xs sm:text-sm bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
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
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-all duration-200 flex-shrink-0"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
