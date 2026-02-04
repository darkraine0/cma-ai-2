"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Plus, Loader2, X } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import API_URL from "../config";
import { getCompanyColor } from "../utils/colors";

interface Company {
  _id: string;
  name: string;
}

interface CommunityOption {
  _id: string;
  name: string;
}

interface AddSubcommunityModalProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  /** When set, parent is fixed and we only select an existing community to link as subcommunity */
  defaultParentId?: string | null;
}

export default function AddSubcommunityModal({
  onSuccess,
  trigger,
  defaultParentId,
}: AddSubcommunityModalProps) {
  const [open, setOpen] = useState(false);
  const [linkableCommunities, setLinkableCommunities] = useState<CommunityOption[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);
  const [companySelectValue, setCompanySelectValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setSelectedCommunityId("");
    setDescription("");
    setLocation("");
    setSelectedCompanies([]);
    setCompanySelectValue("");
    setError("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      setOpen(newOpen);
      if (!newOpen) resetForm();
      else loadInitialData();
    }
  };

  const loadInitialData = async () => {
    if (!defaultParentId) return;
    setLoadingData(true);
    setError("");
    try {
      const [communitiesRes, companiesRes] = await Promise.all([
        fetch(API_URL + "/communities?linkableAsSubcommunity=true"),
        fetch(API_URL + "/companies"),
      ]);
      if (!communitiesRes.ok) {
        setError("Failed to load communities");
        setLinkableCommunities([]);
      } else {
        const noParent: CommunityOption[] = await communitiesRes.json();
        const linkable = noParent.filter((c) => c._id !== defaultParentId);
        setLinkableCommunities(linkable);
      }
      if (companiesRes.ok) {
        const comps = await companiesRes.json();
        setCompanies(comps);
      }
    } catch {
      setError("Failed to load data");
      setLinkableCommunities([]);
    } finally {
      setLoadingData(false);
    }
  };

  const addCompany = (company: Company) => {
    if (selectedCompanies.some((c) => c._id === company._id)) return;
    setSelectedCompanies((prev) => [...prev, company]);
    setCompanySelectValue("");
  };

  const removeCompany = (companyId: string) => {
    setSelectedCompanies((prev) => prev.filter((c) => c._id !== companyId));
  };

  const handleSubmit = async () => {
    const parentId = defaultParentId;
    if (!parentId) {
      setError("Parent community is required");
      return;
    }
    if (!selectedCommunityId) {
      setError("Please select a community to add as subcommunity");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/communities/${selectedCommunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentCommunityId: parentId,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link subcommunity");

      for (const company of selectedCompanies) {
        try {
          await fetch(`${API_URL}/communities/${selectedCommunityId}/companies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId: company._id }),
          });
        } catch {
          // continue with other companies
        }
      }

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const availableCompanies = companies.filter(
    (c) => !selectedCompanies.some((s) => s._id === c._id)
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Subcommunity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-left">
          <DialogTitle>Add Subcommunity</DialogTitle>
        </DialogHeader>
        <DialogClose />

        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-2">Subcommunity *</label>
            <select
              value={selectedCommunityId}
              onChange={(e) => setSelectedCommunityId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading || loadingData}
            >
              <option value="">Select community to add as subcommunity...</option>
              {linkableCommunities.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Only communities that are not already a parent and have no parent are listed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Builders (Companies)</label>
            <select
              value={companySelectValue}
              onChange={(e) => {
                const id = e.target.value;
                if (id) {
                  const company = companies.find((c) => c._id === id);
                  if (company) addCompany(company);
                }
                setCompanySelectValue("");
              }}
              className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading || loadingData}
            >
              <option value="">Add builder...</option>
              {availableCompanies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {selectedCompanies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedCompanies.map((company) => {
                  const color = getCompanyColor(company.name);
                  return (
                    <span
                      key={company._id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium border bg-background"
                      style={{ borderColor: color }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      {company.name}
                      <button
                        type="button"
                        onClick={() => removeCompany(company._id)}
                        className="ml-0.5 rounded p-0.5 hover:bg-muted"
                        aria-label={`Remove ${company.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading || loadingData}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Celina, Texas"
              className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading || loadingData}
            />
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={loading || loadingData || !selectedCommunityId}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Subcommunity
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
