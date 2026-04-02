"use client"

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import AddCommunityModal from "../components/AddCommunityModal";
import EditCommunityModal from "../components/EditCommunityModal";
import type { EditCommunityModalCommunity } from "../components/EditCommunityModal";
import { Search, RefreshCw, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import API_URL from '../config';
import { getCompanyColor } from '../utils/colors';
import { getCommunityCardImage } from '../utils/communityImages';
import { communityNameToSlug } from '../community/utils/formatCommunityName';
import { useAuth } from "../contexts/AuthContext";

interface Community {
  name: string;
  companies: string[];
  totalPlans: number;
  totalNow: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  recentChanges: number;
  description?: string;
  location?: string;
  _id?: string | null;
  hasImage?: boolean;
  imagePath?: string | null;
  fromPlans?: boolean;
  parentCommunityId?: string | null;
  children?: Community[];
  communityType?: 'standard' | 'competitor';
  state?: string;
}

type CommunityUSRegion = "texas" | "georgia" | "other";

function getCommunityUSRegion(c: Community): CommunityUSRegion {
  const s = (c.state || "").trim().toLowerCase();
  if (s === "tx" || s === "texas") return "texas";
  if (s === "ga" || s === "georgia") return "georgia";

  const loc = (c.location || "").trim();
  if (!loc) return "other";
  const lower = loc.toLowerCase();
  // Match "City, TX", "City, TX 78071", "City TX …" (abbreviation is not only at string end when ZIP follows).
  if (/,?\s*tx\b/i.test(loc) || lower.endsWith(", texas") || lower.includes("texas")) {
    return "texas";
  }
  if (/,?\s*ga\b/i.test(loc) || lower.endsWith(", georgia") || lower.includes("georgia")) {
    return "georgia";
  }
  return "other";
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>(() => {
    // Try to load from cache on initial load
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('communities_data');
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // Cache for 5 minutes
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return data;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return [];
  });
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>(communities);
  const [searchQuery, setSearchQuery] = useState("");
  const [communityTypeFilter, setCommunityTypeFilter] = useState<"all" | "general" | "site">("all");
  const [regionTab, setRegionTab] = useState<CommunityUSRegion>("texas");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "builders_desc" | "plans_desc">("name_asc");
  const [loading, setLoading] = useState(communities.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [communityToEdit, setCommunityToEdit] = useState<EditCommunityModalCommunity | null>(null);
  const router = useRouter();
  const hasFetched = useRef(false);

  const fetchCommunities = async (forceRefresh = false) => {
    // Check cache first unless force refresh
    if (!forceRefresh && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('communities_data');
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // Cache for 5 minutes
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setCommunities(data);
            setFilteredCommunities(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Continue to fetch if cache fails
        }
      }
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const communitiesRes = await fetch(API_URL + "/communities?parentsOnly=true&communityType=all");
      if (!communitiesRes.ok) throw new Error("Failed to fetch communities");
      const communitiesData: any[] = await communitiesRes.json();

      const communityData: Community[] = communitiesData.map((comm: any) => {
        const companyNames = (comm.companies || []).map((c: any) => {
          if (typeof c === 'string') return c;
          if (c && typeof c === 'object' && c.name) return c.name;
          return '';
        }).filter((name: string) => name);
        const minP = comm.minPrice ?? 0;
        const maxP = comm.maxPrice ?? 0;
        const type = comm.communityType === 'competitor' ? 'competitor' : 'standard';
        return {
          name: comm.name,
          companies: companyNames,
          totalPlans: comm.totalPlans ?? 0,
          totalNow: comm.totalQuickMoveIns ?? 0,
          avgPrice: comm.avgPrice ?? 0,
          priceRange: { min: minP, max: maxP },
          recentChanges: 0,
          description: comm.description,
          location: comm.location,
          state: comm.state,
          _id: comm._id,
          hasImage: comm.hasImage || false,
          imagePath: comm.imagePath || null,
          fromPlans: comm.fromPlans || false,
          parentCommunityId: comm.parentCommunityId || null,
          communityType: type,
        };
      });

      // Cache the data
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('communities_data', JSON.stringify({
          data: communityData,
          timestamp: Date.now()
        }));
      }

      setCommunities(communityData);
      setFilteredCommunities(communityData);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCommunities(true);
  }, []);

  // Filter by community type: All = standard + competitor, General = standard only, Site = competitor only
  const communitiesForFilter = useMemo(() => {
    if (communityTypeFilter === "general") {
      return communities.filter((c) => (c.communityType ?? 'standard') === 'standard');
    }
    if (communityTypeFilter === "site") {
      return communities.filter((c) => c.communityType === 'competitor');
    }
    return [...communities];
  }, [communities, communityTypeFilter]);

  // Filter and sort communities based on type filter, search query, and sort option
  useEffect(() => {
    let filtered;
    if (searchQuery.trim() === "") {
      filtered = [...communitiesForFilter];
    } else {
      const query = searchQuery.toLowerCase();
      filtered = communitiesForFilter.filter((community: Community) =>
        community.name.toLowerCase().includes(query) ||
        community.location?.toLowerCase().includes(query) ||
        community.description?.toLowerCase().includes(query) ||
        community.companies.some((company: string) => company.toLowerCase().includes(query))
      );
    }

    const builderCount = (c: Community) => (c.companies || []).length;
    const plansSum = (c: Community) => (c.totalPlans || 0) + (c.totalNow || 0);

    filtered.sort((a: Community, b: Community) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        case "name_desc":
          return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
        case "builders_desc":
          return builderCount(b) - builderCount(a);
        case "plans_desc":
        default:
          return plansSum(b) - plansSum(a);
      }
    });

    setFilteredCommunities(filtered);
  }, [searchQuery, sortBy, communitiesForFilter]);

  const communitiesByRegion = useMemo(() => {
    const texas: Community[] = [];
    const georgia: Community[] = [];
    const other: Community[] = [];
    for (const c of filteredCommunities) {
      const r = getCommunityUSRegion(c);
      if (r === "texas") texas.push(c);
      else if (r === "georgia") georgia.push(c);
      else other.push(c);
    }
    return { texas, georgia, other };
  }, [filteredCommunities]);

  useEffect(() => {
    const { texas, georgia, other } = communitiesByRegion;
    const currentEmpty =
      (regionTab === "texas" && texas.length === 0) ||
      (regionTab === "georgia" && georgia.length === 0) ||
      (regionTab === "other" && other.length === 0);
    if (!currentEmpty) return;
    if (texas.length > 0) setRegionTab("texas");
    else if (georgia.length > 0) setRegionTab("georgia");
    else if (other.length > 0) setRegionTab("other");
  }, [communitiesByRegion, regionTab]);

  const handleCommunityClick = (community: Community) => {
    const slug = communityNameToSlug(community.name);
    router.push(`/community/${slug}`);
  };

  const renderCommunityCard = (community: Community) => {
    return (
      <Card
        key={community._id ?? community.name}
        onClick={() => handleCommunityClick(community)}
        className="cursor-pointer overflow-auto"
      >
        <div className="relative overflow-hidden h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCommunityCardImage(community)}
            alt={community.name}
            className="w-full h-full object-cover"
          />
          {community.recentChanges > 0 && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              {community.recentChanges} new
            </Badge>
          )}
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">{community.name}</CardTitle>
            {isEditor && community._id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCommunityToEdit({
                    _id: community._id!,
                    name: community.name,
                    description: community.description ?? null,
                    location: community.location ?? null,
                    imagePath: community.imagePath ?? null,
                    hasImage: community.hasImage,
                  });
                  setEditModalOpen(true);
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Edit community"
                aria-label="Edit community"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Plan/Now Summary */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-primary"></span>
                  <span className="text-sm font-medium text-muted-foreground">Plans</span>
                </div>
                <Badge variant="secondary">
                  {community.totalPlans}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-success"></span>
                  <span className="text-sm font-medium text-muted-foreground">Available Now</span>
                </div>
                <Badge variant="success">
                  {community.totalNow}
                </Badge>
              </div>
              
              {/* Price Info (— when no plan data) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Price:</span>
                  <span className="font-semibold text-primary">
                    {community.avgPrice > 0 ? `$${community.avgPrice.toLocaleString()}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price Range:</span>
                  <span className="font-semibold text-foreground text-sm">
                    {community.priceRange.max > 0
                      ? `$${community.priceRange.min.toLocaleString()} - $${community.priceRange.max.toLocaleString()}`
                      : "—"}
                  </span>
                </div>
              </div>
              
              {/* Builders */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Builders:</span>
                <div className="flex gap-1">
                  {community.companies.slice(0, 3).map((company) => {
                    const color = getCompanyColor(company);
                    return color != null ? (
                      <span
                        key={company}
                        className="inline-block w-3 h-3 rounded-full border"
                        style={{ backgroundColor: color, borderColor: color }}
                        title={company}
                      />
                    ) : (
                      <span
                        key={company}
                        className="inline-block w-3 h-3 rounded-full border border-dashed border-muted-foreground/40 bg-muted/30"
                        title={company}
                      />
                    );
                  })}
                  {community.companies.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{community.companies.length - 3}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    );
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  const isEditor = user?.permission === "editor" || user?.role === "admin";
  const isPending = user?.status === "pending";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
            <div className="mb-6">
              <div className="flex flex-col gap-4">
                {/* Title and Button Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold leading-none tracking-tight">Communities</h1>
                    <p className="text-sm text-muted-foreground">{isEditor ? 'Explore and manage' : 'Explore'} home plans by community</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search communities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    {/* Community type dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Type:</span>
                      <Select
                        value={communityTypeFilter}
                        onValueChange={(v) => setCommunityTypeFilter(v as typeof communityTypeFilter)}
                      >
                        <SelectTrigger className="w-[200px] h-10">
                          <SelectValue placeholder="Community type">
                            {communityTypeFilter === "general"
                              ? "General Community"
                              : communityTypeFilter === "site"
                              ? "Side Community"
                              : "All"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="general">General Community</SelectItem>
                          <SelectItem value="site">Side Community</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Sort dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sort:</span>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                        <SelectTrigger className="w-[180px] h-10">
                          <SelectValue placeholder="Sort by">
                            {sortBy === "name_asc" ? "Alphabetical (A–Z)" : sortBy === "name_desc" ? "Alphabetical (Z–A)" : sortBy === "builders_desc" ? "Most Builders" : "Most Plans"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name_asc">Alphabetical (A–Z)</SelectItem>
                          <SelectItem value="name_desc">Alphabetical (Z–A)</SelectItem>
                          <SelectItem value="builders_desc">Most Builders</SelectItem>
                          <SelectItem value="plans_desc">Most Plans</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Refresh Button */}
                    <button
                      onClick={() => fetchCommunities(true)}
                      disabled={refreshing}
                      title="Refresh communities data"
                      className={`p-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors ${
                        refreshing ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Only show Add Community button for editors/admins and not pending users */}
                    {isEditor && !isPending && (
                      <AddCommunityModal 
                        onSuccess={() => {
                          fetchCommunities(true); // Force refresh
                        }}
                      />
                    )}
                  </div>
                </div>
                {/* Results Counter */}
                {(searchQuery || communityTypeFilter !== "all") && (
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredCommunities.length} of {communitiesForFilter.length} communities
                  </div>
                )}
              </div>
            </div>

        {filteredCommunities.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  {searchQuery.trim()
                    ? `No communities found matching "${searchQuery}"`
                    : "No communities found."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={regionTab} onValueChange={(v) => setRegionTab(v as CommunityUSRegion)}>
            <TabsList className="mb-6 inline-flex h-auto min-h-10 w-fit max-w-full flex-wrap gap-1 p-1 items-center">
              <TabsTrigger
                value="texas"
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                Texas
                <span className="tabular-nums text-inherit">({communitiesByRegion.texas.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="georgia"
                className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                Georgia
                <span className="tabular-nums text-inherit">({communitiesByRegion.georgia.length})</span>
              </TabsTrigger>
              {communitiesByRegion.other.length > 0 && (
                <TabsTrigger
                  value="other"
                  className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                >
                  Other
                  <span className="tabular-nums text-inherit">({communitiesByRegion.other.length})</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="texas" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {communitiesByRegion.texas.map((community) => renderCommunityCard(community))}
              </div>
            </TabsContent>
            <TabsContent value="georgia" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {communitiesByRegion.georgia.map((community) => renderCommunityCard(community))}
              </div>
            </TabsContent>
            <TabsContent value="other" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {communitiesByRegion.other.map((community) => renderCommunityCard(community))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <EditCommunityModal
          community={communityToEdit}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSuccess={() => fetchCommunities(true)}
        />
      </div>
    </div>
  );
}
