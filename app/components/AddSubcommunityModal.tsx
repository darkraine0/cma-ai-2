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
import { Plus, Loader2 } from "lucide-react";
import ErrorMessage from "./ErrorMessage";
import API_URL from "../config";

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
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setSelectedCommunityId("");
    setDescription("");
    setLocation("");
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
      const communitiesRes = await fetch(API_URL + "/communities?linkableAsSubcommunity=true");
      if (!communitiesRes.ok) {
        setError("Failed to load communities");
        setLinkableCommunities([]);
      } else {
        const noParent: CommunityOption[] = await communitiesRes.json();
        const linkable = noParent.filter((c) => c._id !== defaultParentId);
        setLinkableCommunities(linkable);
      }
    } catch {
      setError("Failed to load data");
      setLinkableCommunities([]);
    } finally {
      setLoadingData(false);
    }
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

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle>Add Subcommunity</DialogTitle>
        </DialogHeader>
        <DialogClose />

        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium mb-3">Select Community *</label>
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : linkableCommunities.length === 0 ? (
              <div className="text-center py-6 px-4 bg-muted/50 rounded-lg border-2 border-dashed border-border">
                <p className="text-sm text-muted-foreground">
                  No available communities to link as subcommunity.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {linkableCommunities.map((community) => (
                  <div
                    key={community._id}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedCommunityId === community._id
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                    onClick={() => setSelectedCommunityId(community._id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{community.name}</span>
                      {selectedCommunityId === community._id && (
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
            <p className="text-xs text-muted-foreground mt-2">
              Available communities that can be linked as subcommunities
            </p>
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
