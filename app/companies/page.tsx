"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import AddCompanyModal from "../components/AddCompanyModal";
import PendingApprovalBanner from "../components/PendingApprovalBanner";
import { ExternalLink, Trash2 } from "lucide-react";
import API_URL from '../config';

interface Company {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        
        // If user is not email verified (and not admin), redirect to signin
        // AuthGuard will handle the redirect, but this is a safeguard
        if (user.role !== "admin" && !user.emailVerified) {
          router.push("/signin");
          return;
        }
        
        setUser(user);
      }
    } catch (error) {
      // User not authenticated
    }
  };


  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingCompanyId(companyId);
    setError("");
    try {
      const res = await fetch(API_URL + `/companies?id=${companyId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete company");
      }

      await fetchCompanies();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingCompanyId(null);
    }
  };

  if (loading) return <Loader />;

  const isPending = user?.status === "pending";
  const isEditor = user?.permission === "editor" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Show pending approval banner if user is pending */}
        {isPending && <PendingApprovalBanner />}

        {/* Hide all content if user is pending */}
        {isPending ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              Your account is pending admin approval. Please wait for an admin to approve your account.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-none tracking-tight">Companies</h2>
            <p className="text-sm text-muted-foreground">{isEditor ? 'Manage' : 'View'} home building companies</p>
          </div>
          {isEditor && (
            <AddCompanyModal 
              onSuccess={() => {
                fetchCompanies();
                setError("");
              }}
            />
          )}
        </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Companies List */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <Card key={company._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {isEditor && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCompany(company._id, company.name)}
                        disabled={deletingCompanyId === company._id}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {company.description && (
                    <p className="text-sm text-muted-foreground">{company.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {company.headquarters && (
                      <Badge variant="secondary" className="text-xs">
                        📍 {company.headquarters}
                      </Badge>
                    )}
                    {company.founded && (
                      <Badge variant="secondary" className="text-xs">
                        🏛️ Founded {company.founded}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {companies.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">No companies found. Add one to get started!</p>
              </div>
            </CardContent>
          </Card>
        )}
          </>
        )}
      </div>
    </div>
  );
}

