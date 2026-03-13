"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, X, Search, RefreshCw } from "lucide-react";
import { useV1Communities } from "../contexts/V1CommunitiesContext";
import type { V1Community } from "../contexts/V1CommunitiesContext";

export type ExternalCommunity = V1Community;

export interface MarketMapCommunity {
  _id?: string | null;
  name: string;
  totalPlans?: number;
  totalNow?: number;
  v1ExternalCommunityId?: number | null;
  v1ExternalCommunityName?: string | null;
}

/** Single-community mode: set which V1 community matches the given MarketMap community. */
interface MatchCommunityNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The community to match (when opened from the Match Community Name section). */
  community: {
    _id: string;
    name: string;
    v1ExternalCommunityId?: number | null;
    v1ExternalCommunityName?: string | null;
  } | null;
  /** All MarketMap communities so we can show which V2 community is already matched to a given V1 community. */
  allCommunities?: MarketMapCommunity[];
  onSuccess?: () => void;
}

export default function MatchCommunityNameModal({
  open,
  onOpenChange,
  community,
  allCommunities,
  onSuccess,
}: MatchCommunityNameModalProps) {
  const { communities: externalCommunities, loading, error: fetchError, refetch } = useV1Communities();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      setError(null);
      setSearchQuery("");
    }
  }, [open]);

  const handleSelect = async (ext: ExternalCommunity) => {
    if (!community) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/communities/${community._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          v1ExternalCommunityId: ext.id,
          v1ExternalCommunityName: ext.name,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to save match");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save match");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!community) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/communities/${community._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          v1ExternalCommunityId: null,
          v1ExternalCommunityName: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to clear match");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear match");
    } finally {
      setSaving(false);
    }
  };

  const filteredCommunities = externalCommunities.filter((ext) =>
    ext.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  if (!community) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="mb-1">
          <DialogTitle>Match Community Name</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-2">
          Set which external (V1) community matches <strong>{community.name}</strong>.
        </p>
        {community.v1ExternalCommunityName && (
          <p className="text-sm mb-3">
            Matched <span className="font-semibold text-emerald-500">{community.v1ExternalCommunityName}</span>
          </p>
        )}
        {(error || fetchError) && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded mb-3">
            {error || fetchError}
          </div>
        )}

        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Communities (V1 API)
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
              disabled={loading}
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {!loading && externalCommunities.length > 0 && (
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search community name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 min-h-[240px]">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
            {!loading && externalCommunities.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No communities from API.
              </div>
            )}
            {!loading && externalCommunities.length > 0 && filteredCommunities.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No communities match &quot;{searchQuery.trim()}&quot;.
              </div>
            )}
            {!loading && filteredCommunities.length > 0 && (
              <ul className="divide-y divide-border">
                {filteredCommunities.map((ext) => {
                  const isCurrentMatch =
                    community.v1ExternalCommunityId != null &&
                    ext.id === community.v1ExternalCommunityId;
                  const matchedV2 =
                    allCommunities?.find((c) => c.v1ExternalCommunityId === ext.id) || null;
                  return (
                    <li key={ext.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(ext)}
                        disabled={saving}
                        className={`w-full text-left flex items-center justify-between gap-2 px-4 py-3 transition-colors rounded-none hover:bg-muted/50 ${
                          isCurrentMatch ? "bg-primary/15 border-l-4 border-primary" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{ext.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              plan: {ext.plan} · now: {ext.now}
                            </span>
                          </div>
                          {matchedV2 && (
                            <p className="text-xs mt-0.5">
                              Matched <span className="font-semibold text-emerald-400">{matchedV2.name}</span>
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {community.v1ExternalCommunityId != null && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={saving}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear match
              </Button>
            )}
            {saving && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
