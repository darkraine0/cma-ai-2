"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2, X, ChevronRight } from "lucide-react";

export interface ExternalCommunity {
  id: number;
  name: string;
  plan: number;
  now: number;
}

export interface MarketMapCommunity {
  _id?: string | null;
  name: string;
  totalPlans?: number;
  totalNow?: number;
  v1ExternalCommunityId?: number | null;
  v1ExternalCommunityName?: string | null;
}

export interface CommunityMatch {
  marketMapName: string;
  externalId: number;
  externalName: string;
}

/** Find API communities that might match a MarketMap name (e.g. "Cambridge" for "Cambridge Crossing"). */
function suggestMatches(
  marketMapName: string,
  externalList: ExternalCommunity[]
): ExternalCommunity[] {
  const a = marketMapName.toLowerCase().trim();
  const words = a.split(/\s+/).filter((w) => w.length > 1);
  return externalList.filter((ext) => {
    const b = ext.name.toLowerCase().trim();
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const firstWord = words[0];
    if (firstWord && b.startsWith(firstWord)) return true;
    if (b.split(/\s+/)[0] === firstWord) return true;
    return false;
  });
}

interface MatchCommunityNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketMapCommunities: MarketMapCommunity[];
  onSuccess?: () => void;
}

export default function MatchCommunityNameModal({
  open,
  onOpenChange,
  marketMapCommunities,
  onSuccess,
}: MatchCommunityNameModalProps) {
  const [externalCommunities, setExternalCommunities] = useState<ExternalCommunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarketMap, setSelectedMarketMap] = useState<string | null>(null);
  const [selectedExternalId, setSelectedExternalId] = useState<number | null>(null);
  const [matches, setMatches] = useState<CommunityMatch[]>([]);
  const scrollToMatchedRef = useRef<HTMLLIElement | null>(null);
  const scrollToV1Ref = useRef<HTMLLIElement | null>(null);

  // Load initial matches from DB (marketMapCommunities with v1 mapping)
  useEffect(() => {
    if (!open || !marketMapCommunities.length) return;
    const initial = marketMapCommunities
      .filter((c) => c.v1ExternalCommunityId != null && c.v1ExternalCommunityName)
      .map((c) => ({
        marketMapName: c.name,
        externalId: c.v1ExternalCommunityId!,
        externalName: c.v1ExternalCommunityName!,
      }));
    setMatches(initial);
  }, [open, marketMapCommunities]);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setLoading(true);
    setExternalCommunities([]);
    setSelectedMarketMap(null);
    setSelectedExternalId(null);

    fetch("/api/external/get-communities")
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body) => {
            throw new Error(body?.message || body?.error || "Failed to fetch communities");
          });
        }
        return res.json();
      })
      .then((data: ExternalCommunity[]) => {
        setExternalCommunities(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load communities from API");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  const matchedMarketMapNames = useMemo(
    () => new Set(matches.map((m) => m.marketMapName)),
    [matches]
  );
  const matchedExternalIds = useMemo(
    () => new Set(matches.map((m) => m.externalId)),
    [matches]
  );

  // When a left-side community is selected, which V1 API (middle) row to highlight and scroll to
  const highlightedExternalId = useMemo(() => {
    if (!selectedMarketMap) return null;
    const existing = matches.find((m) => m.marketMapName === selectedMarketMap);
    if (existing) return existing.externalId;
    const suggested = suggestMatches(selectedMarketMap, externalCommunities);
    return suggested[0]?.id ?? null;
  }, [selectedMarketMap, matches, externalCommunities]);

  const handleSelectMarketMap = (name: string) => {
    setSelectedMarketMap((prev) => (prev === name ? null : name));
    setSelectedExternalId(null);
  };

  const getCommunityId = (marketMapName: string): string | null => {
    const c = marketMapCommunities.find((m) => m.name === marketMapName);
    return c?._id ?? null;
  };

  const handleSelectExternal = async (ext: ExternalCommunity) => {
    if (selectedMarketMap) {
      const communityId = getCommunityId(selectedMarketMap);
      const newMatch = { marketMapName: selectedMarketMap, externalId: ext.id, externalName: ext.name };
      setMatches((prev) => {
        const without = prev.filter((m) => m.marketMapName !== selectedMarketMap);
        return [...without, newMatch];
      });
      setSelectedMarketMap(null);
      setSelectedExternalId(null);

      if (communityId) {
        setSaving(true);
        setError(null);
        try {
          const res = await fetch(`/api/communities/${communityId}`, {
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
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save match");
          setMatches((prev) => prev.filter((m) => m.marketMapName !== selectedMarketMap));
        } finally {
          setSaving(false);
        }
      }
    } else {
      setSelectedExternalId((prev) => (prev === ext.id ? null : ext.id));
    }
  };

  const removeMatch = async (marketMapName: string) => {
    const communityId = getCommunityId(marketMapName);
    setMatches((prev) => prev.filter((m) => m.marketMapName !== marketMapName));

    if (communityId) {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/communities/${communityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            v1ExternalCommunityId: null,
            v1ExternalCommunityName: null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || data.message || "Failed to remove match");
        }
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove match");
        const comm = marketMapCommunities.find((c) => c.name === marketMapName);
        if (comm?.v1ExternalCommunityId != null && comm?.v1ExternalCommunityName) {
          setMatches((prev) => [
            ...prev,
            { marketMapName, externalId: comm.v1ExternalCommunityId!, externalName: comm.v1ExternalCommunityName! },
          ]);
        }
      } finally {
        setSaving(false);
      }
    }
  };

  // When user selects a community on the left that has a match, scroll the Matched list to show it
  useEffect(() => {
    if (!selectedMarketMap || matches.length === 0) return;
    const hasMatch = matches.some((m) => m.marketMapName === selectedMarketMap);
    if (hasMatch) {
      scrollToMatchedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedMarketMap, matches]);

  // When left selection changes, scroll middle (V1 API) column to the corresponding community
  useEffect(() => {
    if (selectedMarketMap && highlightedExternalId != null) {
      scrollToV1Ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedMarketMap, highlightedExternalId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="mb-1">
          <DialogTitle>Match Community Name</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-3">
          Select one on the left (MarketMap), then its match in the middle (V1 API). Matched pairs appear on the right and are saved to the database.
        </p>
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded mb-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Left: MarketMap communities */}
          <div className="flex flex-col min-w-0 overflow-hidden">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Communities (MarketMap / this project)
            </h3>
            <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 min-h-[280px]">
              {marketMapCommunities.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No communities in MarketMap.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {marketMapCommunities.map((c) => {
                    const plans = c.totalPlans ?? 0;
                    const now = c.totalNow ?? 0;
                    const total = plans + now;
                    const isSelected = selectedMarketMap === c.name;
                    const isMatched = matchedMarketMapNames.has(c.name);
                    const suggested = externalCommunities.length
                      ? suggestMatches(c.name, externalCommunities)
                      : [];
                    return (
                      <li key={c.name}>
                        <button
                          type="button"
                          onClick={() => handleSelectMarketMap(c.name)}
                          className={`w-full text-left flex flex-col gap-1 px-4 py-3 transition-colors rounded-none ${
                            isSelected
                              ? "bg-primary/15 border-l-4 border-primary border-l-primary"
                              : isMatched
                                ? "bg-muted/50 hover:bg-muted"
                                : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{c.name}</span>
                            {total > 0 && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                plan: {plans} · now: {now}
                              </span>
                            )}
                          </div>
                          {suggested.length > 0 && !isMatched && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              <span className="text-xs text-muted-foreground">Likely match:</span>
                              {suggested.slice(0, 3).map((ext) => (
                                <span
                                  key={ext.id}
                                  className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium"
                                >
                                  {ext.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {isMatched && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Matched
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right: API communities */}
          <div className="flex flex-col min-w-0 overflow-hidden">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Communities (V1 API)
            </h3>
            <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 min-h-[280px]">
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
              {!loading && externalCommunities.length > 0 && (
                <ul className="divide-y divide-border">
                  {externalCommunities.map((ext) => {
                    const isSelected = selectedExternalId === ext.id;
                    const isHighlighted = ext.id === highlightedExternalId;
                    const isMatched = matchedExternalIds.has(ext.id);
                    return (
                      <li key={ext.id} ref={isHighlighted ? scrollToV1Ref : undefined}>
                        <button
                          type="button"
                          onClick={() => handleSelectExternal(ext)}
                          className={`w-full text-left flex items-center justify-between gap-2 px-4 py-3 transition-colors rounded-none ${
                            isSelected || isHighlighted
                              ? "bg-primary/15 border-l-4 border-primary border-l-primary"
                              : isMatched
                                ? "bg-muted/50 hover:bg-muted opacity-90"
                                : "hover:bg-muted/50"
                          }`}
                        >
                          <span className="font-medium truncate">{ext.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            plan: {ext.plan} · now: {ext.now}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right: Matched pairs */}
          <div className="flex flex-col min-w-0 overflow-hidden">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Matched ({matches.length})
            </h3>
            <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 min-h-[280px]">
              {matches.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No matches yet. Select left, then middle.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {matches.map((m) => {
                    const isSelected = m.marketMapName === selectedMarketMap;
                    return (
                    <li
                      key={m.marketMapName}
                      ref={isSelected ? scrollToMatchedRef : undefined}
                      className={`flex items-center justify-between gap-2 py-2 px-3 hover:bg-muted/50 ${
                        isSelected ? "bg-primary/15 border-l-4 border-l-primary" : ""
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs min-w-0 flex-1">
                        <span className="font-medium truncate">{m.marketMapName}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground truncate">{m.externalName}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMatch(m.marketMapName)}
                        aria-label="Remove match"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </span>
            ) : selectedMarketMap ? (
              "Now click a community in the middle (V1 API) to link."
            ) : (
              "Click a community on the left to start."
            )}
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
