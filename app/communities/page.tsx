"use client"

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import AddCommunityModal from "../components/AddCommunityModal";
import API_URL from '../config';
import { getCompanyColor } from '../utils/colors';
import { getCommunityImage } from '../utils/communityImages';

interface Plan {
  plan_name: string;
  price: number;
  sqft: number;
  stories: string;
  price_per_sqft: number;
  last_updated: string;
  price_changed_recently: boolean;
  company: string;
  community: string;
  type: string;
}

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
  fromPlans?: boolean;
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const hasFetched = useRef(false);

  const fetchCommunities = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch communities from the API (includes both database communities and plan-derived ones)
      const communitiesRes = await fetch(API_URL + "/communities");
      if (!communitiesRes.ok) throw new Error("Failed to fetch communities");
      const communitiesData: any[] = await communitiesRes.json();
      
      // Fetch plans to calculate statistics for each community
      const plansRes = await fetch(API_URL + "/plans");
      if (!plansRes.ok) throw new Error("Failed to fetch plans");
      const plans: Plan[] = await plansRes.json();
      
      // Group plans by community for statistics
      const communityPlansMap = new Map<string, Plan[]>();
      plans.forEach(plan => {
        const communityName = typeof plan.community === 'string' ? plan.community : (plan.community as any)?.name || plan.community;
        if (!communityPlansMap.has(communityName)) {
          communityPlansMap.set(communityName, []);
        }
        communityPlansMap.get(communityName)!.push(plan);
      });

      // Map communities data to include statistics from plans
      const communityData: Community[] = communitiesData.map(comm => {
        const plansForCommunity = communityPlansMap.get(comm.name) || [];
        // Extract company names from the companies array (handle both object and string formats)
        const companyNames = (comm.companies || []).map((c: any) => {
          if (typeof c === 'string') return c;
          if (c && typeof c === 'object' && c.name) return c.name;
          return '';
        }).filter((name: string) => name);
        // Fallback to extracting from plans if no companies in community
        const companies = companyNames.length > 0 
          ? companyNames 
          : Array.from(new Set(plansForCommunity.map(p => typeof p.company === 'string' ? p.company : (p.company as any)?.name || p.company)));
        const prices = plansForCommunity.map(p => p.price).filter(p => p > 0);
        const recentChanges = plansForCommunity.filter(p => p.price_changed_recently).length;
        const totalPlans = plansForCommunity.filter(p => p.type === 'plan').length;
        const totalNow = plansForCommunity.filter(p => p.type === 'now').length;
        
        return {
          name: comm.name,
          companies: companies.length > 0 ? companies : [],
          totalPlans,
          totalNow,
          avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
          priceRange: {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 0
          },
          recentChanges,
          description: comm.description,
          location: comm.location,
          _id: comm._id,
          fromPlans: comm.fromPlans || false,
        };
      });

      setCommunities(communityData);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent duplicate calls in React StrictMode (development)
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    fetchUser();
    fetchCommunities();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      // User not authenticated - AuthGuard will handle redirect
    }
  };

  const handleCommunityClick = (community: Community) => {
    // Use the first word of the community name as the URL slug
    const firstWord = community.name.split(' ')[0].toLowerCase();
    router.push(`/community/${firstWord}`);
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  const isEditor = user?.permission === "editor" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Communities</h1>
            <p className="text-sm text-muted-foreground">Explore home plans by community</p>
          </div>
          {/* Only show Add Community button for editors/admins */}
          {isEditor && (
            <AddCommunityModal 
              onSuccess={() => {
                fetchCommunities();
              }}
            />
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((community) => (
            <Card
              key={community.name}
              onClick={() => handleCommunityClick(community)}
              className="cursor-pointer overflow-auto"
            >
              <div className="relative overflow-hidden h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCommunityImage(community.name)}
                  alt={community.name}
                  className="w-full h-full object-cover"
                />
                {community.recentChanges > 0 && (
                  <Badge variant="destructive" className="absolute">
                    {community.recentChanges} new
                  </Badge>
                )}
              </div>
              
              <CardHeader>
                <CardTitle>{community.name}</CardTitle>
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
                  
                  {/* Price Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Price:</span>
                      <span className="font-semibold text-primary">
                        ${community.avgPrice.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price Range:</span>
                      <span className="font-semibold text-foreground text-sm">
                        ${community.priceRange.min.toLocaleString()} - ${community.priceRange.max.toLocaleString()}
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
          ))}
        </div>
        
        {communities.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">No communities found.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
