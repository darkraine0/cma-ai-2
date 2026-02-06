"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import API_URL from "../config";

export type ScrapingStatus = "idle" | "loading" | "success" | "error";

export interface ScrapingJob {
  companyName: string;
  communityName: string;
  subcommunities?: string[];
  status: ScrapingStatus;
  error?: string | null;
  onComplete?: () => void;
}

interface ScrapingProgressContextValue {
  job: ScrapingJob | null;
  startBackgroundScraping: (params: {
    companyName: string;
    communityName: string;
    subcommunities?: string[];
    onComplete?: () => void;
  }) => void;
}

const ScrapingProgressContext = createContext<ScrapingProgressContextValue | null>(null);

async function runScrape(params: {
  companyName: string;
  communityName: string;
  subcommunities?: string[];
}): Promise<void> {
  const { companyName, communityName, subcommunities } = params;

  if (subcommunities && subcommunities.length > 0) {
    for (const subcommunity of subcommunities) {
      const res = await fetch(API_URL + "/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companyName, community: subcommunity }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Failed to scrape plans");
      }
    }
  } else {
    const res = await fetch(API_URL + "/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: companyName, community: communityName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to scrape plans");
    }
  }
}

export function ScrapingProgressProvider({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<ScrapingJob | null>(null);

  const startBackgroundScraping = useCallback(
    (params: {
      companyName: string;
      communityName: string;
      subcommunities?: string[];
      onComplete?: () => void;
    }) => {
      setJob({
        companyName: params.companyName,
        communityName: params.communityName,
        subcommunities: params.subcommunities,
        status: "loading",
        onComplete: params.onComplete,
      });

      runScrape({
        companyName: params.companyName,
        communityName: params.communityName,
        subcommunities: params.subcommunities,
      })
        .then(() => {
          setJob((prev) =>
            prev ? { ...prev, status: "success", error: null } : null
          );
          setTimeout(() => {
            setJob((prev) => {
              const onComplete = prev?.onComplete;
              if (onComplete) setTimeout(onComplete, 0);
              return null;
            });
          }, 2000);
        })
        .catch((err: Error) => {
          setJob((prev) =>
            prev
              ? { ...prev, status: "error", error: err.message || "Scraping failed" }
              : null
          );
          setTimeout(() => {
            setJob((prev) => {
              const onComplete = prev?.onComplete;
              if (onComplete) setTimeout(onComplete, 0);
              return null;
            });
          }, 5000);
        });
    },
    []
  );

  return (
    <ScrapingProgressContext.Provider value={{ job, startBackgroundScraping }}>
      {children}
      <ScrapingProgressBar />
    </ScrapingProgressContext.Provider>
  );
}

function ScrapingProgressBar() {
  const ctx = useContext(ScrapingProgressContext);
  const job = ctx?.job ?? null;

  if (!job) return null;

  const label =
    job.subcommunities && job.subcommunities.length > 0
      ? `${job.companyName} – ${job.communityName} (${job.subcommunities.length} subcommunities)`
      : `${job.companyName} – ${job.communityName}`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-center gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {job.status === "loading" && (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          )}
          {job.status === "success" && (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          )}
          {job.status === "error" && (
            <XCircle className="h-5 w-5 shrink-0 text-destructive" />
          )}
          <span className="truncate text-sm font-medium">
            {job.status === "loading" && "Scraping plans..."}
            {job.status === "success" && "Scraping completed"}
            {job.status === "error" && "Scraping failed"}
          </span>
          <span className="truncate text-sm text-muted-foreground">{label}</span>
          {job.status === "error" && job.error && (
            <span className="truncate text-xs text-destructive">{job.error}</span>
          )}
        </div>
      </div>
      {/* Indeterminate progress bar when loading */}
      {job.status === "loading" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden bg-muted">
          <div className="h-full w-1/3 animate-shimmer rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
}

export function useScrapingProgress(): ScrapingProgressContextValue {
  const ctx = useContext(ScrapingProgressContext);
  return ctx ?? { job: null, startBackgroundScraping: () => {} };
}
