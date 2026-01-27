"use client"

import React, { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent } from "../../../components/ui/card";
import ErrorMessage from "../../../components/ErrorMessage";
import ChartHeader from "./components/ChartHeader";
import PriceChart from "./components/PriceChart";
import ChartSkeleton from "./components/ChartSkeleton";
import { useCommunityData } from "../../hooks/useCommunityData";
import { formatCommunitySlug } from "../../utils/formatCommunityName";
import { getCompanyNames } from "../../utils/companyHelpers";
import { useChartFilters } from "./hooks/useChartFilters";

export default function ChartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const communitySlug = params?.communityName 
    ? decodeURIComponent(params.communityName as string).toLowerCase() 
    : '';
  const formattedSlug = formatCommunitySlug(communitySlug);
  const urlType = searchParams?.get('type');

  // Fetch community and plans data
  const { community, plans, loading, error } = useCommunityData(communitySlug);

  // Extract company names
  const companies = useMemo(
    () => getCompanyNames(community?.companies),
    [community]
  );

  const companyNamesSet = useMemo(
    () => new Set(companies),
    [companies]
  );

  // Filter plans by type
  const { selectedType, setSelectedType, filteredPlans } = useChartFilters(
    plans,
    companyNamesSet,
    urlType
  );

  // Error state
  if (!communitySlug) {
    return <ErrorMessage message="Community not found" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-[1600px]">
        <Card>
          <CardContent className="p-0">
            <ChartHeader
              communityName={community?.name || formattedSlug}
              communitySlug={communitySlug}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
            />

            <div className="p-8 min-h-[500px]">
              {loading ? (
                <ChartSkeleton />
              ) : error ? (
                <ErrorMessage message={error} />
              ) : (
                <PriceChart
                  plans={filteredPlans}
                  companies={companies}
                  selectedType={selectedType}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
