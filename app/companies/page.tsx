"use client"

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import AddCompanyModal from "../components/AddCompanyModal";
import PendingApprovalBanner from "../components/PendingApprovalBanner";
import { ExternalLink, Trash2, Search } from "lucide-react";
import API_URL from '../config';

interface Company {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  createdAt: string;
  updatedAt: string;
}

interface Plan {
  plan_name: string;
  company: string | { name: string };
  type: string;
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>(() => {
    // Try to load plans from cache on initial load
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('plans_data');
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
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const hasFetched = useRef(false);

  const sortCompanies = (companiesList: Company[], plansData: Plan[]) => {
    const homeCountMap = plansData.reduce((map, plan) => {
      const companyName = typeof plan.company === 'string' 
        ? plan.company 
        : plan.company?.name || '';
      if (companyName) {
        map.set(companyName, (map.get(companyName) || 0) + 1);
      }
      return map;
    }, new Map<string, number>());
    
    return [...companiesList].sort((a, b) => {
      const isUnionmainA = a.name.toLowerCase().includes('unionmain');
      const isUnionmainB = b.name.toLowerCase().includes('unionmain');
      
      if (isUnionmainA !== isUnionmainB) return isUnionmainA ? -1 : 1;
      
      return (homeCountMap.get(b.name) || 0) - (homeCountMap.get(a.name) || 0);
    });
  };

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      
      let plansData = plans;
      if (plans.length === 0) {
        if (typeof window !== 'undefined') {
          const cached = sessionStorage.getItem('plans_data');
          if (cached) {
            try {
              const { data: cachedPlans, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < 5 * 60 * 1000) {
                plansData = cachedPlans;
                setPlans(cachedPlans);
              }
            } catch (e) {}
          }
        }
        
        if (plansData.length === 0) {
          const plansRes = await fetch(API_URL + "/plans");
          if (!plansRes.ok) throw new Error("Failed to fetch plans");
          plansData = await plansRes.json();
          setPlans(plansData);
          
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('plans_data', JSON.stringify({
              data: plansData,
              timestamp: Date.now()
            }));
          }
        }
      }
      
      const sortedCompanies = sortCompanies(data, plansData);
      setCompanies(sortedCompanies);
      setFilteredCompanies(sortedCompanies);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    fetchCompanies();
    fetchUser();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCompanies(companies);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(query) ||
      company.description?.toLowerCase().includes(query) ||
      company.headquarters?.toLowerCase().includes(query) ||
      company.website?.toLowerCase().includes(query)
    );
    setFilteredCompanies(filtered);
  }, [searchQuery, companies]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        
        // If user is not email verified (and not admin), redirect to signin
        // AuthGuard will handle the redirect, but this is a safeguard
        if (user.role !== "admin" && !user.emailVerified) {
          router.push("/signin");
          return;
        }
        
        setUser(user);
      }
    } catch (error) {
      // User not authenticated
    }
  };


  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingCompanyId(companyId);
    setError("");
    try {
      const res = await fetch(API_URL + `/companies?id=${companyId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete company");
      }

      await fetchCompanies();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingCompanyId(null);
    }
  };

  if (loading) return <Loader />;

  const isPending = user?.status === "pending";
  const isEditor = user?.permission === "editor" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Show pending approval banner if user is pending */}
        {isPending && <PendingApprovalBanner />}

        {/* Hide all content if user is pending */}
        {isPending ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              Your account is pending admin approval. Please wait for an admin to approve your account.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex flex-col gap-4">
                {/* Title and Button Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold leading-none tracking-tight">Companies</h2>
                    <p className="text-sm text-muted-foreground">{isEditor ? 'Manage' : 'View'} home building companies</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    {isEditor && (
                      <AddCompanyModal 
                        onSuccess={() => {
                          fetchCompanies();
                          setError("");
                        }}
                      />
                    )}
                  </div>
                </div>
                {/* Results Counter */}
                {searchQuery && (
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredCompanies.length} of {companies.length} companies
                  </div>
                )}
              </div>
            </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Companies List */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => {
            // Calculate home count for this company
            const homeCount = plans.filter(plan => {
              const companyName = typeof plan.company === 'string' 
                ? plan.company 
                : plan.company?.name || '';
              return companyName === company.name;
            }).length;
            
            return (
              <Card key={company._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {isEditor && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCompany(company._id, company.name)}
                          disabled={deletingCompanyId === company._id}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {company.description && (
                      <p className="text-sm text-muted-foreground">{company.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                     
                      {company.headquarters && (
                        <Badge variant="secondary" className="text-xs">
                          📍 {company.headquarters}
                        </Badge>
                      )}
                      {company.founded && (
                        <Badge variant="secondary" className="text-xs">
                          🏛️ Founded {company.founded}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredCompanies.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  {searchQuery.trim() 
                    ? `No companies found matching "${searchQuery}"`
                    : "No companies found. Add one to get started!"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
          </>
        )}
      </div>
    </div>
  );
}

