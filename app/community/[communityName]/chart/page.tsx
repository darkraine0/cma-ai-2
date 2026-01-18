"use client"

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Chart, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend } from "chart.js";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import TypeTabs from "../../../components/TypeTabs";
import Loader from "../../../components/Loader";
import ErrorMessage from "../../../components/ErrorMessage";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import API_URL from '../../../config';
import { getCompanyColor } from '../../../utils/colors';

// Dynamically import Line chart to avoid SSR issues
const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
});

// Register Chart.js components only on client side
if (typeof window !== "undefined") {
  Chart.register(LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Legend);
}

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
}

interface CommunityCompany {
  _id: string;
  name: string;
}

interface Community {
  _id: string;
  name: string;
  companies: CommunityCompany[];
}



export default function ChartPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Get the type from URL parameter, default to 'now' if not specified
  const urlType = searchParams?.get('type');
  const [selectedType, setSelectedType] = useState<string>(urlType === 'plan' ? 'Plan' : 'Now');

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
        
        // Filter plans for this specific community (case-insensitive) - match by first word
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
  useEffect(() => {
    if (decodedSlug && community?._id) {
      fetchPlans();
    }
  }, [decodedSlug, community?._id]);

  if (!decodedSlug) {
    return <ErrorMessage message="Community not found" />;
  }

  // Only use companies from the community record - don't extract from plans
  // Handle both object format {_id, name} and string format
  const communityCompanies = community?.companies?.map(c => {
    if (typeof c === 'string') {
      return c;
    }
    if (c && typeof c === 'object' && c.name) {
      return c.name;
    }
    return '';
  }).filter(name => name) || [];
  const companyNamesSet = new Set(communityCompanies);

  // Filter plans by selected type and only from companies in the community
  const filteredPlans = plans.filter((plan) => {
    const planCompany = typeof plan.company === 'string' ? plan.company : (plan.company as any)?.name || plan.company;
    
    // Only show plans from companies that are in the community's companies array
    const isCompanyInCommunity = companyNamesSet.has(planCompany);
    
    return isCompanyInCommunity &&
      (selectedType === 'Plan' || selectedType === 'Now' ? plan.type === selectedType.toLowerCase() : true);
  });

  // Use companies from the community record
  const companies = communityCompanies;

  // Prepare datasets for each company
  const datasets = companies.map((company) => {
    const filtered = filteredPlans.filter((p) => {
      const planCompany = typeof p.company === 'string' ? p.company : (p.company as any)?.name || p.company;
      return planCompany === company && p.sqft && p.price;
    });
    // Sort by sqft for a smooth line
    const sorted = filtered.sort((a, b) => a.sqft - b.sqft);
    return {
      label: company,
      data: sorted.map((p) => ({ x: p.sqft, y: p.price })),
      borderColor: getCompanyColor(company),
      backgroundColor: getCompanyColor(company) + '40', // Add 40 for transparency
      tension: 0.2,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: false,
    };
  });

  // X axis: all unique sqft values (sorted) from filtered data
  const allSqft = Array.from(new Set(filteredPlans.filter((p) => p.sqft).map((p) => p.sqft))).sort((a, b) => a - b);

  const data = {
    labels: allSqft,
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: { font: { weight: "bold" }, color: '#2563eb' },
      },
      title: {
        display: true,
        text: `${community?.name || decodedSlug} - Price vs Sqft by Company - ${selectedType} Homes`,
        color: "#2563eb",
        font: { size: 18, weight: "bold" },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const d = context.raw;
            return `Sqft: ${d.x} | Price: $${d.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Sqft", color: "#2563eb", font: { weight: "bold" } },
        ticks: { color: "#2563eb" },
        grid: { color: "#dbeafe" },
        type: 'linear',
      },
      y: {
        title: { display: true, text: "Price ($)", color: "#2563eb", font: { weight: "bold" } },
        ticks: { color: "#2563eb" },
        grid: { color: "#dbeafe" },
      },
    },
  } as any;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{community?.name || decodedSlug} - Price Analysis</CardTitle>
              <div className="flex gap-4">
              <Button 
                onClick={() => router.push(`/community/${decodedSlug}`)}
                variant="outline"
              >
                ← Back to Community
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6">
            <TypeTabs selected={selectedType} onSelect={setSelectedType} />
          </div>
          
          {loading ? (
            <Loader />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <div>
              {filteredPlans.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">No {selectedType.toLowerCase()} homes found in {community?.name || decodedSlug} to display in the chart.</p>
                </div>
              ) : (
                <Line data={data} options={options} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

