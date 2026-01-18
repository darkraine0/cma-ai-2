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
import { Plus, Search, Loader2 } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import AddCompanyModal from "./AddCompanyModal";
import ScrapingDialog from "./ScrapingDialog";
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

interface SelectCompanyModalProps {
  communityId?: string; // Community ID (preferred)
  communityName?: string; // Community name (fallback for plan-derived communities)
  existingCompanies: string[]; // Array of company names already in the community
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export default function SelectCompanyModal({
  communityId,
  communityName,
  existingCompanies,
  onSuccess,
  trigger,
}: SelectCompanyModalProps) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addingCompanyId, setAddingCompanyId] = useState<string | null>(null);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showScrapingDialog, setShowScrapingDialog] = useState(false);
  const [scrapingCompanyName, setScrapingCompanyName] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchCompanies();
    }
  }, [open, existingCompanies]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCompanies(companies);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCompanies(
        companies.filter(
          (company) =>
            company.name.toLowerCase().includes(query) ||
            company.description?.toLowerCase().includes(query) ||
            company.headquarters?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, companies]);

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Filter out companies that are already in the community (case-insensitive)
  const existingCompaniesLower = existingCompanies.map(c => c.trim().toLowerCase());
  const availableCompanies = filteredCompanies.filter(
    (company) => !existingCompaniesLower.includes(company.name.trim().toLowerCase())
  );

  const handleAddCompany = async (company: Company) => {
    if (!communityId && (!communityName || !communityName.trim() || communityName === 'undefined')) {
      setError("Invalid community ID or name");
      return;
    }

    if (!company || !company.name || !company.name.trim()) {
      setError("Invalid company name");
      return;
    }

    setAddingCompanyId(company._id);
    setError("");
    try {
      // Use communityId if available, otherwise fall back to communityName
      // The route now handles both IDs and names
      const identifier = communityId || encodeURIComponent(communityName!.trim());
      const url = API_URL + `/communities/${identifier}/companies`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId: company._id }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMessage = data.error || "Failed to add company to community";
        // If company already exists, refresh the list and close modal
        if (data.error && data.error.includes("already in this community")) {
          // Refresh companies to update the list
          await fetchCompanies();
          setOpen(false);
          setSearchQuery("");
          if (onSuccess) {
            onSuccess();
          }
          return; // Don't throw error, just refresh and close
        }
        throw new Error(errorMessage);
      }

      // Company added successfully, now trigger scraping
      setOpen(false);
      setSearchQuery("");
      setScrapingCompanyName(company.name);
      setShowScrapingDialog(true);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setAddingCompanyId(null);
    }
  };

  const handleNewCompanyAdded = (companyName?: string) => {
    setShowAddCompanyModal(false);
    // Refresh companies list
    fetchCompanies();
    // If company was added, it should already be in the community via autoAddToCommunity
    // So we can close this modal and refresh
    if (companyName) {
      setOpen(false);
      setSearchQuery("");
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const handleAddCompanyModalOpenChange = (newOpen: boolean) => {
    setShowAddCompanyModal(newOpen);
    if (!newOpen) {
      // When AddCompanyModal closes, refresh the companies list
      fetchCompanies();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Company
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Company to {communityName || 'Community'}</DialogTitle>
          </DialogHeader>
          <DialogClose />

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Add New Company Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddCompanyModal(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Company
              </Button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Companies List */}
            {!loading && availableCompanies.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "No companies found matching your search."
                        : "No available companies to add. All companies are already in this community."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && availableCompanies.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {availableCompanies.map((company) => (
                  <Card
                    key={company._id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="inline-block w-3 h-3 rounded-full border"
                              style={{
                                backgroundColor: getCompanyColor(company.name),
                                borderColor: getCompanyColor(company.name),
                              }}
                            />
                            <h3 className="font-semibold">{company.name}</h3>
                          </div>
                          {company.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {company.description}
                            </p>
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
                            {company.website && (
                              <Badge variant="secondary" className="text-xs">
                                🌐 Website
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddCompany(company)}
                          disabled={addingCompanyId === company._id}
                          className="ml-4"
                        >
                          {addingCompanyId === company._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Adding...
                            </>
                          ) : (
                            "Add"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Company Modal */}
      <AddCompanyModal
        autoAddToCommunityId={communityId}
        autoAddToCommunity={communityName}
        onSuccess={handleNewCompanyAdded}
        open={showAddCompanyModal}
        onOpenChange={handleAddCompanyModalOpenChange}
        trigger={
          <div style={{ display: "none" }} />
        }
      />

      {/* Scraping Dialog */}
      {communityName && (
        <ScrapingDialog
          open={showScrapingDialog}
          onOpenChange={(open) => {
            setShowScrapingDialog(open);
            if (!open && onSuccess) {
              onSuccess();
            }
          }}
          companyName={scrapingCompanyName}
          communityName={communityName}
          onComplete={() => {
            if (onSuccess) {
              onSuccess();
            }
          }}
        />
      )}
    </>
  );
}

