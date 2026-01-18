"use client"

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Plus, Loader2, Sparkles, Search } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import ScrapingDialog from "./ScrapingDialog";
import API_URL from '../config';

interface AddCompanyModalProps {
  onSuccess?: (companyName?: string) => void;
  trigger?: React.ReactNode;
  autoAddToCommunityId?: string; // Community ID (preferred)
  autoAddToCommunity?: string; // Community name (fallback for plan-derived communities)
  open?: boolean; // External control of modal open state
  onOpenChange?: (open: boolean) => void; // Callback when open state changes
}

interface CompanyRecommendation {
  name: string;
  description: string | null;
  website: string | null;
  headquarters: string | null;
  founded: string | null;
  alreadyExists: boolean;
}

export default function AddCompanyModal({ onSuccess, trigger, autoAddToCommunityId, autoAddToCommunity, open: externalOpen, onOpenChange }: AddCompanyModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (externalOpen === undefined) {
      setInternalOpen(newOpen);
    }
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [founded, setFounded] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendations, setRecommendations] = useState<CompanyRecommendation[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecommendation | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [activeTab, setActiveTab] = useState("ai");
  const [showScrapingDialog, setShowScrapingDialog] = useState(false);
  const [scrapingCompanyName, setScrapingCompanyName] = useState<string>("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setWebsite("");
    setHeadquarters("");
    setFounded("");
    setError("");
    setSearchQuery("");
    setRecommendations([]);
    setSelectedCompany(null);
    setShowRecommendations(false);
    setActiveTab("ai");
    setShowScrapingDialog(false);
    setScrapingCompanyName("");
  };

  const handleClose = () => {
    if (!loading && !loadingAI) {
      setOpen(false);
      resetForm();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading && !loadingAI) {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }
  };

  // If externally controlled, reset form when closing
  useEffect(() => {
    if (externalOpen !== undefined && !externalOpen) {
      resetForm();
    }
  }, [externalOpen]);

  const handleAddCompany = async () => {
    if (!name.trim()) {
      setError("Please enter a company name");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Build request body - only include fields with values
      const requestBody: any = {
        name: name.trim(),
      };

      if (description && description.trim()) {
        requestBody.description = description.trim();
      }
      if (website && website.trim()) {
        requestBody.website = website.trim();
      }
      if (headquarters && headquarters.trim()) {
        requestBody.headquarters = headquarters.trim();
      }
      if (founded) {
        // Convert to string and trim (in case it's a number)
        const foundedStr = String(founded).trim();
        if (foundedStr) {
          requestBody.founded = foundedStr;
        }
      }

      const res = await fetch(API_URL + "/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.message || data.error || "Failed to add company";
        throw new Error(errorMessage);
      }

      // If autoAddToCommunityId or autoAddToCommunity is provided, add company to that community
      if ((autoAddToCommunityId || autoAddToCommunity) && data._id) {
        try {
          // Use communityId if available, otherwise fall back to communityName
          // The route now handles both IDs and names
          const identifier = autoAddToCommunityId || encodeURIComponent(autoAddToCommunity!.trim());
          const url = API_URL + `/communities/${identifier}/companies`;
          
          const addToCommunityRes = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ companyId: data._id }),
          });

          if (!addToCommunityRes.ok) {
            const addError = await addToCommunityRes.json();
            console.warn("Failed to add company to community:", addError);
            // Don't throw - company was created successfully, just failed to add to community
          } else {
            // Company was successfully added to community, trigger scraping
            if (autoAddToCommunity) {
              setScrapingCompanyName(data.name);
              setShowScrapingDialog(true);
              handleClose();
              return; // Don't call onSuccess yet, wait for scraping to complete
            }
          }
        } catch (addError) {
          console.warn("Error adding company to community:", addError);
          // Don't throw - company was created successfully, just failed to add to community
        }
      }

      handleClose();
      if (onSuccess) {
        onSuccess(data.name);
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCompanies = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search term");
      return;
    }

    setLoadingAI(true);
    setError("");
    setRecommendations([]);
    setSelectedCompany(null);
    setShowRecommendations(true);
    
    try {
      const res = await fetch(API_URL + "/companies/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchQuery: searchQuery.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to search companies with AI");
      }

      setRecommendations(data.companies || []);
      
      if (!data.companies || data.companies.length === 0) {
        setError("No companies found. Try a different search term.");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setShowRecommendations(false);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSelectCompany = (company: CompanyRecommendation) => {
    if (company.alreadyExists) {
      setError(`Company "${company.name}" already exists in the system.`);
      return;
    }

    setSelectedCompany(company);
    setName(company.name);
    setDescription(company.description || "");
    setWebsite(company.website || "");
    setHeadquarters(company.headquarters || "");
    // Convert to string in case AI returns a number
    setFounded(company.founded ? String(company.founded) : "");
    setShowRecommendations(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Company
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
        </DialogHeader>
        <DialogClose />

        <div className="space-y-4 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Search
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            {/* AI Search Tab */}
            <TabsContent value="ai" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Search for Home Building Companies
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., Union Main Homes, ABC Builders, Dallas builders..."
                    className="flex-1 px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !loadingAI && searchQuery.trim()) {
                        handleSearchCompanies();
                      }
                    }}
                    disabled={loading || loadingAI}
                  />
                  <Button
                    onClick={handleSearchCompanies}
                    disabled={loadingAI || !searchQuery.trim()}
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    {loadingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Recommendations List */}
              {!selectedCompany && showRecommendations && recommendations.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-3 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Recommended Companies:</p>
                  {recommendations.map((company, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        company.alreadyExists ? 'opacity-60' : ''
                      }`}
                      onClick={() => handleSelectCompany(company)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm">{company.name}</h3>
                              {company.alreadyExists && (
                                <Badge variant="secondary" className="text-xs">
                                  Already Exists
                                </Badge>
                              )}
                            </div>
                            {company.description && (
                              <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                                {company.description}
                              </p>
                            )}
                            {company.headquarters && (
                              <p className="text-xs text-muted-foreground">📍 {company.headquarters}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Selected Company Details - Editable */}
              {selectedCompany && (
                <div className="space-y-4 border-t pt-4">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="text-sm text-primary font-medium mb-2">
                      ✓ Company selected! Review and edit below, then confirm.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(null);
                        setName("");
                        setDescription("");
                        setWebsite("");
                        setHeadquarters("");
                        setFounded("");
                        setShowRecommendations(true);
                      }}
                      className="text-xs"
                    >
                      ← Select Different Company
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Company name..."
                      className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={loading || loadingAI}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Company description..."
                      className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={loading || loadingAI}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Website (Optional)
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={loading || loadingAI}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Headquarters (Optional)
                    </label>
                    <input
                      type="text"
                      value={headquarters}
                      onChange={(e) => setHeadquarters(e.target.value)}
                      placeholder="e.g., Dallas, TX"
                      className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={loading || loadingAI}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Founded (Optional)
                    </label>
                    <input
                      type="text"
                      value={founded}
                      onChange={(e) => setFounded(e.target.value)}
                      placeholder="e.g., 2010"
                      className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={loading || loadingAI}
                    />
                  </div>
                </div>
              )}

              {loadingAI && !showRecommendations && !selectedCompany && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Searching for companies...</p>
                </div>
              )}

              {/* Action Buttons for AI Tab - Show when company is selected */}
              {activeTab === "ai" && selectedCompany && (
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                  <Button
                    onClick={handleAddCompany}
                    disabled={loading || loadingAI || !name.trim()}
                    className="flex-1 flex items-center justify-center gap-2"
                    variant="default"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Confirm & Add Company
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedCompany(null);
                      setName("");
                      setDescription("");
                      setWebsite("");
                      setHeadquarters("");
                      setFounded("");
                      setSearchQuery("");
                      setShowRecommendations(true);
                    }}
                    disabled={loading || loadingAI}
                    className="flex-1"
                    variant="outline"
                  >
                    Clear Selection
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Union Main Homes, ABC Builders..."
                  className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !loading && !loadingAI && name.trim()) {
                      handleAddCompany();
                    }
                  }}
                  disabled={loading || loadingAI}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Company description..."
                  className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={loading || loadingAI}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={loading || loadingAI}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Headquarters (Optional)
                </label>
                <input
                  type="text"
                  value={headquarters}
                  onChange={(e) => setHeadquarters(e.target.value)}
                  placeholder="e.g., Dallas, TX"
                  className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={loading || loadingAI}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Founded (Optional)
                </label>
                <input
                  type="text"
                  value={founded}
                  onChange={(e) => setFounded(e.target.value)}
                  placeholder="e.g., 2010"
                  className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={loading || loadingAI}
                />
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4">
              <ErrorMessage message={error} />
            </div>
          )}

          {/* Action Buttons for Manual Tab - Show when company name is entered */}
          {activeTab === "manual" && name.trim() && (
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button
                onClick={handleAddCompany}
                disabled={loading || loadingAI || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Company
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Scraping Dialog - only show when auto-adding to community */}
      {autoAddToCommunity && scrapingCompanyName && (
        <ScrapingDialog
          open={showScrapingDialog}
          onOpenChange={(open) => {
            setShowScrapingDialog(open);
            if (!open && onSuccess) {
              onSuccess(scrapingCompanyName);
            }
          }}
          companyName={scrapingCompanyName}
          communityName={autoAddToCommunity}
          onComplete={() => {
            if (onSuccess) {
              onSuccess(scrapingCompanyName);
            }
          }}
        />
      )}
    </Dialog>
  );
}
