"use client"

import React, { useMemo, useState, useEffect } from "react";
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
import API_URL from '../../../config';
import type { CommunityCompany, Plan } from "../../types";

export default function ChartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [productLines, setProductLines] = useState<{ _id: string; name: string; label: string }[]>([]);
  const [v1Plans, setV1Plans] = useState<Plan[]>([]);
  const [loadingV1, setLoadingV1] = useState(false);
  const [isV1FetchCompleted, setIsV1FetchCompleted] = useState(false);

  const communitySlug = params?.communityName
    ? decodeURIComponent(params.communityName as string).toLowerCase()
    : '';
  const formattedSlug = formatCommunitySlug(communitySlug);
  const urlType = searchParams?.get('type');

  // Fetch community and plans data (V2)
  const { community, plans, loading, error, refetch } = useCommunityData(communitySlug);

  // Fetch V1 plans from external API (same as community page)
  const v1CommunityName = community?.v1ExternalCommunityName ?? community?.name;
  useEffect(() => {
    if (!v1CommunityName) {
      setV1Plans([]);
      setIsV1FetchCompleted(true);
      return;
    }
    let cancelled = false;
    setIsV1FetchCompleted(false);
    setLoadingV1(true);
    fetch(`/api/external/get-plans?community=${encodeURIComponent(v1CommunityName)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
        const normalized: Plan[] = list.map((item, i) => {
          const price = Number(item.price ?? 0);
          const label = getV1ProductLineLabel(price);
          return {
            _id: `v1-${i}`,
            plan_name: String(item.plan_name ?? ""),
            price,
            sqft: Number(item.sqft ?? 0),
            stories: String(item.stories ?? ""),
            price_per_sqft: Number(item.price_per_sqft ?? 0),
            last_updated: String(item.last_updated ?? ""),
            price_changed_recently: Boolean(item.price_changed_recently),
            company: String(item.company ?? ""),
            community: String(item.community ?? community?.name ?? ""),
            type: String(item.type ?? "now"),
            address: item.address != null ? String(item.address) : undefined,
            segment: label ? { _id: `v1-price-${label}`, name: label, label } : undefined,
          };
        });
        setV1Plans(normalized);
      })
      .catch(() => {
        if (!cancelled) setV1Plans([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingV1(false);
          setIsV1FetchCompleted(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [v1CommunityName, community?.name]);

  const normalizeAddressLike = (value: string) => {
    const raw = String(value ?? "")
      .trim()
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

  // Merge V1 + V2 plans: show all; for duplicates prefer V1 and set versionDisplay to V1&V2
  const getPlanDedupeKey = (plan: Plan) => {
    const nameOrAddress = (plan.address || plan.plan_name || "").trim();
    const normalizedAddress = normalizeAddressLike(nameOrAddress);
    const firstPart = nameOrAddress.split(",")[0].trim().toLowerCase();
    const baseName = normalizedAddress || firstPart.replace(/\s+/g, " ").replace(/\.+$/, "");
    const company = normalizeCompanyNameForMatch(extractCompanyName(plan.company));
    // Address-like rows are unique enough by street; avoids V1/V2 misses when company naming differs.
    const isAddressLike = /^\d/.test(firstPart);
    return isAddressLike ? baseName : `${baseName}|${company}`;
  };
  const displayPlans = useMemo(() => {
    // Only run V1/V2 string-match dedupe after V1 API completes.
    if (!isV1FetchCompleted) {
      return plans;
    }

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

    for (const p of v1Plans) addToGroup(p, "v1");
    for (const p of plans) addToGroup(p, "v2");

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
  }, [isV1FetchCompleted, v1Plans, plans]);

  // Fetch product lines (segments) for this community (V2)
  useEffect(() => {
    if (!community?._id) {
      setProductLines([]);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/product-segments?communityId=${community._id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { _id: string; name: string; label: string }[]) => {
        if (!cancelled) setProductLines(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setProductLines([]);
      });
    return () => {
      cancelled = true;
    };
  }, [community?._id]);

  // V1 product line options from V1 plans (price tiers: 20s, 30s, etc.)
  const v1ProductLineOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { _id: string; name: string; label: string }[] = [];
    for (const p of v1Plans) {
      const seg = p.segment;
      if (seg?.label && seg.label !== "0s" && !seen.has(seg._id)) {
        seen.add(seg._id);
        out.push({ _id: seg._id, name: seg.name, label: seg.label });
      }
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [v1Plans]);

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

  // Companies: union of V1 plan companies and V2 community companies (all builders shown)
  const companies = useMemo(() => {
    const fromV2 = getCompanyNames(community?.companies);
    const fromV1 = new Set<string>();
    v1Plans.forEach((p) => {
      const name = extractCompanyName(p.company);
      if (name) fromV1.add(name);
    });
    const union = new Set([...fromV2, ...fromV1]);
    return Array.from(union).sort((a, b) => a.localeCompare(b));
  }, [community, v1Plans]);

  // Map company name -> stored color for distinct graph lines (avoids similar/black lines)
  const companyColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const list = community?.companies;
    if (!Array.isArray(list)) return map;
    list.forEach((c: CommunityCompany) => {
      if (c?.name && c?.color != null && c.color !== '' && /^#[0-9A-Fa-f]{6}$/.test(c.color.trim())) {
        map[c.name] = c.color.trim();
      }
    });
    return map;
  }, [community?.companies]);

  const companyNamesSet = useMemo(
    () => new Set(companies),
    [companies]
  );

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

  // Sync only V2 (registered) companies — V1 data comes from external API
  const syncableCompanies = useMemo(
    () => getCompanyNames(community?.companies),
    [community?.companies]
  );

  // Handle sync/re-scrape (V2 companies only)
  const handleSync = async () => {
    if (!community || syncableCompanies.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No companies to sync",
      });
      return;
    }

    setIsSyncing(true);
    
    try {
      // Remove all existing plans for this community before syncing, then save new plans per company
      if (community._id) {
        const deleteRes = await fetch(`${API_URL}/communities/${community._id}/plans`, {
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
              community: community.name,
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

      // Refetch the data to show updated plans
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
              onSync={handleSync}
              isSyncing={isSyncing}
            />

            <div className="p-4 md:p-6 lg:p-8 min-h-[500px] md:min-h-[450px]">
              {loading ? (
                <ChartSkeleton />
              ) : error ? (
                <ErrorMessage message={error} />
              ) : (
                <PriceChart
                  plans={filteredPlans}
                  companies={companies}
                  selectedType={selectedType}
                  companyColorMap={companyColorMap}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
