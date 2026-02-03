import { useState, useEffect } from "react";
import API_URL from "../../config";
import { Community, Plan } from "../types";

interface UseCommunityDataReturn {
  community: Community | null;
  plans: Plan[];
  childCommunities: Community[];
  loading: boolean;
  error: string;
  refetch: () => void;
}

// Cache for communities list
let communitiesCache: Community[] | null = null;

export function useCommunityData(communitySlug: string): UseCommunityDataReturn {
  const [community, setCommunity] = useState<Community | null>(() => {
    // Try to get from sessionStorage on initial load
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`community_${communitySlug}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return null;
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [childCommunities, setChildCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCommunity = async () => {
    try {
      let communities: Community[];
      
      // Use cached communities if available
      if (communitiesCache) {
        communities = communitiesCache;
      } else {
        const res = await fetch(API_URL + "/communities");
        if (!res.ok) throw new Error("Failed to fetch communities");
        communities = await res.json();
        communitiesCache = communities;
      }

      const foundCommunity = communities.find(comm => {
        const firstWord = comm.name.split(' ')[0].toLowerCase();
        return firstWord === communitySlug;
      });

      if (foundCommunity) {
        setCommunity(foundCommunity);
        // Cache in sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`community_${communitySlug}`, JSON.stringify(foundCommunity));
        }
      } else {
        setCommunity(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch community:", err);
    }
  };

  const fetchChildCommunities = async (parentId: string) => {
    try {
      const res = await fetch(`${API_URL}/communities?parentId=${parentId}`);
      if (!res.ok) return;
      const data: Community[] = await res.json();
      setChildCommunities(data);
    } catch {
      setChildCommunities([]);
    }
  };

  const fetchPlans = async () => {
    if (!community?._id) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/communities/${community._id}/plans`);
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data: Plan[] = await res.json();
      setPlans(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (communitySlug) {
      // Only fetch if not already loaded from cache
      if (!community) {
        fetchCommunity();
      }
    }
  }, [communitySlug]);

  useEffect(() => {
    if (community?._id) {
      fetchPlans();
      fetchChildCommunities(community._id);
    } else {
      setChildCommunities([]);
    }
  }, [community?._id]);

  const refetch = () => {
    if (community?._id) {
      fetchPlans();
      fetchChildCommunities(community._id);
    }
  };

  return { community, plans, childCommunities, loading, error, refetch };
}
