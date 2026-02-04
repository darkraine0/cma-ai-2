"use client"

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import AddCommunityModal from "../components/AddCommunityModal";
import AddSubcommunityModal from "../components/AddSubcommunityModal";
import SelectCompanyModal from "../components/SelectCompanyModal";
import PendingApprovalBanner from "../components/PendingApprovalBanner";
import { Plus, X, Trash2, Loader2, Search } from "lucide-react";
import API_URL from '../config';
import { getCompanyColor } from '../utils/colors';

interface Company {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
}

interface CommunityCompany {
  _id: string;
  name: string;
}

interface Plan {
  plan_name: string;
  company: string | { name: string };
  community: string | { name: string };
  type: string;
}

interface Community {
  name: string;
  companies: string[] | CommunityCompany[];
  fromPlans?: boolean;
  description?: string;
  location?: string;
  _id?: string | null;
  totalPlans?: number;
  totalNow?: number;
  parentCommunityId?: string | { _id: string; name: string } | null;
}

export default function ManagePage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  
  const [deletingCommunityId, setDeletingCommunityId] = useState<string | null>(null);
  const [deletingSubcommunityId, setDeletingSubcommunityId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [childCommunities, setChildCommunities] = useState<Community[]>([]);
  const [loadingSubcommunities, setLoadingSubcommunities] = useState(false);
  const hasFetched = useRef(false);

  const loadPlansData = async () => {
    if (plans.length > 0) return plans;

    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('plans_data');
      if (cached) {
        try {
          const { data: cachedPlans, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setPlans(cachedPlans);
            return cachedPlans;
          }
        } catch (e) {}
      }
    }

    const plansRes = await fetch(API_URL + "/plans");
    if (!plansRes.ok) throw new Error("Failed to fetch plans");
    const plansData = await plansRes.json();
    setPlans(plansData);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('plans_data', JSON.stringify({
        data: plansData,
        timestamp: Date.now()
      }));
    }

    return plansData;
  };

  const enrichCommunitiesWithStats = (communities: Community[], plansData: Plan[]) => {
    const plansByCommunity = plansData.reduce((map, plan) => {
      const communityName = typeof plan.community === 'string' 
        ? plan.community 
        : plan.community?.name || '';
      if (!map.has(communityName)) map.set(communityName, []);
      map.get(communityName)!.push(plan);
      return map;
    }, new Map<string, Plan[]>());

    return communities.map(comm => ({
      ...comm,
      totalPlans: (plansByCommunity.get(comm.name) || []).filter(p => p.type === 'plan').length,
      totalNow: (plansByCommunity.get(comm.name) || []).filter(p => p.type === 'now').length,
    })).sort((a, b) => 
      ((b.totalPlans || 0) + (b.totalNow || 0)) - ((a.totalPlans || 0) + (a.totalNow || 0))
    );
  };

  const fetchCommunities = async () => {
    setLoading(true);
    setError("");
    try {
      const [communitiesRes, plansData] = await Promise.all([
        fetch(API_URL + "/communities"),
        loadPlansData()
      ]);
      
      if (!communitiesRes.ok) throw new Error("Failed to fetch communities");
      const communities = await communitiesRes.json();
      
      const sorted = enrichCommunitiesWithStats(communities, plansData);
      setCommunities(sorted);
      setFilteredCommunities(sorted);
      
      const updated = selectedCommunity 
        ? sorted.find(c => c.name === selectedCommunity.name)
        : null;
      
      setSelectedCommunity(updated || (sorted.length > 0 ? sorted[0] : null));
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await fetch(API_URL + "/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data);
    } catch (err: any) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    fetchCommunities();
    fetchCompanies();
    fetchUser();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCommunities(communities);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = communities.filter(community =>
      community.name.toLowerCase().includes(query) ||
      community.location?.toLowerCase().includes(query) ||
      community.description?.toLowerCase().includes(query)
    );
    setFilteredCommunities(filtered);
  }, [searchQuery, communities]);

  // Left sidebar shows only parent communities (no subcommunities)
  const parentCommunitiesForSidebar = React.useMemo(
    () => filteredCommunities.filter((c) => !c.parentCommunityId),
    [filteredCommunities]
  );

  const fetchChildCommunities = React.useCallback(async (parentId: string) => {
    try {
      const res = await fetch(`${API_URL}/communities?parentId=${parentId}`);
      if (!res.ok) return;
      const data = await res.json();
      setChildCommunities(Array.isArray(data) ? data : []);
    } catch {
      setChildCommunities([]);
    }
  }, []);

  // Fetch subcommunities when a community is selected (so we can show them in the detail card)
  useEffect(() => {
    if (!selectedCommunity?._id) {
      setChildCommunities([]);
      setLoadingSubcommunities(false);
      return;
    }
    let cancelled = false;
    setLoadingSubcommunities(true);
    fetch(`${API_URL}/communities?parentId=${selectedCommunity._id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setChildCommunities(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setChildCommunities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSubcommunities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCommunity?._id]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        
        if (user.role !== "admin" && !user.emailVerified) {
          router.push("/signin");
          return;
        }
        
        setUser(user);
      }
    } catch (error) {}
  };



  const handleRemoveCompanyFromCommunity = async (community: Community, companyName: string) => {
    if (!window.confirm(`Remove ${companyName} from ${community.name}?`)) return;

    setError("");
    try {
      const company = companies.find(c => c.name === companyName);
      const queryParam = company ? `companyId=${company._id}` : `company=${encodeURIComponent(companyName)}`;
      const identifier = community._id || encodeURIComponent(community.name);
      
      const res = await fetch(`${API_URL}/communities/${identifier}/companies?${queryParam}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove company from community");
      }

      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
  };

  const handleDeleteSubcommunity = async (child: Community) => {
    if (!child._id) {
      setError("Cannot delete this subcommunity.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${child.name}"? This action cannot be undone.`)) return;

    setDeletingSubcommunityId(child._id);
    setError("");
    try {
      const res = await fetch(`${API_URL}/communities?id=${child._id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete subcommunity");
      }
      if (selectedCommunity?._id) fetchChildCommunities(selectedCommunity._id);
      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingSubcommunityId(null);
    }
  };

  const handleDeleteCommunity = async (community: Community) => {
    if (!community._id) {
      setError("Cannot delete this community as it's derived from plans. Please delete the associated plans first.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${community.name}"? This action cannot be undone.`)) return;

    setDeletingCommunityId(community._id);
    setError("");
    try {
      const res = await fetch(`${API_URL}/communities?id=${community._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete community");
      }

      if (selectedCommunity?._id === community._id) {
        setSelectedCommunity(null);
      }

      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingCommunityId(null);
    }
  };

  const handleDeleteAllCommunities = async () => {
    const deletableCommunities = communities.filter(c => c._id && !c.fromPlans);
    
    if (deletableCommunities.length === 0) {
      setError("No communities can be deleted. All communities are derived from plans.");
      return;
    }

    const count = deletableCommunities.length;
    const plural = count === 1 ? 'y' : 'ies';
    const confirmMessage = `Are you sure you want to delete ALL ${count} communit${plural}?\n\nThis will permanently delete:\n${deletableCommunities.map(c => `- ${c.name}`).join('\n')}\n\nThis action CANNOT be undone!`;
    
    if (!window.confirm(confirmMessage)) return;
    if (!window.confirm(`⚠️ FINAL CONFIRMATION ⚠️\n\nAre you absolutely sure you want to delete ALL ${count} communit${plural}? This cannot be undone!`)) return;

    setDeletingAll(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/communities?all=true`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete all communities");
      }

      setSelectedCommunity(null);
      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingAll(false);
    }
  };

  if (loading || loadingCompanies) return <Loader />;

  const isPending = user?.status === "pending";
  const isEditor = user?.permission === "editor" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {isPending && <PendingApprovalBanner />}

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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold leading-none tracking-tight">{isEditor ? 'Manage' : 'View'} Communities & Companies</h1>
                    <p className="text-sm text-muted-foreground">{isEditor ? 'Add communities and manage companies in each community' : 'View communities and their companies'}</p>
                  </div>
                  <div className="flex items-center gap-3">
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
                    {isEditor && (
                      <AddCommunityModal 
                        onSuccess={() => {
                          fetchCommunities();
                          setError("");
                        }}
                      />
                    )}
                  </div>
                </div>
                {searchQuery && (
                  <div className="text-sm text-muted-foreground">
                    Showing {parentCommunitiesForSidebar.length} of {communities.filter((c) => !c.parentCommunityId).length} parent communities
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4">
                <ErrorMessage message={error} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <Card className="lg:sticky lg:top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Communities</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 max-h-[calc(100vh-15rem)] overflow-y-auto">
                    {parentCommunitiesForSidebar.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <p className="text-sm text-muted-foreground">
                          {searchQuery.trim() ? `No parent communities found matching "${searchQuery}"` : "No parent communities."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {parentCommunitiesForSidebar.map((community) => {
                          const totalHomes = (community.totalPlans || 0) + (community.totalNow || 0);
                          return (
                            <button
                              key={community.name}
                              onClick={() => setSelectedCommunity(community)}
                              className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between ${
                                selectedCommunity?.name === community.name ? 'bg-muted border-l-4 border-primary' : 'border-l-4 border-transparent'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{community.name}</span>
                                  {community.fromPlans && (
                                    <Badge variant="secondary" className="text-xs">Plans</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">{community.companies.length} companies</p>
                                  {totalHomes > 0 && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <p className="text-xs text-muted-foreground">{totalHomes} homes</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                {!selectedCommunity ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <p className="text-lg text-muted-foreground">Select a community to view details</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-2xl">{selectedCommunity.name}</CardTitle>
                            {selectedCommunity.fromPlans && (
                              <Badge variant="secondary" className="text-xs">
                                From Plans
                              </Badge>
                            )}
                          </div>
                          {selectedCommunity.description && (
                            <p className="text-sm text-muted-foreground mb-1">{selectedCommunity.description}</p>
                          )}
                          {selectedCommunity.location && (
                            <p className="text-sm text-muted-foreground">📍 {selectedCommunity.location}</p>
                          )}
                        </div>
                        {isEditor && !selectedCommunity.fromPlans && selectedCommunity._id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCommunity(selectedCommunity)}
                            disabled={deletingCommunityId === selectedCommunity._id}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingCommunityId === selectedCommunity._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">Companies Building Here</h3>
                            <Badge variant="secondary" className="text-sm">{selectedCommunity.companies.length}</Badge>
                          </div>
                          
                          {selectedCommunity.companies.length === 0 ? (
                            <div className="text-center py-8 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground">No companies yet. Add one below.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-4">
                              {selectedCommunity.companies.map((company) => {
                                const companyName = typeof company === 'string' ? company : company.name;
                                const companyKey = typeof company === 'string' ? company : company._id;
                                
                                return (
                                  <div
                                    key={companyKey}
                                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <span
                                        className="inline-block w-3 h-3 rounded-full border"
                                        style={{
                                          backgroundColor: getCompanyColor(companyName),
                                          borderColor: getCompanyColor(companyName),
                                        }}
                                      />
                                      <span className="text-sm font-medium">{companyName}</span>
                                    </div>
                                    {isEditor && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveCompanyFromCommunity(selectedCommunity, companyName)}
                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {isEditor && (
                          <div className="pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium">Add Company to {selectedCommunity.name}</label>
                              <SelectCompanyModal
                                communityId={selectedCommunity._id || undefined}
                                communityName={selectedCommunity.name}
                                existingCompanies={selectedCommunity.companies.map(c => typeof c === 'string' ? c : c.name)}
                                onSuccess={() => {
                                  fetchCommunities();
                                  setError("");
                                }}
                                trigger={
                                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Company
                                  </Button>
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mt-6">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Subcommunities</CardTitle>
                        {!loadingSubcommunities && childCommunities.length > 0 && (
                          <Badge variant="secondary" className="text-sm">{childCommunities.length}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingSubcommunities ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-sm">Loading subcommunities...</span>
                        </div>
                      ) : childCommunities.length === 0 ? (
                        <div className="text-left">
                          <p className="text-sm text-muted-foreground mb-4">No subcommunities yet.</p>
                          {isEditor && selectedCommunity._id && (
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-sm font-medium">Add Subcommunity to {selectedCommunity.name}</span>
                              <AddSubcommunityModal
                                defaultParentId={selectedCommunity._id}
                                onSuccess={() => {
                                  fetchCommunities();
                                  fetchChildCommunities(selectedCommunity._id!);
                                  setError("");
                                }}
                                trigger={
                                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Subcommunity
                                  </Button>
                                }
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                            {childCommunities.map((child) => (
                              <div
                                key={child._id || child.name}
                                className="flex items-center justify-between p-3 bg-muted rounded-md"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate">{child.name}</span>
                                  {child.location && (
                                    <span className="text-xs text-muted-foreground shrink-0">📍 {child.location}</span>
                                  )}
                                </div>
                                {isEditor && child._id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteSubcommunity(child)}
                                    disabled={deletingSubcommunityId === child._id}
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  >
                                    {deletingSubcommunityId === child._id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <X className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          {isEditor && selectedCommunity._id && (
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium">Add Subcommunity to {selectedCommunity.name}</label>
                              <AddSubcommunityModal
                                defaultParentId={selectedCommunity._id}
                                onSuccess={() => {
                                  fetchCommunities();
                                  fetchChildCommunities(selectedCommunity._id!);
                                  setError("");
                                }}
                                trigger={
                                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Subcommunity
                                  </Button>
                                }
                              />
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

