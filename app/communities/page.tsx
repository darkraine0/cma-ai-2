"use client"

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import AddCommunityModal from "../components/AddCommunityModal";
import EditCommunityModal from "../components/EditCommunityModal";
import type { EditCommunityModalCommunity } from "../components/EditCommunityModal";
import { Search, RefreshCw, Pencil } from "lucide-react";
import API_URL from '../config';
import { getCompanyColor } from '../utils/colors';
import { getCommunityImage } from '../utils/communityImages';
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
      const communitiesRes = await fetch(API_URL + "/communities?parentsOnly=true");
      if (!communitiesRes.ok) throw new Error("Failed to fetch communities");
      const communitiesData: any[] = await communitiesRes.json();

      const communityData: Community[] = communitiesData.map((comm: any) => {
        const companyNames = (comm.companies || []).map((c: any) => {
          if (typeof c === 'string') return c;
          if (c && typeof c === 'object' && c.name) return c.name;
          return '';
        }).filter((name: string) => name);
        return {
          name: comm.name,
          companies: companyNames,
          totalPlans: comm.totalPlans ?? 0,
          totalNow: comm.totalQuickMoveIns ?? 0,
          avgPrice: 0,
          priceRange: { min: 0, max: 0 },
          recentChanges: 0,
          description: comm.description,
          location: comm.location,
          _id: comm._id,
          hasImage: comm.hasImage || false,
          imagePath: comm.imagePath || null,
          fromPlans: comm.fromPlans || false,
          parentCommunityId: comm.parentCommunityId || null,
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

  // Filter communities based on search query (parent communities only)
  useEffect(() => {
    let filtered;
    if (searchQuery.trim() === "") {
      filtered = [...communities];
    } else {
      const query = searchQuery.toLowerCase();
      filtered = communities.filter((community: Community) =>
        community.name.toLowerCase().includes(query) ||
        community.location?.toLowerCase().includes(query) ||
        community.description?.toLowerCase().includes(query) ||
        community.companies.some((company: string) => company.toLowerCase().includes(query))
      );
    }
    
    // Sort by sum of totalPlans and totalNow (descending - highest first)
    filtered.sort((a: Community, b: Community) => {
      const sumA = a.totalPlans + a.totalNow;
      const sumB = b.totalPlans + b.totalNow;
      return sumB - sumA;
    });
    
    setFilteredCommunities(filtered);
  }, [searchQuery, communities]);

  const handleCommunityClick = (community: Community) => {
    const slug = communityNameToSlug(community.name);
    router.push(`/community/${slug}`);
  };

  const renderCommunityCard = (community: Community) => {
    return (
      <Card
        key={community.name}
        onClick={() => handleCommunityClick(community)}
        className="cursor-pointer overflow-auto"
      >
        <div className="relative overflow-hidden h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCommunityImage(community)}
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
                    return (
                      <span
                        key={company}
                        className="inline-block w-3 h-3 rounded-full border"
                        style={{ backgroundColor: color, borderColor: color }}
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
                  <div className="flex items-center gap-3">
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
                {searchQuery && (
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredCommunities.length} of {communities.length} communities
                  </div>
                )}
              </div>
            </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.map((community) => renderCommunityCard(community))}
        </div>
        
        {filteredCommunities.length === 0 && (
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
