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

  // Fetch community, plans, and child communities
  const { community, plans, childCommunities, loading, error, refetch } = useCommunityData(communitySlug);

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

  // Display: selected subcommunity's data or main community's
  const displayPlans = selectedSubcommunity ? subcommunityPlans : plans;
  const companies = useMemo(
    () => getCompanyNames((selectedSubcommunity ?? community)?.companies),
    [selectedSubcommunity, community]
  );

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

  // Handle sync/re-scrape (use current display community)
  const handleSync = async () => {
    const communityToSync = selectedSubcommunity ?? community;
    if (!communityToSync || companies.length === 0) {
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
      const scrapePromises = companies.map(async (company) => {
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
          description: `Successfully updated data for all ${companies.length} companies`,
        });
      } else if (failures.length < companies.length) {
        toast({
          variant: "default",
          title: "Partial Sync",
          description: `Synced ${companies.length - failures.length}/${companies.length} companies. ${failures.length} failed.`,
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
              parentCommunityName={parentCommunityName}
              childCommunities={childCommunities}
              selectedSubcommunity={selectedSubcommunity}
              onSubcommunityChange={setSelectedSubcommunity}
              productLines={productLines}
              selectedProductLineId={selectedProductLineId}
              onProductLineChange={setSelectedProductLineId}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              sortKey={sortKey}
              onSortKeyChange={setSortKey}
              sortOrder={sortOrder}
              onSortOrderChange={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              onExportCSV={handleExportCSV}
              onSync={handleSync}
              isSyncing={isSyncing}
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
                    />
                  </SheetContent>
                </Sheet>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Desktop Sidebar - Hidden on mobile */}
                <div className="hidden lg:block">
                  <CompanySidebar
                    companies={companies}
                    selectedCompany={selectedCompany}
                    onCompanySelect={setSelectedCompany}
                  />
                </div>

                {/* Table Section */}
                <div className="lg:col-span-4">
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
                      emptyMessage={companies.length > 0 ? "No plans yet. Use the Sync button above to load plans from the builder sites." : undefined}
                      onPlanUpdated={async () => {
                        await refetch();
                        if (selectedSubcommunity?._id) {
                          const res = await fetch(`${API_URL}/communities/${selectedSubcommunity._id}/plans`);
                          if (res.ok) setSubcommunityPlans(await res.json());
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
