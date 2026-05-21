"use client"

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent } from "../../../components/ui/card";
import { useToast } from "../../../components/ui/use-toast";
import ErrorMessage from "../../../components/ErrorMessage";
import ChartHeader from "./components/ChartHeader";
import PriceChart from "./components/PriceChart";
import ChartSkeleton from "./components/ChartSkeleton";
import { useCommunityData } from "../../hooks/useCommunityData";
import { formatCommunitySlug } from "../../utils/formatCommunityName";
import { getCompanyNames, extractCompanyName, normalizeCompanyNameForMatch } from "../../utils/companyHelpers";
import { useChartFilters } from "./hooks/useChartFilters";
import { getV1ProductLineLabel } from "../../utils/v1ProductLine";
import { isV1Version } from "../../utils/planVersion";
import API_URL from '../../../config';
import type { Community, CommunityCompany, Plan } from "../../types";
import { useAuth } from "../../../contexts/AuthContext";

export default function ChartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit =
    user?.permission === "editor" || user?.role === "admin";
  const [predictionEditMode, setPredictionEditMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [productLines, setProductLines] = useState<{ _id: string; name: string; label: string }[]>([]);
  const [productLinesLoading, setProductLinesLoading] = useState(false);
  const [selectedSubcommunityId, setSelectedSubcommunityId] = useState<string>("__all__");
  const [subcommunityPlansById, setSubcommunityPlansById] = useState<Record<string, Plan[]>>({});
  const [subcommunityPlansLoading, setSubcommunityPlansLoading] = useState(false);
  const [stableSubcommunityId, setStableSubcommunityId] = useState<string>("__all__");

  const communitySlug = params?.communityName
    ? decodeURIComponent(params.communityName as string).toLowerCase()
    : '';
  const formattedSlug = formatCommunitySlug(communitySlug);
  const urlType = searchParams?.get('type');

  // Fetch community and plans data (V2)
  const { community, plans, childCommunities, loading, error, refetch, updatePlan } =
    useCommunityData(communitySlug);

  const subcommunityOptions = useMemo(
    () =>
      Array.isArray(childCommunities)
        ? childCommunities
            .filter((c) => c?._id && c?.name)
            .map((c) => ({ _id: c._id, name: c.name }))
        : [],
    [childCommunities]
  );

  // Reset cached child plans when switching to a different route community.
  useEffect(() => {
    setSubcommunityPlansById({});
    setStableSubcommunityId("__all__");
  }, [communitySlug]);

  const displayCommunityId = useMemo(() => {
    if (!community?._id) return null;
    if (selectedSubcommunityId === "__all__") {
      return community._id;
    }
    return selectedSubcommunityId;
  }, [community?._id, selectedSubcommunityId]);

  const requiredChildIdsForAll = useMemo(() => {
    if (!Array.isArray(childCommunities) || childCommunities.length === 0) return [];
    return childCommunities.map((c) => c._id);
  }, [childCommunities]);

  const allChildPlansLoaded = useMemo(() => {
    if (requiredChildIdsForAll.length === 0) return true;
    return requiredChildIdsForAll.every((id) => subcommunityPlansById[id] !== undefined);
  }, [requiredChildIdsForAll, subcommunityPlansById]);

  // Avoid flicker when switching to "All": only switch once all child plan fetches are done.
  const effectiveSubcommunityId = useMemo(() => {
    if (selectedSubcommunityId !== "__all__") return selectedSubcommunityId;
    return allChildPlansLoaded ? "__all__" : stableSubcommunityId;
  }, [selectedSubcommunityId, allChildPlansLoaded, stableSubcommunityId]);

  // Track the last "stable" selection (data fully loaded) so we can keep the chart steady while loading.
  useEffect(() => {
    if (selectedSubcommunityId === "__all__") {
      if (allChildPlansLoaded) setStableSubcommunityId("__all__");
      return;
    }
    if (selectedSubcommunityId && subcommunityPlansById[selectedSubcommunityId] !== undefined) {
      setStableSubcommunityId(selectedSubcommunityId);
    }
  }, [selectedSubcommunityId, allChildPlansLoaded, subcommunityPlansById]);

  // Fetch V2 plans for child communities (so we can render builder lines split by subcommunity).
  useEffect(() => {
    if (!community?._id) return;
    if (!Array.isArray(childCommunities) || childCommunities.length === 0) return;

    const idsToFetch: string[] =
      selectedSubcommunityId === "__all__"
        ? childCommunities.map((c) => c._id)
        : selectedSubcommunityId
          ? [selectedSubcommunityId]
          : [];

    const missingIds = idsToFetch.filter((id) => subcommunityPlansById[id] === undefined);
    if (missingIds.length === 0) return;
    if (idsToFetch.length === 0) return;

    let cancelled = false;
    setSubcommunityPlansLoading(true);
    Promise.all(
      missingIds.map(async (id) => {
        try {
          const res = await fetch(`${API_URL}/communities/${id}/plans`);
          if (!res.ok) return { id, plans: [] as Plan[] };
          const data = (await res.json()) as Plan[];
          return { id, plans: Array.isArray(data) ? data : [] };
        } catch {
          return { id, plans: [] as Plan[] };
        }
      })
    )
      .then((results) => {
        if (cancelled) return;
        setSubcommunityPlansById((prev) => {
          const next = { ...prev };
          for (const r of results) next[r.id] = r.plans;
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setSubcommunityPlansLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [community?._id, childCommunities, selectedSubcommunityId, subcommunityPlansById]);

  const normalizeAddressLike = (value: string) => {
    const raw = String(value ?? "")
      .trim()
      // Split missing delimiter between house number and street name
      // (e.g. "332Sugarview" -> "332 Sugarview").
      .replace(/(\d)([a-zA-Z])/g, "$1 $2")
      // Split accidental camel-case joins (e.g. "RoadSugar" -> "Road Sugar")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      // Split merged street suffix + city token (e.g. "roadsugar" -> "road sugar")
      .replace(
        /\b(st|street|ave|avenue|blvd|boulevard|dr|drive|rd|road|ct|court|ln|lane|trl|trail|way|pkwy|parkway|cir|circle|pl|place|ter|terrace|hwy|highway)(?=[a-z])/g,
        "$1 "
      )
      .replace(/\s+/g, " ");
    if (!raw) return "";
    const tokens = raw.replace(/,/g, " ").split(" ").filter(Boolean);
    // Primary signature for address-like plan names:
    // use "house number + first 2 street words" so malformed tails
    // (city/zip/subdivision concatenation) do not break V1/V2 matching.
    if (/^\d+$/.test(tokens[0] || "") && tokens.length >= 3) {
      return tokens.slice(0, 3).join("");
    }
    // Keep street-level identity so these match:
    // "2228 Aspen Chase Dr." and "2228 Aspen Chase Dr. Royse City, Texas 75189"
    const streetWithSuffix = raw.match(
      /^(\d+\s+[a-z0-9\s'-]+?\b(?:st|street|ave|avenue|blvd|boulevard|dr|drive|rd|road|ct|court|ln|lane|trl|trail|way|pkwy|parkway|cir|circle|pl|place|ter|terrace|hwy|highway)\.?)\b/i
    )?.[1];
    const core = streetWithSuffix || raw.split(",")[0]?.trim() || raw;
    return core.replace(/[^a-z0-9]/g, "");
  };

  const getAddressRootSignature = (value: string) => {
    const cleaned = String(value ?? "")
      .trim()
      .replace(/(\d)([a-zA-Z])/g, "$1 $2")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .replace(
        /\b(st|street|ave|avenue|blvd|boulevard|dr|drive|rd|road|ct|court|ln|lane|trl|trail|way|pkwy|parkway|cir|circle|pl|place|ter|terrace|hwy|highway)(?=[a-z])/g,
        "$1 "
      )
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "";

    const tokens = cleaned.split(" ").filter(Boolean);
    const suffixes = new Set([
      "st", "street", "ave", "avenue", "blvd", "boulevard", "dr", "drive",
      "rd", "road", "ct", "court", "ln", "lane", "trl", "trail", "way",
      "pkwy", "parkway", "cir", "circle", "pl", "place", "ter", "terrace",
      "hwy", "highway",
    ]);

    const houseIdx = tokens.findIndex((t) => /\d/.test(t));
    if (houseIdx === -1) return "";

    const house = (tokens[houseIdx].match(/\d+/)?.[0] || "").trim();
    if (!house) return "";

    const parts: string[] = [];
    for (let i = houseIdx + 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (!/^[a-z0-9]+$/.test(token)) continue;
      // Stop once city/state/zip tail starts after we already captured street.
      if (parts.length >= 2 && /^[a-z]{2}\d*$/.test(token)) break;
      parts.push(token);
      if (suffixes.has(token) || parts.length >= 3) break;
    }

    if (parts.length === 0) return "";
    return `${house}${parts.join("")}`;
  };

  // Merge V1 + V2 plans: show all; for duplicates prefer V1 and set versionDisplay to V1&V2
  const getPlanDedupeKey = (plan: Plan) => {
    const nameOrAddress = (plan.address || plan.plan_name || "").trim();
    const addressRoot = getAddressRootSignature(nameOrAddress);
    if (addressRoot) return addressRoot;

    const normalizedAddress = normalizeAddressLike(nameOrAddress);
    const firstPart = nameOrAddress.split(",")[0].trim().toLowerCase();
    const baseName = normalizedAddress || firstPart.replace(/\s+/g, " ").replace(/\.+$/, "");
    const company = normalizeCompanyNameForMatch(extractCompanyName(plan.company));
    // Address-like rows are unique enough by street; avoids V1/V2 misses when company naming differs.
    const isAddressLike = /^\d/.test(firstPart);
    return isAddressLike ? baseName : `${baseName}|${company}`;
  };

  const plansForChartScope = useMemo((): Plan[] => {
    if (effectiveSubcommunityId === "__all__") {
      const childIds = (childCommunities ?? []).map((c) => c._id);
      const childPlans = childIds.flatMap((id) => subcommunityPlansById[id] ?? []);
      return [...plans, ...childPlans];
    }
    return subcommunityPlansById[effectiveSubcommunityId] ?? [];
  }, [effectiveSubcommunityId, childCommunities, subcommunityPlansById, plans]);

  /** V1 rows in DB may lack segment; add price-tier segment so product-line filter matches community page. */
  const enrichedChartPlans = useMemo(() => {
    return plansForChartScope.map((p) => {
      if (isV1Version(p.version) && !p.segment) {
        const label = getV1ProductLineLabel(Number(p.price ?? 0));
        if (label) return { ...p, segment: { _id: `v1-price-${label}`, name: label, label } };
      }
      return p;
    });
  }, [plansForChartScope]);

  // Merge V1 + V2 plans from DB; for duplicates prefer V1 and set versionDisplay to V1&V2
  const displayPlans = useMemo(() => {
    type AggregatedGroup = {
      hasV1: boolean;
      hasV2: boolean;
      bestV1?: Plan;
      bestV1Ts: number;
      bestAny?: Plan;
      bestAnyTs: number;
    };

    const byKey = new Map<string, AggregatedGroup>();
    const toTs = (value: string | undefined) => new Date(value || 0).getTime();

    const addToGroup = (plan: Plan, source: "v1" | "v2") => {
      const key = getPlanDedupeKey(plan);
      let group = byKey.get(key);
      if (!group) {
        group = {
          hasV1: false,
          hasV2: false,
          bestV1: undefined,
          bestV1Ts: Number.NEGATIVE_INFINITY,
          bestAny: undefined,
          bestAnyTs: Number.NEGATIVE_INFINITY,
        };
        byKey.set(key, group);
      }

      const ts = toTs(plan.last_updated);
      if (source === "v1") {
        group.hasV1 = true;
        if (ts >= group.bestV1Ts) {
          group.bestV1 = plan;
          group.bestV1Ts = ts;
        }
      } else {
        group.hasV2 = true;
      }

      if (ts >= group.bestAnyTs) {
        group.bestAny = plan;
        group.bestAnyTs = ts;
      }
    };

    for (const p of enrichedChartPlans) {
      addToGroup(p, isV1Version(p.version) ? "v1" : "v2");
    }

    const result: Plan[] = [];
    for (const group of byKey.values()) {
      const chosen = group.bestV1 ?? group.bestAny;
      if (!chosen) continue;
      result.push({
        ...chosen,
        // For duplicate V1/V2 matches, keep one row and mark it as V1&V2.
        versionDisplay: group.hasV1 && group.hasV2 ? "V1&V2" : undefined,
      });
    }

    return result;
  }, [enrichedChartPlans]);

  // Fetch product lines (segments) for the selected display community (V2).
  // When a subcommunity has no segments, fall back to parent community segments.
  useEffect(() => {
    if (!displayCommunityId || !community?._id) {
      return;
    }
    let cancelled = false;
    setProductLinesLoading(true);

    fetch(`${API_URL}/product-segments?communityId=${displayCommunityId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { _id: string; name: string; label: string }[]) => {
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) setProductLines(list);

        // Fallback: when a child has no segments, use parent's segments.
        if (
          !cancelled &&
          list.length === 0 &&
          effectiveSubcommunityId !== "__all__" &&
          community?._id
        ) {
          fetch(`${API_URL}/product-segments?communityId=${community._id}`)
            .then((parentRes) => (parentRes.ok ? parentRes.json() : []))
            .then((parentData: { _id: string; name: string; label: string }[]) => {
              if (!cancelled) setProductLines(Array.isArray(parentData) ? parentData : []);
            })
            .catch(() => {
              if (!cancelled) setProductLines([]);
            });
        }
      })
      .catch(() => {
        if (!cancelled) setProductLines([]);
      })
      .finally(() => {
        if (!cancelled) setProductLinesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [displayCommunityId, community?._id, effectiveSubcommunityId]);

  // V1 product line options from DB V1 plans (price tiers when segment synthesized)
  const v1ProductLineOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { _id: string; name: string; label: string }[] = [];
    for (const p of enrichedChartPlans) {
      if (!isV1Version(p.version)) continue;
      const seg = p.segment;
      if (seg?.label && seg.label !== "0s" && !seen.has(seg._id)) {
        seen.add(seg._id);
        out.push({ _id: seg._id, name: seg.name, label: seg.label });
      }
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [enrichedChartPlans]);

  // Merged product lines: V2 segments + V1 price tiers (by label); use merged-<label> so one filter matches both
  const displayProductLines = useMemo(() => {
    const byLabel = new Map<string, { _id: string; name: string; label: string }>();
    for (const pl of productLines) {
      if (pl.label && !byLabel.has(pl.label))
        byLabel.set(pl.label, { _id: `merged-${pl.label}`, name: pl.name, label: pl.label });
    }
    for (const pl of v1ProductLineOptions) {
      if (pl.label && !byLabel.has(pl.label))
        byLabel.set(pl.label, { _id: `merged-${pl.label}`, name: pl.name, label: pl.label });
    }
    return Array.from(byLabel.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true })
    );
  }, [productLines, v1ProductLineOptions]);

  const selectedCommunitiesForCompanies = useMemo((): Community[] => {
    if (!community) return [];
    if (effectiveSubcommunityId === "__all__") return [community, ...(childCommunities ?? [])];

    const child = (childCommunities ?? []).find((c) => c._id === effectiveSubcommunityId);
    return [child ?? community];
  }, [community, childCommunities, effectiveSubcommunityId]);

  // Companies: union of V1 plan companies and V2 companies for the selected community set
  const companies = useMemo(() => {
    const fromV2 = getCompanyNames(
      selectedCommunitiesForCompanies.flatMap((c) => c?.companies ?? [])
    );
    const fromV1 = new Set<string>();
    enrichedChartPlans.forEach((p) => {
      if (!isV1Version(p.version)) return;
      const name = extractCompanyName(p.company);
      if (name) fromV1.add(name);
    });
    const union = new Set([...fromV2, ...fromV1]);
    return Array.from(union).sort((a, b) => a.localeCompare(b));
  }, [selectedCommunitiesForCompanies, enrichedChartPlans]);

  // Map company name -> stored color for distinct graph lines (avoids similar/black lines)
  const companyColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    selectedCommunitiesForCompanies.forEach((comm) => {
      const list = comm?.companies;
      if (!Array.isArray(list)) return;
      list.forEach((c: CommunityCompany) => {
        if (
          c?.name &&
          c?.color != null &&
          c.color !== '' &&
          /^#[0-9A-Fa-f]{6}$/.test(c.color.trim())
        ) {
          if (!map[c.name]) map[c.name] = c.color.trim();
        }
      });
    });
    return map;
  }, [selectedCommunitiesForCompanies]);

  const companyNamesSet = useMemo(
    () => new Set(companies),
    [companies]
  );

  /** Tooltip “Community” line: matches sub-community filter (parent when All, else selected child). */
  const chartSelectedCommunityName = useMemo(() => {
    if (!community) return null;
    if (effectiveSubcommunityId === "__all__") return community.name;
    const child = (childCommunities ?? []).find((c) => c._id === effectiveSubcommunityId);
    return child?.name ?? community.name;
  }, [community, childCommunities, effectiveSubcommunityId]);

  // Filter plans by type, version (All/V1/V2), and product line (use merged V1+V2 displayPlans and displayProductLines)
  const {
    selectedType,
    setSelectedType,
    selectedProductLineId,
    setSelectedProductLineId,
    selectedVersion,
    setSelectedVersion,
    filteredPlans,
  } = useChartFilters(displayPlans, companyNamesSet, urlType, displayProductLines);

  const applyPlanPrediction = useCallback(
    (planId: string, prediction_price: number | null, version?: number | null) => {
      const updatedAt =
        prediction_price != null ? new Date().toISOString() : undefined;
      const patch: Partial<Plan> = {
        prediction_price: prediction_price ?? undefined,
        prediction_updated_at: updatedAt,
      };
      if (version != null) patch.version = version;
      updatePlan(planId, patch);
      setSubcommunityPlansById((prev) => {
        const next: Record<string, Plan[]> = {};
        for (const [id, list] of Object.entries(prev)) {
          next[id] = list.map((p) =>
            p._id === planId ? { ...p, ...patch } : p
          );
        }
        return next;
      });
    },
    [updatePlan]
  );

  const handlePredictionSave = useCallback(
    async (planId: string, predictionPrice: number | null, basePrice: number) => {
      const res = await fetch(`${API_URL}/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prediction_price: predictionPrice }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to save prediction"
        );
      }
      const saved =
        data.prediction_price === null || data.prediction_price === undefined
          ? null
          : Number(data.prediction_price);
      applyPlanPrediction(
        planId,
        Number.isFinite(saved) ? saved : predictionPrice,
        typeof data.version === "number" ? data.version : null
      );
      toast({
        title: predictionPrice == null ? "Prediction cleared" : "Prediction saved",
        description:
          predictionPrice == null
            ? "Chart uses the actual price again."
            : `Predicted $${predictionPrice.toLocaleString()} (actual $${basePrice.toLocaleString()}).`,
      });
    },
    [applyPlanPrediction, toast]
  );

  // Sync only V2 (registered) companies — V1 lives in DB like V2
  const syncableCompanies = useMemo(
    () => {
      if (!community) return [];
      if (effectiveSubcommunityId === "__all__") return [];

      const child = (childCommunities ?? []).find((c) => c._id === effectiveSubcommunityId);
      return getCompanyNames(child?.companies);
    },
    [community, childCommunities, effectiveSubcommunityId]
  );

  // Handle sync/re-scrape (V2 companies only)
  const handleSync = async () => {
    if (effectiveSubcommunityId === "__all__") {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Sync is available for a single community. Switch the sub-community filter away from “All”.",
      });
      return;
    }

    if (!community || syncableCompanies.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No companies to sync",
      });
      return;
    }

    const targetCommunityId = effectiveSubcommunityId;

    const targetCommunityName =
      (childCommunities ?? []).find((c) => c._id === effectiveSubcommunityId)?.name ?? community.name;

    setIsSyncing(true);
    
    try {
      // Remove all existing plans for this community before syncing, then save new plans per company
      if (targetCommunityId) {
        const deleteRes = await fetch(`${API_URL}/communities/${targetCommunityId}/plans`, {
          method: "DELETE",
        });
        if (!deleteRes.ok) {
          const err = await deleteRes.json().catch(() => ({}));
          throw new Error(err.message || err.error || "Failed to clear old plans");
        }
      }

      // Scrape data for each V2 company in the community
      const scrapePromises = syncableCompanies.map(async (company) => {
        try {
          const response = await fetch(API_URL + "/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: company,
              community: targetCommunityName,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to sync ${company}`);
          }

          const data = await response.json();
          return { company, success: true, data };
        } catch (error) {
          return { 
            company, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });

      const results = await Promise.all(scrapePromises);
      
      // Check if all succeeded
      const failures = results.filter(r => !r.success);
      
      if (failures.length === 0) {
        toast({
          variant: "success",
          title: "Sync Complete",
          description: `Successfully updated data for all ${syncableCompanies.length} companies`,
        });
      } else if (failures.length < syncableCompanies.length) {
        toast({
          variant: "default",
          title: "Partial Sync",
          description: `Synced ${syncableCompanies.length - failures.length}/${syncableCompanies.length} companies. ${failures.length} failed.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: "Failed to sync all companies. Please try again.",
        });
      }

      // Refetch the data to show updated plans.
      // `refetch()` only refreshes the route community, so for a child sync we refresh that child directly.
      const res = await fetch(`${API_URL}/communities/${targetCommunityId}/plans`);
      const data = (res.ok ? await res.json() : []) as Plan[];
      setSubcommunityPlansById((prev) => ({ ...prev, [targetCommunityId]: Array.isArray(data) ? data : [] }));
      await refetch();
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync data",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Error state
  if (!communitySlug) {
    return <ErrorMessage message="Community not found" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-2 sm:p-4 max-w-[1600px]">
        <Card>
          <CardContent className="p-0">
            <ChartHeader
              communityName={community?.name || formattedSlug}
              communitySlug={communitySlug}
              bannerImageSource={community ?? undefined}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              selectedVersion={selectedVersion}
              onVersionChange={setSelectedVersion}
              productLines={displayProductLines}
              selectedProductLineId={selectedProductLineId}
              onProductLineChange={setSelectedProductLineId}
              productLinesLoading={productLinesLoading}
              subcommunities={subcommunityOptions}
              selectedSubcommunityId={selectedSubcommunityId}
              onSubcommunityChange={setSelectedSubcommunityId}
              onSync={handleSync}
              isSyncing={isSyncing}
            />

            <div className="p-4 md:p-6 lg:p-8 min-h-[500px] md:min-h-[450px]">
              {loading || subcommunityPlansLoading ? (
                <ChartSkeleton />
              ) : error ? (
                <ErrorMessage message={error} />
              ) : (
                <PriceChart
                  plans={filteredPlans}
                  companies={companies}
                  selectedType={selectedType}
                  companyColorMap={companyColorMap}
                  selectedCommunityName={chartSelectedCommunityName}
                  canEdit={canEdit}
                  predictionEditMode={predictionEditMode}
                  onPredictionEditModeChange={setPredictionEditMode}
                  onPredictionSave={handlePredictionSave}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
