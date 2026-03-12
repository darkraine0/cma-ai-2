"use client"

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "../../components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "../../components/ui/sheet";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/use-toast";
import Loader from "../../components/Loader";
import ErrorMessage from "../../components/ErrorMessage";
import CommunityHeader from "../components/CommunityHeader";
import CompanySidebar from "../components/CompanySidebar";
import PlansTable from "../components/PlansTable";
import { useCommunityData } from "../hooks/useCommunityData";
import { usePlansFilter } from "../hooks/usePlansFilter";
import { exportToCSV } from "../utils/exportCSV";
import { formatCommunitySlug } from "../utils/formatCommunityName";
import { getCompanyNames, extractCompanyName } from "../utils/companyHelpers";
import { Filter } from "lucide-react";
import API_URL from "../../config";
import { Community } from "../types";
import { Plan } from "../types";
import { useAuth } from "../../contexts/AuthContext";
import AddPlanDialog from "../components/AddPlanDialog";

export default function CommunityDetail() {
  const params = useParams();
  const { toast } = useToast();
  const communitySlug = params?.communityName 
    ? decodeURIComponent(params.communityName as string).toLowerCase() 
    : '';
  const formattedSlug = formatCommunitySlug(communitySlug);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  /** When user selects a subcommunity from dropdown (no route change), we show its plans */
  const [selectedSubcommunity, setSelectedSubcommunity] = useState<Community | null>(null);
  const [subcommunityPlans, setSubcommunityPlans] = useState<Plan[]>([]);
  const [subcommunityPlansLoading, setSubcommunityPlansLoading] = useState(false);
  const [productLines, setProductLines] = useState<{ _id: string; name: string; label: string }[]>([]);
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  /** Version filter: All (V1 + V2), V1 only, or V2 only. Only used when viewing main community (no subcommunity). */
  const [versionFilter, setVersionFilter] = useState<"all" | "v1" | "v2">("all");
  const [v1Plans, setV1Plans] = useState<Plan[]>([]);
  const [loadingV1, setLoadingV1] = useState(false);
  const { user } = useAuth();

  // Fetch community, plans, and child communities
  const { community, plans, childCommunities, loading, error, refetch, updatePlan } = useCommunityData(communitySlug);

  // Fetch product lines (segments) for the current display community.
  // When viewing a subcommunity, segments are often stored under the parent — if the subcommunity has none, use parent's.
  const displayCommunityId = selectedSubcommunity?._id ?? community?._id;
  React.useEffect(() => {
    if (!displayCommunityId) {
      setProductLines([]);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/product-segments?communityId=${displayCommunityId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(async (data: { _id: string; name: string; label: string }[]) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setProductLines(list);
          return;
        }
        // When showing a subcommunity with no segments, use parent community's product lines
        if (selectedSubcommunity?._id && community?._id && displayCommunityId === selectedSubcommunity._id) {
          try {
            const parentRes = await fetch(`${API_URL}/product-segments?communityId=${community._id}`);
            const parentData = parentRes.ok ? await parentRes.json() : [];
            if (!cancelled) setProductLines(Array.isArray(parentData) ? parentData : []);
          } catch {
            if (!cancelled) setProductLines([]);
          }
        } else {
          setProductLines([]);
        }
      })
      .catch(() => {
        if (!cancelled) setProductLines([]);
      });
    return () => {
      cancelled = true;
    };
  }, [displayCommunityId, selectedSubcommunity?._id, community?._id]);

  // When a subcommunity is selected, fetch its plans (no route change)
  React.useEffect(() => {
    if (!selectedSubcommunity?._id) {
      setSubcommunityPlans([]);
      return;
    }
    let cancelled = false;
    setSubcommunityPlansLoading(true);
    fetch(`${API_URL}/communities/${selectedSubcommunity._id}/plans`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Plan[]) => {
        if (!cancelled) setSubcommunityPlans(data);
      })
      .catch(() => {
        if (!cancelled) setSubcommunityPlans([]);
      })
      .finally(() => {
        if (!cancelled) setSubcommunityPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSubcommunity?._id]);

  // Fetch V1 plans from external API when viewing main community (no subcommunity)
  const v1CommunityName = community?.v1ExternalCommunityName ?? community?.name;
  React.useEffect(() => {
    if (selectedSubcommunity || !v1CommunityName) {
      setV1Plans([]);
      return;
    }
    let cancelled = false;
    setLoadingV1(true);
    fetch(`/api/external/get-plans?community=${encodeURIComponent(v1CommunityName)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
        const normalized: Plan[] = list.map((item, i) => ({
          _id: `v1-${i}`,
          plan_name: String(item.plan_name ?? ""),
          price: Number(item.price ?? 0),
          sqft: Number(item.sqft ?? 0),
          stories: String(item.stories ?? ""),
          price_per_sqft: Number(item.price_per_sqft ?? 0),
          last_updated: String(item.last_updated ?? ""),
          price_changed_recently: Boolean(item.price_changed_recently),
          company: String(item.company ?? ""),
          community: String(item.community ?? community?.name ?? ""),
          type: String(item.type ?? "now"),
          address: item.address != null ? String(item.address) : undefined,
        }));
        setV1Plans(normalized);
      })
      .catch(() => {
        if (!cancelled) setV1Plans([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingV1(false);
      });
    return () => {
      cancelled = true;
    };
  }, [v1CommunityName, selectedSubcommunity]);

  // Display: subcommunity plans, or main community plans by version (V1, V2, or both)
  const displayPlans = useMemo(() => {
    if (selectedSubcommunity) return subcommunityPlans;
    if (versionFilter === "v1") return v1Plans;
    if (versionFilter === "v2") return plans;
    return [...v1Plans, ...plans];
  }, [selectedSubcommunity, subcommunityPlans, versionFilter, v1Plans, plans]);

  // Community companies (from DB) — used for Sync and when showing V2 or subcommunity
  const communityCompanies = useMemo(
    () => getCompanyNames((selectedSubcommunity ?? community)?.companies),
    [selectedSubcommunity, community]
  );

  // Builder list for sidebar: when V1 selected show companies from V1 plans; when V2 show community companies; when All show union
  const companies = useMemo(() => {
    if (selectedSubcommunity) return communityCompanies;
    if (versionFilter === "v1") {
      const fromPlans = new Set<string>();
      v1Plans.forEach((p) => {
        const name = extractCompanyName(p.company);
        if (name) fromPlans.add(name);
      });
      return Array.from(fromPlans).sort((a, b) => a.localeCompare(b));
    }
    if (versionFilter === "v2") return communityCompanies;
    // "all": union of V1 plan companies and community companies
    const fromV1 = new Set<string>();
    v1Plans.forEach((p) => {
      const name = extractCompanyName(p.company);
      if (name) fromV1.add(name);
    });
    const union = new Set([...communityCompanies, ...fromV1]);
    return Array.from(union).sort((a, b) => a.localeCompare(b));
  }, [selectedSubcommunity, versionFilter, v1Plans, communityCompanies]);

  // Stored company colors so builder sidebar matches Companies page and charts
  const companyColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const list = (selectedSubcommunity ?? community)?.companies;
    if (!Array.isArray(list)) return map;
    list.forEach((c: { name?: string; color?: string | null }) => {
      if (c?.name && c?.color && /^#[0-9A-Fa-f]{6}$/.test(String(c.color).trim())) {
        map[c.name] = String(c.color).trim();
      }
    });
    return map;
  }, [selectedSubcommunity, community]);

  // Parent community name when current community is a subcommunity (for header title)
  const parentCommunityName = useMemo(() => {
    const parent = community?.parentCommunityId;
    if (parent && typeof parent === "object" && "name" in parent) return parent.name;
    return null;
  }, [community?.parentCommunityId]);

  const companyNamesSet = useMemo(() => new Set(companies), [companies]);

  // Filter, sort, and paginate plans (use display plans)
  const {
    sortKey,
    setSortKey,
    sortOrder,
    setSortOrder,
    selectedCompany,
    setSelectedCompany,
    selectedType,
    setSelectedType,
    selectedProductLineId,
    setSelectedProductLineId,
    page,
    setPage,
    paginatedPlans,
    totalPages,
    handleSort,
  } = usePlansFilter(displayPlans, companyNamesSet, productLines);

  // Handle sync/re-scrape (use community's registered companies, not version-filtered list)
  const handleSync = async () => {
    const communityToSync = selectedSubcommunity ?? community;
    if (!communityToSync || communityCompanies.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No companies to sync",
      });
      return;
    }

    setIsSyncing(true);
    
    try {
      // Scrape data for each company in the community
      const scrapePromises = communityCompanies.map(async (company) => {
        try {
          const response = await fetch(API_URL + "/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: company,
              community: communityToSync.name,
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
          description: `Successfully updated data for all ${communityCompanies.length} companies`,
        });
      } else if (failures.length < communityCompanies.length) {
        toast({
          variant: "default",
          title: "Partial Sync",
          description: `Synced ${communityCompanies.length - failures.length}/${communityCompanies.length} companies. ${failures.length} failed.`,
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
      if (selectedSubcommunity?._id) {
        const res = await fetch(`${API_URL}/communities/${selectedSubcommunity._id}/plans`);
        if (res.ok) setSubcommunityPlans(await res.json());
      }
      
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

  // Handle CSV export (use display plans, respect product line filter)
  const handleExportCSV = () => {
    const filteredPlans = displayPlans.filter((plan) => {
      const planCompany = extractCompanyName(plan.company);
      const planSegmentId = plan.segment?._id ?? null;
      const matchProductLine =
        selectedProductLineId === '__all__' ||
        (selectedProductLineId === '__none__' && !planSegmentId) ||
        planSegmentId === selectedProductLineId;
      return (
        companyNamesSet.has(planCompany) &&
        (selectedCompany === 'All' || planCompany === selectedCompany) &&
        (selectedType === 'Plan' || selectedType === 'Now'
          ? plan.type === selectedType.toLowerCase()
          : true) &&
        matchProductLine
      );
    });

    exportToCSV(filteredPlans, (selectedSubcommunity ?? community)?.name || formattedSlug);
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
            {/* Header Section */}
            <CommunityHeader
              communityName={community?.name || formattedSlug}
              communitySlug={communitySlug}
              bannerImageSource={selectedSubcommunity ?? community ?? undefined}
              parentCommunityName={parentCommunityName}
              childCommunities={childCommunities}
              selectedSubcommunity={selectedSubcommunity}
              onSubcommunityChange={setSelectedSubcommunity}
              productLines={productLines}
              selectedProductLineId={selectedProductLineId}
              onProductLineChange={setSelectedProductLineId}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              versionFilter={versionFilter}
              onVersionFilterChange={setVersionFilter}
              showVersionFilter={!selectedSubcommunity}
              loadingV1={loadingV1}
              sortKey={sortKey}
              onSortKeyChange={setSortKey}
              sortOrder={sortOrder}
              onSortOrderChange={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              onExportCSV={handleExportCSV}
              onSync={handleSync}
              isSyncing={isSyncing}
              onAddPlan={(user?.permission === "editor" || user?.role === "admin") ? () => setAddPlanOpen(true) : undefined}
            />

            {/* Main Content */}
            <div className="p-4 md:p-6">
              {/* Mobile Filter Button */}
              <div className="lg:hidden mb-4">
                <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter by Builder
                      {selectedCompany !== 'All' && (
                        <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          {selectedCompany}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] p-4">
                    <SheetTitle className="text-lg font-semibold mb-4">Filter by Builder</SheetTitle>
                    <CompanySidebar
                      companies={companies}
                      selectedCompany={selectedCompany}
                      onCompanySelect={(company) => {
                        setSelectedCompany(company);
                        setFilterOpen(false);
                      }}
                      companyColorMap={companyColorMap}
                    />
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex flex-col lg:flex-row gap-4">
                {/* Desktop Sidebar - Hidden on mobile, fixed narrow width */}
                <div className="hidden lg:block lg:w-60 lg:min-w-[240px] lg:shrink-0">
                  <CompanySidebar
                    companies={companies}
                    selectedCompany={selectedCompany}
                    onCompanySelect={setSelectedCompany}
                    companyColorMap={companyColorMap}
                  />
                </div>

                {/* Table Section - takes remaining width */}
                <div className="min-w-0 flex-1">
                  {loading || (selectedSubcommunity && subcommunityPlansLoading) ? (
                    <Loader />
                  ) : error ? (
                    <ErrorMessage message={error} />
                  ) : (
                    <PlansTable
                      plans={paginatedPlans}
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      onSort={handleSort}
                      productLines={productLines}
                      companyColorMap={companyColorMap}
                      emptyMessage={companies.length > 0 ? "No plans yet. Use the Sync button above to load plans from the builder sites." : undefined}
                      onPlanUpdated={async () => {
                        await refetch();
                        if (selectedSubcommunity?._id) {
                          const res = await fetch(`${API_URL}/communities/${selectedSubcommunity._id}/plans`);
                          if (res.ok) setSubcommunityPlans(await res.json());
                        }
                      }}
                      onProductLineUpdated={(planId, segment) => {
                        updatePlan(planId, { segment });
                        if (selectedSubcommunity) {
                          setSubcommunityPlans((prev) =>
                            prev.map((p) => (p._id === planId ? { ...p, segment } : p))
                          );
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <AddPlanDialog
          open={addPlanOpen}
          onOpenChange={setAddPlanOpen}
          communityName={selectedSubcommunity?.name ?? community?.name ?? formattedSlug}
          companies={companies}
          productLines={productLines}
          onSaved={async () => {
            await refetch();
            if (selectedSubcommunity?._id) {
              const res = await fetch(`${API_URL}/communities/${selectedSubcommunity._id}/plans`);
              if (res.ok) setSubcommunityPlans(await res.json());
            }
            toast({ title: "Plan added", description: "The plan was added successfully." });
          }}
        />
      </div>
    </div>
  );
}
