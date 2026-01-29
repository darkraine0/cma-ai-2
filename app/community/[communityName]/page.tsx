"use client"

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "../../components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "../../components/ui/sheet";
import { Button } from "../../components/ui/button";
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

export default function CommunityDetail() {
  const params = useParams();
  const communitySlug = params?.communityName 
    ? decodeURIComponent(params.communityName as string).toLowerCase() 
    : '';
  const formattedSlug = formatCommunitySlug(communitySlug);
  const [filterOpen, setFilterOpen] = useState(false);

  // Fetch community and plans data
  const { community, plans, loading, error } = useCommunityData(communitySlug);

  // Extract company names
  const companies = useMemo(
    () => getCompanyNames(community?.companies),
    [community]
  );

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
      const planCompany = extractCompanyName(plan.company);
      
      return (
        companyNamesSet.has(planCompany) &&
        (selectedCompany === 'All' || planCompany === selectedCompany) &&
        (selectedType === 'Plan' || selectedType === 'Now' 
          ? plan.type === selectedType.toLowerCase() 
          : true)
      );
    });

    exportToCSV(filteredPlans, community?.name || formattedSlug);
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
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              sortKey={sortKey}
              onSortKeyChange={setSortKey}
              sortOrder={sortOrder}
              onSortOrderChange={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              onExportCSV={handleExportCSV}
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
