"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface V1Community {
  id: number;
  name: string;
  plan: number;
  now: number;
}

interface V1CommunitiesContextValue {
  communities: V1Community[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const V1CommunitiesContext = createContext<V1CommunitiesContextValue | null>(null);

export function V1CommunitiesProvider({ children }: { children: React.ReactNode }) {
  const [communities, setCommunities] = useState<V1Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/external/get-communities");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || body?.error || "Failed to fetch communities");
      }
      const data = await res.json();
      setCommunities(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load communities from API");
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const value: V1CommunitiesContextValue = {
    communities,
    loading,
    error,
    refetch: fetchCommunities,
  };

  return (
    <V1CommunitiesContext.Provider value={value}>
      {children}
    </V1CommunitiesContext.Provider>
  );
}

export function useV1Communities(): V1CommunitiesContextValue {
  const ctx = useContext(V1CommunitiesContext);
  if (!ctx) {
    throw new Error("useV1Communities must be used within V1CommunitiesProvider");
  }
  return ctx;
}
