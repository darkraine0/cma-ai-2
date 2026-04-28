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
import { Checkbox } from "./ui/checkbox";
import { Loader2 } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import { useScrapingProgress } from "../contexts/ScrapingProgressContext";
import API_URL from '../config';
import { cn } from "@/app/utils/utils";

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
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { startBackgroundScraping } = useScrapingProgress();

  // Map current subcommunity names to community IDs. Parent assignment is managed
  // outside this modal (Add Company flow), so this modal only lists subcommunities.
  const getCurrentIds = (data: Subcommunity[]) => {
    const ids = new Set<string>();
    for (const name of currentSubcommunities) {
      if (name === parentCommunityName) continue;
      const sub = data.find((s) => s.name === name);
      if (sub) ids.add(sub._id);
    }
    return ids;
  };

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
        setSelectedCommunityIds(getCurrentIds(data));
      } catch (err: any) {
        setError(err.message || "Failed to load subcommunities");
      } finally {
        setLoading(false);
      }
    };

    fetchSubcommunities();
  }, [open, parentCommunityId, currentSubcommunities, parentCommunityName]);

  const handleToggleCommunity = (communityId: string) => {
    setSelectedCommunityIds((prev) => {
      const next = new Set(prev);
      if (next.has(communityId)) next.delete(communityId);
      else next.add(communityId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!companyId) {
      setError("Company ID is required");
      return;
    }
    if (selectedCommunityIds.size === 0) {
      setError("Select at least one community");
      return;
    }

    const originalIds = getCurrentIds(subcommunities);
    const sameSelection =
      originalIds.size === selectedCommunityIds.size &&
      [...originalIds].every((id) => selectedCommunityIds.has(id));
    if (sameSelection) {
      onOpenChange(false);
      if (onSuccess) onSuccess();
      return;
    }

    setSaving(true);
    setError("");

    try {
      const toRemove = [...originalIds].filter((id) => !selectedCommunityIds.has(id));
      const toAdd = [...selectedCommunityIds].filter((id) => !originalIds.has(id));

      for (const communityId of toRemove) {
        const res = await fetch(
          `${API_URL}/communities/${communityId}/companies?companyId=${companyId}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to remove company from community");
        }
      }

      for (const communityId of toAdd) {
        const res = await fetch(`${API_URL}/communities/${communityId}/companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add company to community");
        }
      }

      const selectedNames: string[] = [];
      for (const sub of subcommunities) {
        if (selectedCommunityIds.has(sub._id)) selectedNames.push(sub.name);
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
      if (selectedNames.length > 0) {
        startBackgroundScraping({
          companyName,
          communityName: parentCommunityName,
          subcommunities: selectedNames,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to update subcommunity assignment");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    const originalIds = getCurrentIds(subcommunities);
    if (originalIds.size !== selectedCommunityIds.size) return true;
    return [...originalIds].some((id) => !selectedCommunityIds.has(id));
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
          ) : subcommunities.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {parentCommunityName} has no subcommunities yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto py-2">
              {subcommunities.map((sub) => (
                <label
                  key={sub._id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
                    selectedCommunityIds.has(sub._id)
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <Checkbox
                    checked={selectedCommunityIds.has(sub._id)}
                    onCheckedChange={() => handleToggleCommunity(sub._id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
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
                </label>
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
              disabled={loading || saving || selectedCommunityIds.size === 0 || !hasChanges()}
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
