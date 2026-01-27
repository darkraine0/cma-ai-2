"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import AddCommunityModal from "../components/AddCommunityModal";
import SelectCompanyModal from "../components/SelectCompanyModal";
import PendingApprovalBanner from "../components/PendingApprovalBanner";
import { Plus, X, Trash2, Loader2 } from "lucide-react";
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

interface Community {
  name: string;
  companies: string[] | CommunityCompany[]; // Can be either format for backward compatibility
  fromPlans?: boolean;
  description?: string;
  location?: string;
  _id?: string | null;
}

export default function ManagePage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  
  const [deletingCommunityId, setDeletingCommunityId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchCommunities = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/communities");
      if (!res.ok) throw new Error("Failed to fetch communities");
      const data = await res.json();
      setCommunities(data);
      
      // Update selected community if it exists in the new data
      if (selectedCommunity) {
        const updatedSelected = data.find((c: Community) => c.name === selectedCommunity.name);
        if (updatedSelected) {
          setSelectedCommunity(updatedSelected);
        } else {
          // Community was deleted, select first available or null
          setSelectedCommunity(data.length > 0 ? data[0] : null);
        }
      } else if (data.length > 0) {
        // Auto-select first community if none selected
        setSelectedCommunity(data[0]);
      }
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
    fetchCommunities();
    fetchCompanies();
    fetchUser();
  }, []);

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



  const handleRemoveCompanyFromCommunity = async (community: Community, companyName: string) => {
    if (!window.confirm(`Remove ${companyName} from ${community.name}?`)) {
      return;
    }

    setError("");
    try {
      // Find company ID from the companies list
      const company = companies.find(c => c.name === companyName);
      const queryParam = company ? `companyId=${company._id}` : `company=${encodeURIComponent(companyName)}`;
      
      // Use communityId if available, otherwise fall back to communityName
      // The route now handles both IDs and names
      const identifier = community._id || encodeURIComponent(community.name);
      const url = API_URL + `/communities/${identifier}/companies?${queryParam}`;
      
      const res = await fetch(url, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove company from community");
      }

      // Fetch communities to update - this will also update selected community
      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
  };

  const handleDeleteCommunity = async (community: Community) => {
    if (!community._id) {
      setError("Cannot delete this community as it's derived from plans. Please delete the associated plans first.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${community.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingCommunityId(community._id);
    setError("");
    try {
      const res = await fetch(API_URL + `/communities?id=${community._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete community");
      }

      // If the deleted community was selected, clear selection
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
    // Count communities that can be deleted (have _id, not from plans)
    const deletableCommunities = communities.filter(c => c._id && !c.fromPlans);
    
    if (deletableCommunities.length === 0) {
      setError("No communities can be deleted. All communities are derived from plans.");
      return;
    }

    const confirmMessage = `Are you sure you want to delete ALL ${deletableCommunities.length} communit${deletableCommunities.length === 1 ? 'y' : 'ies'}?\n\nThis will permanently delete:\n${deletableCommunities.map(c => `- ${c.name}`).join('\n')}\n\nThis action CANNOT be undone!`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for safety
    if (!window.confirm(`⚠️ FINAL CONFIRMATION ⚠️\n\nAre you absolutely sure you want to delete ALL ${deletableCommunities.length} communit${deletableCommunities.length === 1 ? 'y' : 'ies'}? This cannot be undone!`)) {
      return;
    }

    setDeletingAll(true);
    setError("");
    try {
      const res = await fetch(API_URL + `/communities?all=true`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete all communities");
      }

      // Clear selection after deleting all
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
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold leading-none tracking-tight">{isEditor ? 'Manage' : 'View'} Communities & Companies</h1>
                <p className="text-sm text-muted-foreground">{isEditor ? 'Add communities and manage companies in each community' : 'View communities and their companies'}</p>
              </div>
              {isEditor && (
                <div className="flex flex-wrap items-center gap-3">
                  <AddCommunityModal 
                    onSuccess={() => {
                      fetchCommunities();
                      setError("");
                    }}
                  />
                  {communities.filter(c => c._id && !c.fromPlans).length > 0 && (
                    <Button
                      onClick={handleDeleteAllCommunities}
                      disabled={deletingAll || loading || loadingCompanies}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      {deletingAll ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting All...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete All
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4">
                <ErrorMessage message={error} />
              </div>
            )}

            {/* Sidebar + Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar - Communities List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Communities</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {communities.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <p className="text-sm text-muted-foreground">No communities found.</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {communities.map((community) => (
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
                              <p className="text-xs text-muted-foreground">{community.companies.length} companies</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Main Content - Selected Community Details */}
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
                        {/* Companies Section */}
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

                        {/* Add Company Section */}
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
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

