"use client";

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
import { Plus, Loader2, X } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import API_URL from "../config";
import { getCompanyColor } from "../utils/colors";

interface Company {
  _id: string;
  name: string;
}

interface ParentCommunity {
  _id: string;
  name: string;
}

interface AddSubcommunityModalProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  /** When set, parent community is pre-selected (e.g. when opening from a community's detail card) */
  defaultParentId?: string | null;
}

export default function AddSubcommunityModal({
  onSuccess,
  trigger,
  defaultParentId,
}: AddSubcommunityModalProps) {
  const [open, setOpen] = useState(false);
  const [parentCommunities, setParentCommunities] = useState<ParentCommunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [subcommunityName, setSubcommunityName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);
  const [companySelectValue, setCompanySelectValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setSelectedParentId(defaultParentId || "");
    setSubcommunityName("");
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
    setLoadingData(true);
    setError("");
    try {
      const [parentsRes, companiesRes] = await Promise.all([
        fetch(API_URL + "/communities?parentsOnly=true"),
        fetch(API_URL + "/companies"),
      ]);
      if (parentsRes.ok) {
        const parents = await parentsRes.json();
        setParentCommunities(parents.map((c: any) => ({ _id: c._id, name: c.name })));
      }
      if (companiesRes.ok) {
        const comps = await companiesRes.json();
        setCompanies(comps);
      }
      setSelectedParentId(defaultParentId || "");
    } catch {
      setError("Failed to load parents or companies");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (open && defaultParentId && parentCommunities.length > 0) {
      setSelectedParentId(defaultParentId);
    }
  }, [open, defaultParentId, parentCommunities.length]);

  const addCompany = (company: Company) => {
    if (selectedCompanies.some((c) => c._id === company._id)) return;
    setSelectedCompanies((prev) => [...prev, company]);
    setCompanySelectValue("");
  };

  const removeCompany = (companyId: string) => {
    setSelectedCompanies((prev) => prev.filter((c) => c._id !== companyId));
  };

  const handleSubmit = async () => {
    const name = subcommunityName.trim();
    const parentId = defaultParentId || selectedParentId;
    if (!name) {
      setError("Subcommunity name is required");
      return;
    }
    if (!parentId) {
      setError("Please select a parent community");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          parentCommunityId: parentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add subcommunity");

      const newCommunityId = data._id;
      for (const company of selectedCompanies) {
        try {
          await fetch(`${API_URL}/communities/${newCommunityId}/companies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId: company._id }),
          });
        } catch {
          // continue
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
        <DialogHeader>
          <DialogTitle>Add Subcommunity</DialogTitle>
        </DialogHeader>
        <DialogClose />

        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-2">Subcommunity Name *</label>
            <input
              type="text"
              value={subcommunityName}
              onChange={(e) => setSubcommunityName(e.target.value)}
              placeholder="e.g., Cross Creek Meadows"
              className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading || loadingData}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Builders (Companies)</label>
            <div className="flex flex-wrap gap-2 p-3 rounded-md border-2 border-border bg-muted/30 min-h-[52px]">
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
                className="flex-1 min-w-[120px] px-2 py-1 rounded border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loading || loadingData}
              >
                <option value="">Add builder...</option>
                {availableCompanies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
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
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                loadingData ||
                !subcommunityName.trim() ||
                !(defaultParentId || selectedParentId)
              }
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
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
