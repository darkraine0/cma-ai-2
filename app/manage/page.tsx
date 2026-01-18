"use client"

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import AddCommunityModal from "../components/AddCommunityModal";
import SelectCompanyModal from "../components/SelectCompanyModal";
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
  const [communities, setCommunities] = useState<Community[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState("");
  
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
  }, []);



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

      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingAll(false);
    }
  };

  if (loading || loadingCompanies) return <Loader />;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Manage Communities & Companies</h1>
          <p className="text-sm text-muted-foreground">Add communities and manage companies in each community</p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Add Community Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold leading-none tracking-tight">Communities</h2>
            <p className="text-sm text-muted-foreground">Manage communities and their companies</p>
          </div>
          <div className="flex gap-2">
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
        </div>

        {/* Communities List */}
        <div className="space-y-4">
          {communities.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">No communities found. Add one to get started!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            communities.map((community) => (
              <Card key={community.name}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{community.name}</CardTitle>
                        {community.fromPlans && (
                          <Badge variant="secondary" className="text-xs">
                            From Plans
                          </Badge>
                        )}
                      </div>
                      {community.description && (
                        <p className="text-sm text-muted-foreground mb-1">{community.description}</p>
                      )}
                      {community.location && (
                        <p className="text-sm text-muted-foreground">📍 {community.location}</p>
                      )}
                    </div>
                    {!community.fromPlans && community._id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCommunity(community)}
                        disabled={deletingCommunityId === community._id}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingCommunityId === community._id ? (
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
                    {/* Companies in this community */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Companies Building Here</h3>
                        <Badge variant="secondary">{community.companies.length}</Badge>
                      </div>
                      
                      {community.companies.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No companies yet. Add one below.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                          {community.companies.map((company) => {
                            // Handle both string and object formats
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveCompanyFromCommunity(community, companyName)}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Add Company to Community */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium">Add Company to {community.name}</label>
                        <SelectCompanyModal
                          communityId={community._id || undefined}
                          communityName={community.name}
                          existingCompanies={community.companies.map(c => typeof c === 'string' ? c : c.name)}
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
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

