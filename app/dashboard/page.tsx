"use client"

import React, { useEffect, useState } from "react";
import CompanyTabs from "../components/CompanyTabs";
import TypeTabs from "../components/TypeTabs";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import API_URL from '../config';
import { getCompanyColor } from '../utils/colors';

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

export default function Dashboard() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('Now');

  const fetchPlans = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      setPlans(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // const interval = setInterval(fetchPlans, 60 * 1000); // Refresh every 1 min
    // return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPage(1); // Reset to first page on filter/sort change
  }, [sortKey, sortOrder, selectedCompany, selectedType]);

  const companies = Array.from(new Set(plans.map((p) => {
    return typeof p.company === 'string' ? p.company : (p.company as any)?.name || p.company;
  })));

  const filteredPlans = plans.filter((plan) => {
    const planCompany = typeof plan.company === 'string' ? plan.company : (plan.company as any)?.name || plan.company;
    return (selectedCompany === 'All' || planCompany === selectedCompany) &&
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
      typeof plan.company === 'string' ? plan.company : (plan.company as any)?.name || plan.company,
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
    link.setAttribute("download", "plans.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Main Card/Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col gap-4 w-full justify-center items-center">
                <TypeTabs selected={selectedType} onSelect={setSelectedType} />
                <CompanyTabs companies={companies} selected={selectedCompany} onSelect={setSelectedCompany} />
              </div>
              <Button onClick={exportCSV}>
              Export CSV
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
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
                    <TableHead>Community</TableHead>
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
                      <TableCell>{typeof plan.community === 'string' ? plan.community : (plan.community as any)?.name || plan.community}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(plan.last_updated).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {paginatedPlans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                        No plans found.
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

