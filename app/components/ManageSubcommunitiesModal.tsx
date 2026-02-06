"use client"

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Loader2 } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import { useScrapingProgress } from "../contexts/ScrapingProgressContext";
import API_URL from '../config';

interface Subcommunity {
  _id: string;
  name: string;
  location?: string;
}

interface ManageSubcommunitiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  companyName: string;
  parentCommunityId: string;
  parentCommunityName: string;
  currentSubcommunities: string[]; // Array of subcommunity names
  onSuccess?: () => void;
}

export default function ManageSubcommunitiesModal({
  open,
  onOpenChange,
  companyId,
  companyName,
  parentCommunityId,
  parentCommunityName,
  currentSubcommunities,
  onSuccess,
}: ManageSubcommunitiesModalProps) {
  const [subcommunities, setSubcommunities] = useState<Subcommunity[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null); // Single selection
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { startBackgroundScraping } = useScrapingProgress();

  // Fetch available subcommunities when modal opens
  useEffect(() => {
    if (!open || !parentCommunityId) return;

    const fetchSubcommunities = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/communities?parentId=${parentCommunityId}`);
        if (!res.ok) throw new Error("Failed to fetch subcommunities");
        
        const data: Subcommunity[] = await res.json();
        setSubcommunities(data);

        // Pre-select the current assignment
        // If company is in a subcommunity, select that subcommunity
        // Otherwise, select the parent community
        if (currentSubcommunities.length > 0) {
          const matchingSub = data.find((sub) => currentSubcommunities.includes(sub.name));
          setSelectedCommunityId(matchingSub ? matchingSub._id : parentCommunityId);
        } else {
          setSelectedCommunityId(parentCommunityId);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load subcommunities");
      } finally {
        setLoading(false);
      }
    };

    fetchSubcommunities();
  }, [open, parentCommunityId, currentSubcommunities]);

  const handleSelectCommunity = (communityId: string) => {
    setSelectedCommunityId(communityId);
  };

  const handleSave = async () => {
    if (!companyId || !selectedCommunityId) {
      setError("Company ID and selection are required");
      return;
    }

    setSaving(true);
    setError("");
    
    try {
      const originalSubcommunity = subcommunities.find((sub) => 
        currentSubcommunities.includes(sub.name)
      );
      const originalCommunityId = originalSubcommunity?._id || parentCommunityId;

      // If no change, just close
      if (selectedCommunityId === originalCommunityId) {
        onOpenChange(false);
        if (onSuccess) onSuccess();
        return;
      }

      let newCommunityName: string | null = null;

      // Remove from original location (if it was in a subcommunity)
      if (originalSubcommunity) {
        const res = await fetch(
          `${API_URL}/communities/${originalSubcommunity._id}/companies?companyId=${companyId}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to remove company from original subcommunity");
        }
      }

      // Add to new location (if it's a subcommunity, not parent)
      if (selectedCommunityId !== parentCommunityId) {
        const res = await fetch(`${API_URL}/communities/${selectedCommunityId}/companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add company to subcommunity");
        }
        const selectedSub = subcommunities.find((sub) => sub._id === selectedCommunityId);
        if (selectedSub) {
          newCommunityName = selectedSub.name;
        }
      } else {
        // If moving to parent, use parent name
        newCommunityName = parentCommunityName;
      }

      // Refresh parent once, then run scraping in background (no refresh when done)
      if (newCommunityName) {
        onOpenChange(false);
        if (onSuccess) onSuccess();
        startBackgroundScraping({
          companyName,
          communityName: parentCommunityName,
          subcommunities: [newCommunityName],
        });
      } else {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update subcommunity assignment");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    const originalSubcommunity = subcommunities.find((sub) => 
      currentSubcommunities.includes(sub.name)
    );
    const originalCommunityId = originalSubcommunity?._id || parentCommunityId;
    
    return selectedCommunityId !== originalCommunityId;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Community Name</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Which name does <strong>{companyName}</strong> use for this location?
            </p>
          </DialogHeader>

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto py-2">
              {/* Parent Community Option */}
              <div
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedCommunityId === parentCommunityId
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
                onClick={() => handleSelectCommunity(parentCommunityId)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{parentCommunityName}</span>
                      {currentSubcommunities.length === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                  {selectedCommunityId === parentCommunityId && (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Subcommunities */}
              {subcommunities.map((sub) => (
                <div
                  key={sub._id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedCommunityId === sub._id
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                  onClick={() => handleSelectCommunity(sub._id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{sub.name}</span>
                        {currentSubcommunities.includes(sub.name) && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      {sub.location && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {sub.location}
                        </p>
                      )}
                    </div>
                    {selectedCommunityId === sub._id && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={loading || saving || !hasChanges()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save & Rescrape"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
