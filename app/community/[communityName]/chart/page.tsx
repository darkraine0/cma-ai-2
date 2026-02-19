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
import { getCompanyNames } from "../../utils/companyHelpers";
import { useChartFilters } from "./hooks/useChartFilters";
import API_URL from '../../../config';

export default function ChartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [productLines, setProductLines] = useState<{ _id: string; name: string; label: string }[]>([]);

  const communitySlug = params?.communityName
    ? decodeURIComponent(params.communityName as string).toLowerCase()
    : '';
  const formattedSlug = formatCommunitySlug(communitySlug);
  const urlType = searchParams?.get('type');

  // Fetch community and plans data
  const { community, plans, loading, error, refetch } = useCommunityData(communitySlug);

  // Fetch product lines (segments) for this community
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

  // Extract company names
  const companies = useMemo(
    () => getCompanyNames(community?.companies),
    [community]
  );

  const companyNamesSet = useMemo(
    () => new Set(companies),
    [companies]
  );

  // Filter plans by type and product line
  const {
    selectedType,
    setSelectedType,
    selectedProductLineId,
    setSelectedProductLineId,
    filteredPlans,
  } = useChartFilters(plans, companyNamesSet, urlType, productLines);

  // Handle sync/re-scrape
  const handleSync = async () => {
    if (!community || companies.length === 0) {
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
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              productLines={productLines}
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
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
