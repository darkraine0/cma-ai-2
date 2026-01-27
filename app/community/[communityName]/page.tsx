"use client"

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "../../components/ui/card";
import Loader from "../../components/Loader";
import ErrorMessage from "../../components/ErrorMessage";
import CommunityHeader from "../components/CommunityHeader";
import CompanySidebar from "../components/CompanySidebar";
import PlansTable from "../components/PlansTable";
import { useCommunityData } from "../hooks/useCommunityData";
import { usePlansFilter } from "../hooks/usePlansFilter";
import { exportToCSV } from "../utils/exportCSV";

export default function CommunityDetail() {
  const params = useParams();
  const communitySlug = params?.communityName 
    ? decodeURIComponent(params.communityName as string).toLowerCase() 
    : '';

  // Fetch community and plans data
  const { community, plans, loading, error } = useCommunityData(communitySlug);

  // Extract company names
  const companies = useMemo(() => {
    return community?.companies?.map(c => {
      if (typeof c === 'string') return c;
      if (c && typeof c === 'object' && c.name) return c.name;
      return '';
    }).filter(name => name) || [];
  }, [community]);

  const companyNamesSet = useMemo(() => new Set(companies), [companies]);

  // Filter, sort, and paginate plans
  const {
    sortKey,
    setSortKey,
    sortOrder,
    setSortOrder,
    selectedCompany,
    setSelectedCompany,
    selectedType,
    setSelectedType,
    page,
    setPage,
    paginatedPlans,
    totalPages,
    handleSort,
  } = usePlansFilter(plans, companyNamesSet);

  // Handle CSV export
  const handleExportCSV = () => {
    const filteredPlans = plans.filter((plan) => {
      const planCompany = typeof plan.company === 'string' 
        ? plan.company 
        : (plan.company as any)?.name || plan.company;
      
      return (
        companyNamesSet.has(planCompany) &&
        (selectedCompany === 'All' || planCompany === selectedCompany) &&
        (selectedType === 'Plan' || selectedType === 'Now' 
          ? plan.type === selectedType.toLowerCase() 
          : true)
      );
    });

    exportToCSV(filteredPlans, community?.name || 'community');
  };

  // Error state
  if (!communitySlug) {
    return <ErrorMessage message="Community not found" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-[1600px]">
        <Card>
          <CardContent className="p-0">
            {/* Header Section */}
            <CommunityHeader
              communityName={community?.name || communitySlug}
              communitySlug={communitySlug}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              sortKey={sortKey}
              onSortKeyChange={setSortKey}
              sortOrder={sortOrder}
              onSortOrderChange={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              onExportCSV={handleExportCSV}
            />

            {/* Main Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Sidebar */}
                <CompanySidebar
                  companies={companies}
                  selectedCompany={selectedCompany}
                  onCompanySelect={setSelectedCompany}
                />

                {/* Table Section */}
                <div className="lg:col-span-4">
                  {loading ? (
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
