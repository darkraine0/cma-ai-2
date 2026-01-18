"use client"

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CompanyTabs from "../../components/CompanyTabs";
import TypeTabs from "../../components/TypeTabs";
import Loader from "../../components/Loader";
import ErrorMessage from "../../components/ErrorMessage";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import API_URL from '../../config';
import { getCompanyColor } from '../../utils/colors';
import { getCommunityImage } from '../../utils/communityImages';

interface Plan {
  plan_name: string;
  price: number;
  sqft: number;
  stories: string;
  price_per_sqft: number;
  last_updated: string;
  price_changed_recently: boolean;
  company: string;
  community: string;
  type: string;
  address?: string;
}

type SortKey = "plan_name" | "price" | "sqft" | "last_updated";
type SortOrder = "asc" | "desc";
const PAGE_SIZE = 50;

interface CommunityCompany {
  _id: string;
  name: string;
}

interface Community {
  _id: string;
  name: string;
  companies: CommunityCompany[];
}

export default function CommunityDetail() {
  const params = useParams();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('Now');

  const communitySlug = params?.communityName as string;
  const decodedSlug = communitySlug ? decodeURIComponent(communitySlug).toLowerCase() : '';

  const fetchCommunity = async () => {
    try {
      const res = await fetch(API_URL + "/communities");
      if (!res.ok) throw new Error("Failed to fetch communities");
      const communities: Community[] = await res.json();
      
      // Find the community where the first word matches the slug (case-insensitive)
      const foundCommunity = communities.find(comm => {
        const firstWord = comm.name.split(' ')[0].toLowerCase();
        return firstWord === decodedSlug;
      });
      
      if (foundCommunity) {
        setCommunity(foundCommunity);
      }
    } catch (err: any) {
      console.error("Failed to fetch community:", err);
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    setError("");
    try {
      // Use the optimized endpoint with community ID
      if (community?._id) {
        const res = await fetch(`${API_URL}/communities/${community._id}/plans`);
        if (!res.ok) throw new Error("Failed to fetch plans");
        const data: Plan[] = await res.json();
        setPlans(data);
      } else {
        // Fallback: fetch all plans and filter if community not found yet
        const res = await fetch(API_URL + "/plans");
        if (!res.ok) throw new Error("Failed to fetch plans");
        const data: Plan[] = await res.json();
        
        // Filter plans for this specific community (case-insensitive)
        const communityPlans = data.filter(plan => {
          const planCommunity = typeof plan.community === 'string' ? plan.community : (plan.community as any)?.name || plan.community;
          const planFirstWord = planCommunity.split(' ')[0].toLowerCase();
          return planFirstWord === decodedSlug;
        });

        setPlans(communityPlans);
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (decodedSlug) {
      fetchCommunity();
    }
  }, [decodedSlug]);

  // Fetch plans after community is loaded (so we can use the _id)
  // Only fetch if we have the community _id to use the optimized endpoint
  useEffect(() => {
    if (decodedSlug && community?._id) {
      fetchPlans();
      // const interval = setInterval(fetchPlans, 60 * 1000); // Refresh every 1 min
      // return () => clearInterval(interval);
    }
  }, [decodedSlug, community?._id]);

  useEffect(() => {
    setPage(1); // Reset to first page on filter/sort change
  }, [sortKey, sortOrder, selectedCompany, selectedType]);

  // Only use companies from the community record - don't extract from plans
  // Handle both object format {_id, name} and string format
  const companies = community?.companies?.map(c => {
    if (typeof c === 'string') {
      return c;
    }
    if (c && typeof c === 'object' && c.name) {
      return c.name;
    }
    return '';
  }).filter(name => name) || [];
  const companyNamesSet = new Set(companies);

  const filteredPlans = plans.filter((plan) => {
    const planCompany = typeof plan.company === 'string' ? plan.company : (plan.company as any)?.name || plan.company;
    
    // Only show plans from companies that are in the community's companies array
    const isCompanyInCommunity = companyNamesSet.has(planCompany);
    
    return isCompanyInCommunity &&
      (selectedCompany === 'All' || planCompany === selectedCompany) &&
      (selectedType === 'Plan' || selectedType === 'Now' ? plan.type === selectedType.toLowerCase() : true);
  });

  const sortedPlans = [...filteredPlans].sort((a, b) => {
    let aValue: any = a[sortKey];
    let bValue: any = b[sortKey];
    if (sortKey === "last_updated") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedPlans.length / PAGE_SIZE);
  const paginatedPlans = sortedPlans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // CSV Export
  const exportCSV = () => {
    const header = [
      "Plan Name",
      "Price",
      "Sq Ft",
      "Stories",
      "$/Sq Ft",
      "Last Updated",
      "Company",
      "Community",
      "Type",
      "Price Changed Recently"
    ];
    const rows = sortedPlans.map((plan) => [
      plan.type === 'now' && plan.address ? plan.address : plan.plan_name,
      plan.price,
      plan.sqft,
      plan.stories,
      plan.price_per_sqft,
      plan.last_updated,
      plan.company,
      plan.community,
      plan.type,
      plan.price_changed_recently ? "Yes" : "No"
    ]);
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${community?.name || 'community'}-plans.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!decodedSlug) {
    return <ErrorMessage message="Community not found" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Main Card/Table */}
        <Card>
          <div className="relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getCommunityImage(decodedSlug)}
              alt={community?.name || decodedSlug}
              className="w-full h-64 object-cover"
            />
          </div>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left side - Community name */}
              <div className="flex-1">
                <CardTitle>{community?.name || decodedSlug}</CardTitle>
                <p className="text-sm text-muted-foreground">Home plans and pricing information</p>
              </div>
            
            {/* Center - Type tabs */}
            <div className="flex justify-center flex-1">
              <TypeTabs selected={selectedType} onSelect={setSelectedType} />
            </div>
            
            {/* Right side - Action buttons */}
            <div className="flex justify-end flex-1">
              <div className="flex gap-2">
                <Button 
                  onClick={() => router.push(`/community/${decodedSlug}/chart?type=${selectedType.toLowerCase()}`)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Chart
                </Button>
                <Button 
                  onClick={exportCSV}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>

          {/* Second Header - Company tabs */}
          <div className="mb-6">
            <CompanyTabs companies={companies} selected={selectedCompany} onSelect={setSelectedCompany} />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">          
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
              <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select sort option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plan_name">Plan Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="sqft">Sq Ft</SelectItem>
                  <SelectItem value="last_updated">Last Updated</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title="Toggle sort order"
              >
                {sortOrder === "asc" ? "\u2191" : "\u2193"}
              </Button>
            </div>
          </div>
          {loading ? (
            <Loader />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("plan_name")}>Plan Name</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("price")}>Price</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("sqft")}>Sq Ft</TableHead>
                    <TableHead>Stories</TableHead>
                    <TableHead>$/Sq Ft</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("last_updated")}>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPlans.map((plan) => (
                    <TableRow
                      key={plan.plan_name + plan.last_updated + plan.company}
                      className={plan.price_changed_recently ? "bg-primary/5" : ""}
                    >
                      <TableCell className="font-medium">
                        {plan.type === 'now' && plan.address ? plan.address : plan.plan_name}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">${plan.price.toLocaleString()}</TableCell>
                      <TableCell>{plan.sqft?.toLocaleString?.() ?? ""}</TableCell>
                      <TableCell>{plan.stories}</TableCell>
                      <TableCell>{plan.price_per_sqft ? `$${plan.price_per_sqft.toFixed(2)}` : ""}</TableCell>
                      <TableCell>
                        <Badge variant={plan.type === 'plan' ? 'secondary' : 'success'}>
                          {plan.type === 'plan' ? 'Plan' : 'Now'}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        {(() => {
                          const planCompany = typeof plan.company === 'string' ? plan.company : (plan.company as any)?.name || plan.company;
                          const color = getCompanyColor(planCompany);
                          return <span className="inline-block w-3 h-3 rounded-full border" style={{ backgroundColor: color, borderColor: color }}></span>;
                        })()}
                        {typeof plan.company === 'string' ? plan.company : (plan.company as any)?.name || plan.company}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(plan.last_updated).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {paginatedPlans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                        No plans found for this community.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 text-sm text-muted-foreground">
                <span className="inline-block w-3 h-3 bg-primary/20 border border-primary/30 rounded-full mr-2"></span>
                Highlighted rows indicate a price change in the last 24 hours.
              </div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </Button>
                  <span className="text-sm font-medium text-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

