# Requested File Bundle

Generated: 2026-03-11

This document contains:
- the requested file inventory
- status/path notes for each requested item
- copied contents for files that exist in this workspace

Source files were not modified when creating this bundle.

## Requested file inventory

### cma-ai-2 / current Next.js app

| Requested item | Status | Path / note |
|---|---|---|
| middleware.ts | Missing | Not found in this workspace |
| next.config.ts | Found | `next.config.ts` |
| vercel.json | Missing | Not found in this workspace |
| full package.json scripts section | Found | `package.json` |
| app/layout.tsx | Found | `app/layout.tsx` |
| app/profile/page.tsx | Found | `app/profile/page.tsx` |
| app/manage/page.tsx | Found | `app/manage/page.tsx` |
| app/communities/page.tsx | Found | `app/communities/page.tsx` |
| app/community/[slug]/page.tsx | Closest match | Found as `app/community/[communityName]/page.tsx` |
| app/companies/page.tsx | Found | `app/companies/page.tsx` |
| app/admin/dashboard/page.tsx | Found | `app/admin/dashboard/page.tsx` |
| app/api/scrape/route.ts | Found | `app/api/scrape/route.ts` |
| any app/api/jobs/* | Missing | No `app/api/jobs/*` files found |
| any status/progress routes | Partial | Found `app/api/user/permission-request-status/route.ts`; no `*progress*` route found |
| app/lib/auth.ts | Found | `app/lib/auth.ts` |
| app/lib/jwt.ts | Missing | Not found in this workspace |
| app/lib/db.ts | Closest match | Found as `app/lib/mongodb.ts` |
| all Mongoose models | Found | `app/models/*.ts` |
| scripts/run-migrations.ts | Found | `scripts/run-migrations.ts` |
| ScrapingProgressContext.tsx | Found | `app/contexts/ScrapingProgressContext.tsx` |
| toaster.tsx | Found | `app/components/ui/toaster.tsx` |

### V1 backend requested items

| Requested item | Status | Path / note |
|---|---|---|
| app/main.py | Missing | Not found in this workspace |
| app/core/scheduler.py | Missing | Not found in this workspace |
| all files in app/scrapers/ | Missing | Not found in this workspace |
| all files in app/api/ (Python backend) | Missing | Not found in this workspace |
| any models/schemas (V1 backend) | Missing | Not found in this workspace |
| any normalization/export service files | Missing | Not found in this workspace |
| requirements.txt | Missing | Not found in this workspace |
| any config/settings file | Missing | Not found in this workspace |

### Useful support files

| Requested item | Status | Path / note |
|---|---|---|
| .env.example | Missing | Not found in this workspace |
| README.md | Found | `README.md` |
| ADMIN_SYSTEM_DOCUMENTATION.md | Found | `ADMIN_SYSTEM_DOCUMENTATION.md` |
| TROUBLESHOOTING.md | Found | `TROUBLESHOOTING.md` |
| alias mapping files | Missing | Not found in this workspace |
| baseline/product-line mapping files | Missing | Not found in this workspace |
| seed scripts | Missing | Not found in this workspace |
| cron/scheduler docs | Missing | Not found in this workspace |
| .cursor/, .cursorrules, AGENTS.md | Missing | Not found in this workspace |

## package.json scripts section

````json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "migrate": "tsx scripts/run-migrations.ts"
}
````

## next.config.ts

Path: `next.config.ts`

````ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
````

## app/layout.tsx

Path: `app/layout.tsx`

````tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./contexts/AuthContext";
import { ScrapingProgressProvider } from "./contexts/ScrapingProgressContext";
import Navbar from "./components/Navbar";
import AuthGuard from "./components/AuthGuard";
import { Toaster } from "./components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketMap Homes",
  description: "Home plans and pricing information",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AuthGuard>
              <ScrapingProgressProvider>
                <Navbar />
                {children}
              </ScrapingProgressProvider>
            </AuthGuard>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
````

## app/profile/page.tsx

Path: `app/profile/page.tsx`

````tsx
"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { PasswordInput } from "../components/ui/password-input";
import { useToast } from "../components/ui/use-toast";
import Loader from "../components/Loader";
import { useAuth } from "../contexts/AuthContext";
import { User, Lock, Shield, Eye, Edit, CheckCircle2, Clock, FileText, Trash2, Settings } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: string;
  permission: "viewer" | "editor";
  status: string;
  emailVerified: boolean;
}

interface PermissionRequest {
  id: string;
  status: string;
  requestedAt: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { user: authUser, refetchUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [name, setName] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [pendingRequest, setPendingRequest] = useState<PermissionRequest | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setName(authUser.name || "");
    }
    setLoading(false);
  }, [authUser]);

  useEffect(() => {
    if (user?.id) {
      checkPendingRequest();
    }
  }, [user?.id]);

  const checkPendingRequest = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch("/api/user/permission-request-status");
      if (response.ok) {
        const data = await response.json();
        if (data.hasPendingRequest) {
          setPendingRequest(data.request);
        }
      }
    } catch (error) {
      // Silently fail - not critical
      console.error("Error checking requests:", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    try {
      const response = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      toast({
        variant: "success",
        title: "Success",
        description: data.message,
      });
      await refetchUser();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "New passwords do not match",
      });
      return;
    }

    setUpdating(true);
    
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast({
        variant: "success",
        title: "Success",
        description: data.message,
      });
      
      // Clear password fields
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to change password",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRequestPermission = async () => {
    setRequestLoading(true);
    
    try {
      const response = await fetch("/api/user/request-permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      toast({
        variant: "success",
        title: "Request Submitted",
        description: data.message,
      });
      
      // Refresh to show pending request
      await checkPendingRequest();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit permission request",
      });
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">User Profile</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">Manage your account settings</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {/* <User className="w-5 h-5 text-primary" /> */}
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    className="w-full px-3 py-2 border-2 border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
                    disabled
                    readOnly
                  />
                  {!user.emailVerified && (
                    <p className="text-sm text-amber-600 mt-1">
                      Email verification pending
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {/* <Lock className="w-5 h-5 text-primary" /> */}
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <PasswordInput
                  label="Current Password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                
                <PasswordInput
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                  helperText="Minimum 6 characters"
                  required
                />
                
                <PasswordInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={6}
                  required
                />

                <Button type="submit" disabled={updating}>
                  {updating ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Permission & Access Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {/* <Shield className="w-5 h-5 text-primary" /> */}
                <CardTitle>Permissions & Access Level</CardTitle>
              </div>
              <CardDescription>Manage your account permissions and capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Current Access Level</p>
                    <div className="flex items-center gap-3">
                      {user.permission === 'viewer' ? (
                        <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-900/30 px-3 py-1.5">
                          <Eye className="w-4 h-4 mr-1.5" />
                          Viewer
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30 px-3 py-1.5">
                          <Edit className="w-4 h-4 mr-1.5" />
                          Editor
                        </Badge>
                      )}
                      {user.role === 'admin' && (
                        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/30 px-3 py-1.5">
                          <Shield className="w-4 h-4 mr-1.5" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {user.permission === 'viewer' && user.role !== 'admin' && (
                    <div>
                      {pendingRequest ? (
                        <div className="text-center">
                          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30 px-3 py-1.5">
                            <Clock className="w-4 h-4 mr-1.5" />
                            Request Pending
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">Awaiting admin approval</p>
                        </div>
                      ) : (
                        <Button
                          onClick={handleRequestPermission}
                          disabled={requestLoading}
                          size="sm"
                          className="h-9"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          {requestLoading ? "Submitting..." : "Request Editor Access"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions Breakdown */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Your Capabilities</p>
                <div className="grid gap-3">
                  {/* View Permission */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex-shrink-0 mt-0.5">
                      <Eye className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">View Access</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Browse communities, view plans, and export data
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  </div>

                  {/* Edit Permission */}
                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                    user.permission === 'editor' || user.role === 'admin'
                      ? 'bg-muted/30 border-border'
                      : 'bg-muted/10 border-dashed border-border opacity-60'
                  }`}>
                    <div className="flex-shrink-0 mt-0.5">
                      <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Edit Access</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Add, modify, and manage plans and communities
                      </p>
                    </div>
                    {(user.permission === 'editor' || user.role === 'admin') ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>

                  {/* Admin Permission */}
                  {user.role === 'admin' && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex-shrink-0 mt-0.5">
                        <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Admin Access</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Full system access, user management, and approvals
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    </div>
                  )}
                </div>
              </div>

              {/* Help Text */}
              {user.permission === 'viewer' && user.role !== 'admin' && !pendingRequest && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Need more access?</strong> Request editor permissions to create and modify content.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
````

## app/manage/page.tsx

Path: `app/manage/page.tsx`

````tsx
"use client"

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../components/ui/dialog";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import AddCommunityModal from "../components/AddCommunityModal";
import AddSubcommunityModal from "../components/AddSubcommunityModal";
import SelectCompanyForAddModal from "../components/SelectCompanyForAddModal";
import SelectCommunityNameModal from "../components/SelectCommunityNameModal";
import PendingApprovalBanner from "../components/PendingApprovalBanner";
import CompanySubcommunityBadges from "../components/CompanySubcommunityBadges";
import ManageSubcommunitiesModal from "../components/ManageSubcommunitiesModal";
import ProductLinesCard from "../components/ProductLinesCard";
import EditCommunityModal from "../components/EditCommunityModal";
import EditCompanyModal from "../components/EditCompanyModal";
import { useScrapingProgress } from "../contexts/ScrapingProgressContext";
import { useAuth } from "../contexts/AuthContext";
import { Plus, X, Trash2, Loader2, Search, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import API_URL from '../config';
import { getCompanyColor } from '../utils/colors';

interface Company {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  color?: string | null;
}

interface CommunityCompany {
  _id: string;
  name: string;
  subcommunities?: string[]; // Names of subcommunities this company belongs to
}

interface Plan {
  plan_name: string;
  company: string | { name: string };
  community: string | { name: string };
  type: string;
}

type CommunityType = 'standard' | 'competitor';

interface Community {
  name: string;
  companies: string[] | CommunityCompany[];
  fromPlans?: boolean;
  description?: string;
  location?: string;
  _id?: string | null;
  totalPlans?: number;
  totalNow?: number;
  parentCommunityId?: string | { _id: string; name: string } | null;
  /** standard = General Community (UnionMain builds here); competitor = side community/Competitor */
  communityType?: CommunityType;
  /** Community/card image; also used as banner in header on community page. */
  imagePath?: string | null;
  hasImage?: boolean;
}

interface ProductSegment {
  _id: string;
  communityId: string;
  communityName?: string;
  companyId?: string | null;
  companyName?: string;
  name: string;
  label: string;
  description?: string | null;
  isActive: boolean;
  displayOrder?: number;
}

export default function ManagePage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "builders_desc" | "plans_desc">("plans_desc");
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  
  const [deletingCommunityId, setDeletingCommunityId] = useState<string | null>(null);
  const [updatingCommunityTypeId, setUpdatingCommunityTypeId] = useState<string | null>(null);
  const [deletingSubcommunityId, setDeletingSubcommunityId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteSubcommunityConfirmOpen, setDeleteSubcommunityConfirmOpen] = useState(false);
  const [subcommunityToDelete, setSubcommunityToDelete] = useState<Community | null>(null);
  const [removeCompanyConfirmOpen, setRemoveCompanyConfirmOpen] = useState(false);
  const [companyToRemove, setCompanyToRemove] = useState<{ community: Community; companyName: string } | null>(null);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [editCompanyTarget, setEditCompanyTarget] = useState<{ id: string; name: string; color?: string | null } | null>(null);
  const [childCommunities, setChildCommunities] = useState<Community[]>([]);
  const [loadingSubcommunities, setLoadingSubcommunities] = useState(false);
  const [segments, setSegments] = useState<ProductSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  
  // Manage subcommunities modal states
  const [manageSubcommunitiesOpen, setManageSubcommunitiesOpen] = useState(false);
  const [selectedCompanyForManage, setSelectedCompanyForManage] = useState<{
    id?: string;
    name: string;
    subcommunities: string[];
  } | null>(null);
  
  // Add company flow states
  const [showCompanySelectionModal, setShowCompanySelectionModal] = useState(false);
  const [showCommunityNameModal, setShowCommunityNameModal] = useState(false);
  const [selectedCompanyForAdd, setSelectedCompanyForAdd] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editCommunityModalOpen, setEditCommunityModalOpen] = useState(false);
  const { startBackgroundScraping } = useScrapingProgress();
  
  const hasFetched = useRef(false);

  const loadPlansData = async () => {
    if (plans.length > 0) return plans;

    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('plans_data');
      if (cached) {
        try {
          const { data: cachedPlans, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setPlans(cachedPlans);
            return cachedPlans;
          }
        } catch (e) {}
      }
    }

    const plansRes = await fetch(API_URL + "/plans");
    if (!plansRes.ok) throw new Error("Failed to fetch plans");
    const plansData = await plansRes.json();
    setPlans(plansData);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('plans_data', JSON.stringify({
        data: plansData,
        timestamp: Date.now()
      }));
    }

    return plansData;
  };

  const enrichCommunitiesWithStats = (communities: Community[], plansData: Plan[]) => {
    const plansByCommunity = plansData.reduce((map, plan) => {
      const communityName = typeof plan.community === 'string' 
        ? plan.community 
        : plan.community?.name || '';
      if (!map.has(communityName)) map.set(communityName, []);
      map.get(communityName)!.push(plan);
      return map;
    }, new Map<string, Plan[]>());

    return communities.map(comm => ({
      ...comm,
      totalPlans: (plansByCommunity.get(comm.name) || []).filter(p => p.type === 'plan').length,
      totalNow: (plansByCommunity.get(comm.name) || []).filter(p => p.type === 'now').length,
    })).sort((a, b) => 
      ((b.totalPlans || 0) + (b.totalNow || 0)) - ((a.totalPlans || 0) + (a.totalNow || 0))
    );
  };

  const fetchCommunities = async (options?: { silent?: boolean; bustCache?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError("");
    try {
      const url = options?.bustCache ? `${API_URL}/communities?t=${Date.now()}` : API_URL + "/communities";
      const [communitiesRes, plansData] = await Promise.all([
        fetch(url, { cache: "no-store" }),
        loadPlansData()
      ]);
      
      if (!communitiesRes.ok) throw new Error("Failed to fetch communities");
      const communities = await communitiesRes.json();
      
      const sorted = enrichCommunitiesWithStats(communities, plansData);
      setCommunities(sorted);
      setFilteredCommunities(sorted);
      
      const updated = selectedCommunity 
        ? sorted.find(c => c.name === selectedCommunity.name)
        : null;
      
      setSelectedCommunity(updated || (sorted.length > 0 ? sorted[0] : null));
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await fetch(API_URL + "/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data);
    } catch (err: any) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCommunities();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCommunities(communities);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = communities.filter(community =>
      community.name.toLowerCase().includes(query) ||
      community.location?.toLowerCase().includes(query) ||
      community.description?.toLowerCase().includes(query)
    );
    setFilteredCommunities(filtered);
  }, [searchQuery, communities]);

  // Left sidebar: parent communities only, sorted
  const parentCommunitiesForSidebar = React.useMemo(() => {
    const parents = filteredCommunities.filter((c) => !c.parentCommunityId);
    const builderCount = (c: Community) => (Array.isArray(c.companies) ? c.companies.length : 0);
    const plansSum = (c: Community) => (c.totalPlans || 0) + (c.totalNow || 0);
    return [...parents].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        case "name_desc":
          return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
        case "builders_desc":
          return builderCount(b) - builderCount(a);
        case "plans_desc":
        default:
          return plansSum(b) - plansSum(a);
      }
    });
  }, [filteredCommunities, sortBy]);

  const fetchChildCommunities = React.useCallback(async (parentId: string) => {
    try {
      const res = await fetch(`${API_URL}/communities?parentId=${parentId}`);
      if (!res.ok) return;
      const data = await res.json();
      setChildCommunities(Array.isArray(data) ? data : []);
    } catch {
      setChildCommunities([]);
    }
  }, []);

  const loadSegments = React.useCallback(async () => {
    if (!selectedCommunity?._id) {
      setSegments([]);
      setLoadingSegments(false);
      return;
    }
    try {
      setLoadingSegments(true);
      const segmentsRes = await fetch(`${API_URL}/product-segments?communityId=${selectedCommunity._id}`);
      if (segmentsRes.ok) {
        const segs = await segmentsRes.json();
        setSegments(segs || []);
      } else {
        setSegments([]);
      }
    } catch {
      setSegments([]);
    } finally {
      setLoadingSegments(false);
    }
  }, [selectedCommunity?._id]);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  // Fetch subcommunities when a community is selected (so we can show them in the detail card)
  useEffect(() => {
    if (!selectedCommunity?._id) {
      setChildCommunities([]);
      setLoadingSubcommunities(false);
      return;
    }
    let cancelled = false;
    setLoadingSubcommunities(true);
    fetch(`${API_URL}/communities?parentId=${selectedCommunity._id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          setChildCommunities(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setChildCommunities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSubcommunities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCommunity?._id]);

  // Memoized helper to get subcommunities for a specific company
  const getCompanySubcommunities = React.useCallback(
    (companyId: string | undefined, companyName: string): string[] => {
      if (!childCommunities.length) return [];
      
      const normalizedCompanyName = companyName.toLowerCase();
      
      return childCommunities
        .filter(({ companies = [] }) => 
          companies.some((c: any) => {
            if (typeof c === 'string') {
              return c.toLowerCase() === normalizedCompanyName;
            }
            // Prefer ID match, fallback to name match
            return companyId ? c._id === companyId : c.name?.toLowerCase() === normalizedCompanyName;
          })
        )
        .map(({ name }) => name);
    },
    [childCommunities]
  );

  const handleManageSubcommunities = React.useCallback(
    (companyName: string, companyId?: string) => {
      const subcommunities = getCompanySubcommunities(companyId, companyName);
      setSelectedCompanyForManage({
        id: companyId,
        name: companyName,
        subcommunities,
      });
      setManageSubcommunitiesOpen(true);
    },
    [getCompanySubcommunities]
  );

  const handleAddCompanyClick = () => {
    setShowCompanySelectionModal(true);
  };

  const handleCompanySelected = (companyId: string, companyName: string) => {
    setSelectedCompanyForAdd({ id: companyId, name: companyName });
    setShowCompanySelectionModal(false);
    setShowCommunityNameModal(true);
  };

  const handleCommunityNameSelected = (communityId: string, communityName: string) => {
    if (!selectedCompanyForAdd || !selectedCommunity?._id) return;

    setShowCommunityNameModal(false);
    const companyName = selectedCompanyForAdd.name;
    const companyId = selectedCompanyForAdd.id;
    const parentId = selectedCommunity._id;
    const isSubcommunity = communityId !== parentId;

    // Show "Scraping plans..." immediately; add company and scrape run in background
    startBackgroundScraping({
      companyName,
      communityName,
      beforeScrape: async () => {
        // 1. Always add company to parent community first (store alias: name this company uses)
        const parentRes = await fetch(
          `${API_URL}/communities/${parentId}/companies`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyId,
              nameUsedByCompany: communityName,
            }),
          }
        );

        if (!parentRes.ok) {
          const data = await parentRes.json();
          if (!data.error?.includes("already in this community")) {
            throw new Error(data.error || "Failed to add company to parent community");
          }
          await fetch(
            `${API_URL}/communities/${parentId}/companies`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                companyId,
                nameUsedByCompany: communityName,
              }),
            }
          );
        }

        if (isSubcommunity) {
          const subRes = await fetch(
            `${API_URL}/communities/${communityId}/companies`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                companyId,
                nameUsedByCompany: communityName,
              }),
            }
          );
          if (!subRes.ok) {
            const data = await subRes.json();
            if (!data.error?.includes("already in this community")) {
              throw new Error(data.error || "Failed to add company to subcommunity");
            }
          }
        }

        setError("");
        setSelectedCompanyForAdd(null);
        await fetchCommunities({ silent: true });
        if (selectedCommunity?._id) {
          await fetchChildCommunities(selectedCommunity._id);
        }
      },
      onComplete: () => {
        setSelectedCompanyForAdd(null);
      },
      onError: (err) => {
        setError(err.message || "Failed to add company");
        setSelectedCompanyForAdd(null);
      },
    });
  };

  const handleOpenRemoveCompanyConfirm = (community: Community, companyName: string) => {
    setCompanyToRemove({ community, companyName });
    setRemoveCompanyConfirmOpen(true);
  };

  const handleRemoveCompanyFromCommunity = async () => {
    if (!companyToRemove) return;

    setError("");
    setRemoveCompanyConfirmOpen(false);
    try {
      const company = companies.find(c => c.name === companyToRemove.companyName);
      const queryParam = company ? `companyId=${company._id}` : `company=${encodeURIComponent(companyToRemove.companyName)}`;
      const identifier = companyToRemove.community._id || encodeURIComponent(companyToRemove.community.name);
      
      const res = await fetch(`${API_URL}/communities/${identifier}/companies?${queryParam}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove company from community");
      }

      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setCompanyToRemove(null);
    }
  };

  const handleOpenDeleteSubcommunityConfirm = (child: Community) => {
    if (!child._id) {
      setError("Cannot delete this subcommunity.");
      return;
    }
    setSubcommunityToDelete(child);
    setDeleteSubcommunityConfirmOpen(true);
  };

  const handleDeleteSubcommunity = async () => {
    if (!subcommunityToDelete?._id) return;

    setDeletingSubcommunityId(subcommunityToDelete._id);
    setDeleteSubcommunityConfirmOpen(false);
    setError("");
    try {
      const res = await fetch(`${API_URL}/communities?id=${subcommunityToDelete._id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete subcommunity");
      }
      if (selectedCommunity?._id) fetchChildCommunities(selectedCommunity._id);
      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingSubcommunityId(null);
      setSubcommunityToDelete(null);
    }
  };

  const handleDeleteCommunity = async (community: Community) => {
    if (!community._id) {
      setError("Cannot delete this community as it's derived from plans. Please delete the associated plans first.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${community.name}"? This action cannot be undone.`)) return;

    setDeletingCommunityId(community._id);
    setError("");
    try {
      const res = await fetch(`${API_URL}/communities?id=${community._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete community");
      }

      if (selectedCommunity?._id === community._id) {
        setSelectedCommunity(null);
      }

      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingCommunityId(null);
    }
  };

  const handleToggleCommunityType = async (community: Community, newType: CommunityType) => {
    if (!community._id || community.fromPlans) return;
    const currentType = community.communityType ?? 'standard';
    if (currentType === newType) return;

    setUpdatingCommunityTypeId(community._id);
    setError("");
    try {
      const res = await fetch(`${API_URL}/communities/${community._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityType: newType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update community type");
      }

      await fetchCommunities({ silent: true });
    } catch (err: any) {
      setError(err.message || "Failed to update community type");
    } finally {
      setUpdatingCommunityTypeId(null);
    }
  };

  const handleDeleteAllCommunities = async () => {
    const deletableCommunities = communities.filter(c => c._id && !c.fromPlans);
    
    if (deletableCommunities.length === 0) {
      setError("No communities can be deleted. All communities are derived from plans.");
      return;
    }

    const count = deletableCommunities.length;
    const plural = count === 1 ? 'y' : 'ies';
    const confirmMessage = `Are you sure you want to delete ALL ${count} communit${plural}?\n\nThis will permanently delete:\n${deletableCommunities.map(c => `- ${c.name}`).join('\n')}\n\nThis action CANNOT be undone!`;
    
    if (!window.confirm(confirmMessage)) return;
    if (!window.confirm(`⚠️ FINAL CONFIRMATION ⚠️\n\nAre you absolutely sure you want to delete ALL ${count} communit${plural}? This cannot be undone!`)) return;

    setDeletingAll(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/communities?all=true`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete all communities");
      }

      setSelectedCommunity(null);
      await fetchCommunities();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingAll(false);
    }
  };

  if (loading || loadingCompanies) return <Loader />;

  const isPending = user?.status === "pending";
  const isEditor = user?.permission === "editor" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {isPending && <PendingApprovalBanner />}

        {isPending ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              Your account is pending admin approval. Please wait for an admin to approve your account.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold leading-none tracking-tight">{isEditor ? 'Manage' : 'View'} Communities & Companies</h1>
                    <p className="text-sm text-muted-foreground">{isEditor ? 'Add communities and manage companies in each community' : 'View communities and their companies'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search communities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sort:</span>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                        <SelectTrigger className="w-[180px] h-10">
                          <SelectValue placeholder="Sort by">
                            {sortBy === "name_asc" ? "Alphabetical (A–Z)" : sortBy === "name_desc" ? "Alphabetical (Z–A)" : sortBy === "builders_desc" ? "Most Builders" : "Most Plans"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name_asc">Alphabetical (A–Z)</SelectItem>
                          <SelectItem value="name_desc">Alphabetical (Z–A)</SelectItem>
                          <SelectItem value="builders_desc">Most Builders</SelectItem>
                          <SelectItem value="plans_desc">Most Plans</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isEditor && (
                      <AddCommunityModal 
                        onSuccess={() => {
                          fetchCommunities();
                          setError("");
                        }}
                      />
                    )}
                  </div>
                </div>
                {searchQuery && (
                  <div className="text-sm text-muted-foreground">
                    Showing {parentCommunitiesForSidebar.length} of {communities.filter((c) => !c.parentCommunityId).length} parent communities
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4">
                <ErrorMessage message={error} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <Card className="lg:sticky lg:top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Communities</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 max-h-[calc(100vh-15rem)] overflow-y-auto">
                    {parentCommunitiesForSidebar.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <p className="text-sm text-muted-foreground">
                          {searchQuery.trim() ? `No parent communities found matching "${searchQuery}"` : "No parent communities."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {parentCommunitiesForSidebar.map((community) => {
                          const totalHomes = (community.totalPlans || 0) + (community.totalNow || 0);
                          return (
                            <button
                              key={community.name}
                              onClick={() => setSelectedCommunity(community)}
                              className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between ${
                                selectedCommunity?.name === community.name ? 'bg-muted border-l-4 border-primary' : 'border-l-4 border-transparent'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{community.name}</span>
                                  {community.fromPlans && (
                                    <Badge variant="secondary" className="text-xs">Plans</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">{community.companies.length} companies</p>
                                  {totalHomes > 0 && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <p className="text-xs text-muted-foreground">{totalHomes} homes</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                {!selectedCommunity ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-12">
                        <p className="text-lg text-muted-foreground">Select a community to view details</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-2xl">{selectedCommunity.name}</CardTitle>
                            {selectedCommunity.fromPlans && (
                              <Badge variant="secondary" className="text-xs">
                                From Plans
                              </Badge>
                            )}
                          </div>
                          {selectedCommunity.description && (
                            <p className="text-sm text-muted-foreground mb-1">{selectedCommunity.description}</p>
                          )}
                          {selectedCommunity.location && (
                            <p className="text-sm text-muted-foreground">📍 {selectedCommunity.location}</p>
                          )}
                        </div>
                        {isEditor && !selectedCommunity.fromPlans && selectedCommunity._id && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditCommunityModalOpen(true)}
                              className="h-8 w-8"
                              title="Edit community"
                              aria-label="Edit community"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCommunity(selectedCommunity)}
                              disabled={deletingCommunityId === selectedCommunity._id}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete community"
                              aria-label="Delete community"
                            >
                              {deletingCommunityId === selectedCommunity._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">Companies Building Here</h3>
                            <Badge variant="secondary" className="text-sm">{selectedCommunity.companies.length}</Badge>
                          </div>
                          
                          {selectedCommunity.companies.length === 0 ? (
                            <div className="text-center py-8 bg-muted rounded-lg">
                              <p className="text-sm text-muted-foreground">No companies yet. Add one below.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-4">
                              {selectedCommunity.companies.map((company) => {
                                const companyName = typeof company === 'string' ? company : company.name;
                                const companyKey = typeof company === 'string' ? company : company._id;
                                const companyId = typeof company === 'string' ? companies.find(c => c.name === company)?._id : company._id;
                                // Use full company from global list so color matches Companies page and charts
                                const fullCompany = companies.find(c => c._id === companyId || c.name === companyName);
                                const companyColorRaw = fullCompany?.color ?? (typeof company === 'object' ? (company as { color?: string }).color : undefined);
                                const companyColor = (companyColorRaw && typeof companyColorRaw === 'string') ? companyColorRaw : null;
                                const subcommunities = getCompanySubcommunities(companyId, companyName);
                                
                                return (
                                  <div
                                    key={companyKey}
                                    className="flex items-start justify-between p-3 bg-muted rounded-md"
                                  >
                                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="inline-block w-3 h-3 rounded-full border flex-shrink-0"
                                          style={{
                                            backgroundColor: getCompanyColor(fullCompany ?? company),
                                            borderColor: getCompanyColor(fullCompany ?? company),
                                          }}
                                        />
                                        <span className="text-sm font-medium truncate">{companyName}</span>
                                      </div>
                                      <CompanySubcommunityBadges
                                        companyName={companyName}
                                        companyId={companyId}
                                        subcommunities={subcommunities}
                                        isEditor={isEditor}
                                        hasSubcommunities={childCommunities.length > 0}
                                        onManageClick={handleManageSubcommunities}
                                      />
                                    </div>
                                    {isEditor && (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {companyId && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setEditCompanyTarget({ id: companyId, name: companyName, color: companyColor ?? null });
                                              setEditCompanyOpen(true);
                                            }}
                                            className="h-7 w-7"
                                            title="Edit company (e.g. chart color)"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleOpenRemoveCompanyConfirm(selectedCommunity, companyName)}
                                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {isEditor && (
                          <div className="pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium">Add Company to {selectedCommunity.name}</label>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-2"
                                onClick={handleAddCompanyClick}
                              >
                                <Plus className="h-4 w-4" />
                                Add Company
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                  </CardContent>
                  </Card>

                  {/* Community type group card */}
                  {isEditor && !selectedCommunity.fromPlans && selectedCommunity._id && (
                    <Card className="mt-6">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Community Type</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Switch
                              id="community-type-toggle"
                              checked={selectedCommunity.communityType !== 'competitor'}
                              onCheckedChange={(checked) =>
                                handleToggleCommunityType(
                                  selectedCommunity,
                                  checked ? 'standard' : 'competitor'
                                )
                              }
                              disabled={updatingCommunityTypeId === selectedCommunity._id}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">
                                {selectedCommunity.communityType !== 'competitor'
                                  ? 'General Community'
                                  : 'Side Community / Competitor'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Choose whether this is a general community or a side/competitor community.
                              </span>
                            </div>
                          </div>
                          {updatingCommunityTypeId === selectedCommunity._id && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="mt-6">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Subcommunities</CardTitle>
                        {!loadingSubcommunities && childCommunities.length > 0 && (
                          <Badge variant="secondary" className="text-sm">{childCommunities.length}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingSubcommunities ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-sm">Loading subcommunities...</span>
                        </div>
                      ) : childCommunities.length === 0 ? (
                        <div className="text-left">
                          <p className="text-sm text-muted-foreground mb-4">No subcommunities yet.</p>
                          {isEditor && selectedCommunity._id && (
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-sm font-medium">Add Subcommunity to {selectedCommunity.name}</span>
                              <AddSubcommunityModal
                                defaultParentId={selectedCommunity._id}
                                onSuccess={() => {
                                  fetchCommunities();
                                  fetchChildCommunities(selectedCommunity._id!);
                                  setError("");
                                }}
                                trigger={
                                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Subcommunity
                                  </Button>
                                }
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                            {childCommunities.map((child) => (
                              <div
                                key={child._id || child.name}
                                className="flex items-center justify-between p-3 bg-muted rounded-md"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate">{child.name}</span>
                                  {child.location && (
                                    <span className="text-xs text-muted-foreground shrink-0">📍 {child.location}</span>
                                  )}
                                </div>
                                {isEditor && child._id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenDeleteSubcommunityConfirm(child)}
                                    disabled={deletingSubcommunityId === child._id}
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  >
                                    {deletingSubcommunityId === child._id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <X className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          {isEditor && selectedCommunity._id && (
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium">Add Subcommunity to {selectedCommunity.name}</label>
                              <AddSubcommunityModal
                                defaultParentId={selectedCommunity._id}
                                onSuccess={() => {
                                  fetchCommunities();
                                  fetchChildCommunities(selectedCommunity._id!);
                                  setError("");
                                }}
                                trigger={
                                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Subcommunity
                                  </Button>
                                }
                              />
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {selectedCommunity._id && (
                    <ProductLinesCard
                      communityId={selectedCommunity._id}
                      communityName={selectedCommunity.name}
                      segments={segments}
                      companies={selectedCommunity.companies
                        .map((c) => (typeof c === "string" ? null : { _id: c._id, name: c.name }))
                        .filter((c): c is { _id: string; name: string } => c !== null)}
                      loading={loadingSegments}
                      onRefetch={loadSegments}
                      isEditor={!!isEditor}
                    />
                  )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Step 1: Select Company to Add */}
      {selectedCommunity && (
        <SelectCompanyForAddModal
          open={showCompanySelectionModal}
          onOpenChange={setShowCompanySelectionModal}
          existingCompanies={selectedCommunity.companies.map(c => typeof c === 'string' ? c : c.name)}
          onSelect={handleCompanySelected}
        />
      )}

      {/* Step 2: Select Community Name */}
      {selectedCommunity?._id && selectedCompanyForAdd && (
        <SelectCommunityNameModal
          open={showCommunityNameModal}
          onOpenChange={setShowCommunityNameModal}
          parentCommunityId={selectedCommunity._id}
          parentCommunityName={selectedCommunity.name}
          companyName={selectedCompanyForAdd.name}
          onSelect={handleCommunityNameSelected}
        />
      )}

      {/* Manage Subcommunities Modal */}
      {selectedCommunity && selectedCompanyForManage && (
        <ManageSubcommunitiesModal
          open={manageSubcommunitiesOpen}
          onOpenChange={setManageSubcommunitiesOpen}
          companyId={selectedCompanyForManage.id}
          companyName={selectedCompanyForManage.name}
          parentCommunityId={selectedCommunity._id!}
          parentCommunityName={selectedCommunity.name}
          currentSubcommunities={selectedCompanyForManage.subcommunities}
          onSuccess={async () => {
            await fetchCommunities();
            if (selectedCommunity._id) {
              await fetchChildCommunities(selectedCommunity._id);
            }
            setError("");
          }}
        />
      )}

      {/* Delete Subcommunity Confirmation Dialog */}
      <Dialog open={deleteSubcommunityConfirmOpen} onOpenChange={setDeleteSubcommunityConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subcommunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {subcommunityToDelete && (
              <>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete the subcommunity <strong>&quot;{subcommunityToDelete.name}&quot;</strong>?
                </p>
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                  Warning: This action cannot be undone.
                </p>
              </>
            )}
          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="default"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteSubcommunity}
              disabled={deletingSubcommunityId !== null}
            >
              {deletingSubcommunityId === subcommunityToDelete?._id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Modal (e.g. chart color) */}
      {editCompanyTarget && (
        <EditCompanyModal
          open={editCompanyOpen}
          onOpenChange={(open) => {
            setEditCompanyOpen(open);
            if (!open) setEditCompanyTarget(null);
          }}
          companyId={editCompanyTarget.id}
          companyName={editCompanyTarget.name}
          initialColor={editCompanyTarget.color}
          onSuccess={() => {
            fetchCompanies();
            fetchCommunities({ silent: true });
            setEditCompanyTarget(null);
          }}
        />
      )}

      {/* Remove Company Confirmation Dialog */}
      <Dialog open={removeCompanyConfirmOpen} onOpenChange={setRemoveCompanyConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Company</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {companyToRemove && (
              <>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to remove <strong>&quot;{companyToRemove.companyName}&quot;</strong> from{" "}
                  <strong>&quot;{companyToRemove.community.name}&quot;</strong>?
                </p>
              </>
            )}
          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="default"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveCompanyFromCommunity}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Community: name, description, location */}
      {selectedCommunity?._id && (
        <EditCommunityModal
          community={{
            _id: selectedCommunity._id,
            name: selectedCommunity.name,
            description: selectedCommunity.description ?? null,
            location: selectedCommunity.location ?? null,
            imagePath: selectedCommunity.imagePath ?? null,
            hasImage: selectedCommunity.hasImage,
          }}
          open={editCommunityModalOpen}
          onOpenChange={setEditCommunityModalOpen}
          onSuccess={() => {
            fetchCommunities({ bustCache: true });
            setError("");
          }}
        />
      )}
    </div>
  );
}
````

## app/communities/page.tsx

Path: `app/communities/page.tsx`

````tsx
"use client"

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import AddCommunityModal from "../components/AddCommunityModal";
import EditCommunityModal from "../components/EditCommunityModal";
import type { EditCommunityModalCommunity } from "../components/EditCommunityModal";
import { Search, RefreshCw, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import API_URL from '../config';
import { getCompanyColor } from '../utils/colors';
import { getCommunityCardImage } from '../utils/communityImages';
import { communityNameToSlug } from '../community/utils/formatCommunityName';
import { useAuth } from "../contexts/AuthContext";

interface Community {
  name: string;
  companies: string[];
  totalPlans: number;
  totalNow: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  recentChanges: number;
  description?: string;
  location?: string;
  _id?: string | null;
  hasImage?: boolean;
  imagePath?: string | null;
  fromPlans?: boolean;
  parentCommunityId?: string | null;
  children?: Community[];
  communityType?: 'standard' | 'competitor';
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>(() => {
    // Try to load from cache on initial load
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('communities_data');
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // Cache for 5 minutes
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return data;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return [];
  });
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>(communities);
  const [searchQuery, setSearchQuery] = useState("");
  const [communityTypeFilter, setCommunityTypeFilter] = useState<"all" | "general" | "site">("all");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "builders_desc" | "plans_desc">("plans_desc");
  const [loading, setLoading] = useState(communities.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [communityToEdit, setCommunityToEdit] = useState<EditCommunityModalCommunity | null>(null);
  const router = useRouter();
  const hasFetched = useRef(false);

  const fetchCommunities = async (forceRefresh = false) => {
    // Check cache first unless force refresh
    if (!forceRefresh && typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('communities_data');
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // Cache for 5 minutes
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            setCommunities(data);
            setFilteredCommunities(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Continue to fetch if cache fails
        }
      }
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const communitiesRes = await fetch(API_URL + "/communities?parentsOnly=true&communityType=all");
      if (!communitiesRes.ok) throw new Error("Failed to fetch communities");
      const communitiesData: any[] = await communitiesRes.json();

      const communityData: Community[] = communitiesData.map((comm: any) => {
        const companyNames = (comm.companies || []).map((c: any) => {
          if (typeof c === 'string') return c;
          if (c && typeof c === 'object' && c.name) return c.name;
          return '';
        }).filter((name: string) => name);
        const minP = comm.minPrice ?? 0;
        const maxP = comm.maxPrice ?? 0;
        const type = comm.communityType === 'competitor' ? 'competitor' : 'standard';
        return {
          name: comm.name,
          companies: companyNames,
          totalPlans: comm.totalPlans ?? 0,
          totalNow: comm.totalQuickMoveIns ?? 0,
          avgPrice: comm.avgPrice ?? 0,
          priceRange: { min: minP, max: maxP },
          recentChanges: 0,
          description: comm.description,
          location: comm.location,
          _id: comm._id,
          hasImage: comm.hasImage || false,
          imagePath: comm.imagePath || null,
          fromPlans: comm.fromPlans || false,
          parentCommunityId: comm.parentCommunityId || null,
          communityType: type,
        };
      });

      // Cache the data
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('communities_data', JSON.stringify({
          data: communityData,
          timestamp: Date.now()
        }));
      }

      setCommunities(communityData);
      setFilteredCommunities(communityData);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCommunities(true);
  }, []);

  // Filter by community type: All = standard + competitor, General = standard only, Site = competitor only
  const communitiesForFilter = useMemo(() => {
    if (communityTypeFilter === "general") {
      return communities.filter((c) => (c.communityType ?? 'standard') === 'standard');
    }
    if (communityTypeFilter === "site") {
      return communities.filter((c) => c.communityType === 'competitor');
    }
    return [...communities];
  }, [communities, communityTypeFilter]);

  // Filter and sort communities based on type filter, search query, and sort option
  useEffect(() => {
    let filtered;
    if (searchQuery.trim() === "") {
      filtered = [...communitiesForFilter];
    } else {
      const query = searchQuery.toLowerCase();
      filtered = communitiesForFilter.filter((community: Community) =>
        community.name.toLowerCase().includes(query) ||
        community.location?.toLowerCase().includes(query) ||
        community.description?.toLowerCase().includes(query) ||
        community.companies.some((company: string) => company.toLowerCase().includes(query))
      );
    }

    const builderCount = (c: Community) => (c.companies || []).length;
    const plansSum = (c: Community) => (c.totalPlans || 0) + (c.totalNow || 0);

    filtered.sort((a: Community, b: Community) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        case "name_desc":
          return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
        case "builders_desc":
          return builderCount(b) - builderCount(a);
        case "plans_desc":
        default:
          return plansSum(b) - plansSum(a);
      }
    });

    setFilteredCommunities(filtered);
  }, [searchQuery, sortBy, communitiesForFilter]);

  const handleCommunityClick = (community: Community) => {
    const slug = communityNameToSlug(community.name);
    router.push(`/community/${slug}`);
  };

  const renderCommunityCard = (community: Community) => {
    return (
      <Card
        key={community._id ?? community.name}
        onClick={() => handleCommunityClick(community)}
        className="cursor-pointer overflow-auto"
      >
        <div className="relative overflow-hidden h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCommunityCardImage(community)}
            alt={community.name}
            className="w-full h-full object-cover"
          />
          {community.recentChanges > 0 && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              {community.recentChanges} new
            </Badge>
          )}
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">{community.name}</CardTitle>
            {isEditor && community._id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCommunityToEdit({
                    _id: community._id!,
                    name: community.name,
                    description: community.description ?? null,
                    location: community.location ?? null,
                    imagePath: community.imagePath ?? null,
                    hasImage: community.hasImage,
                  });
                  setEditModalOpen(true);
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Edit community"
                aria-label="Edit community"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Plan/Now Summary */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-primary"></span>
                  <span className="text-sm font-medium text-muted-foreground">Plans</span>
                </div>
                <Badge variant="secondary">
                  {community.totalPlans}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-success"></span>
                  <span className="text-sm font-medium text-muted-foreground">Available Now</span>
                </div>
                <Badge variant="success">
                  {community.totalNow}
                </Badge>
              </div>
              
              {/* Price Info (— when no plan data) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Price:</span>
                  <span className="font-semibold text-primary">
                    {community.avgPrice > 0 ? `$${community.avgPrice.toLocaleString()}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price Range:</span>
                  <span className="font-semibold text-foreground text-sm">
                    {community.priceRange.max > 0
                      ? `$${community.priceRange.min.toLocaleString()} - $${community.priceRange.max.toLocaleString()}`
                      : "—"}
                  </span>
                </div>
              </div>
              
              {/* Builders */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Builders:</span>
                <div className="flex gap-1">
                  {community.companies.slice(0, 3).map((company) => {
                    const color = getCompanyColor(company);
                    return (
                      <span
                        key={company}
                        className="inline-block w-3 h-3 rounded-full border"
                        style={{ backgroundColor: color, borderColor: color }}
                        title={company}
                      />
                    );
                  })}
                  {community.companies.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{community.companies.length - 3}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    );
  };

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  const isEditor = user?.permission === "editor" || user?.role === "admin";
  const isPending = user?.status === "pending";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
            <div className="mb-6">
              <div className="flex flex-col gap-4">
                {/* Title and Button Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold leading-none tracking-tight">Communities</h1>
                    <p className="text-sm text-muted-foreground">{isEditor ? 'Explore and manage' : 'Explore'} home plans by community</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search communities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    {/* Community type dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Type:</span>
                      <Select
                        value={communityTypeFilter}
                        onValueChange={(v) => setCommunityTypeFilter(v as typeof communityTypeFilter)}
                      >
                        <SelectTrigger className="w-[200px] h-10">
                          <SelectValue placeholder="Community type">
                            {communityTypeFilter === "general"
                              ? "General Community"
                              : communityTypeFilter === "site"
                              ? "Side Community"
                              : "All"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="general">General Community</SelectItem>
                          <SelectItem value="site">Side Community</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Sort dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sort:</span>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                        <SelectTrigger className="w-[180px] h-10">
                          <SelectValue placeholder="Sort by">
                            {sortBy === "name_asc" ? "Alphabetical (A–Z)" : sortBy === "name_desc" ? "Alphabetical (Z–A)" : sortBy === "builders_desc" ? "Most Builders" : "Most Plans"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name_asc">Alphabetical (A–Z)</SelectItem>
                          <SelectItem value="name_desc">Alphabetical (Z–A)</SelectItem>
                          <SelectItem value="builders_desc">Most Builders</SelectItem>
                          <SelectItem value="plans_desc">Most Plans</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Refresh Button */}
                    <button
                      onClick={() => fetchCommunities(true)}
                      disabled={refreshing}
                      title="Refresh communities data"
                      className={`p-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors ${
                        refreshing ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Only show Add Community button for editors/admins and not pending users */}
                    {isEditor && !isPending && (
                      <AddCommunityModal 
                        onSuccess={() => {
                          fetchCommunities(true); // Force refresh
                        }}
                      />
                    )}
                  </div>
                </div>
                {/* Results Counter */}
                {(searchQuery || communityTypeFilter !== "all") && (
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredCommunities.length} of {communitiesForFilter.length} communities
                  </div>
                )}
              </div>
            </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.map((community) => renderCommunityCard(community))}
        </div>
        
        {filteredCommunities.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  {searchQuery.trim() 
                    ? `No communities found matching "${searchQuery}"`
                    : "No communities found."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <EditCommunityModal
          community={communityToEdit}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSuccess={() => fetchCommunities(true)}
        />
      </div>
    </div>
  );
}
````

## app/community/[communityName]/page.tsx

Path: `app/community/[communityName]/page.tsx`

````tsx
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

  // Display: selected subcommunity's data or main community's
  const displayPlans = selectedSubcommunity ? subcommunityPlans : plans;
  const companies = useMemo(
    () => getCompanyNames((selectedSubcommunity ?? community)?.companies),
    [selectedSubcommunity, community]
  );

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

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Desktop Sidebar - Hidden on mobile */}
                <div className="hidden lg:block">
                  <CompanySidebar
                    companies={companies}
                    selectedCompany={selectedCompany}
                    onCompanySelect={setSelectedCompany}
                    companyColorMap={companyColorMap}
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
````

## app/companies/page.tsx

Path: `app/companies/page.tsx`

````tsx
"use client"

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import AddCompanyModal from "../components/AddCompanyModal";
import EditCompanyModal from "../components/EditCompanyModal";
import PendingApprovalBanner from "../components/PendingApprovalBanner";
import { ExternalLink, Trash2, Search, Pencil } from "lucide-react";
import API_URL from '../config';
import { useAuth } from "../contexts/AuthContext";
import { getCompanyColor } from "../utils/colors";

interface Company {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Plan {
  plan_name: string;
  company: string | { name: string };
  type: string;
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>(() => {
    // Try to load plans from cache on initial load
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('plans_data');
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // Cache for 5 minutes
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            return data;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [editCompanyTarget, setEditCompanyTarget] = useState<Company | null>(null);
  const { user } = useAuth();
  const hasFetched = useRef(false);

  const sortCompanies = (companiesList: Company[], plansData: Plan[]) => {
    const homeCountMap = plansData.reduce((map, plan) => {
      const companyName = typeof plan.company === 'string' 
        ? plan.company 
        : plan.company?.name || '';
      if (companyName) {
        map.set(companyName, (map.get(companyName) || 0) + 1);
      }
      return map;
    }, new Map<string, number>());
    
    return [...companiesList].sort((a, b) => {
      const isUnionmainA = a.name.toLowerCase().includes('unionmain');
      const isUnionmainB = b.name.toLowerCase().includes('unionmain');
      
      if (isUnionmainA !== isUnionmainB) return isUnionmainA ? -1 : 1;
      
      return (homeCountMap.get(b.name) || 0) - (homeCountMap.get(a.name) || 0);
    });
  };

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      
      let plansData = plans;
      if (plans.length === 0) {
        if (typeof window !== 'undefined') {
          const cached = sessionStorage.getItem('plans_data');
          if (cached) {
            try {
              const { data: cachedPlans, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < 5 * 60 * 1000) {
                plansData = cachedPlans;
                setPlans(cachedPlans);
              }
            } catch (e) {}
          }
        }
        
        if (plansData.length === 0) {
          const plansRes = await fetch(API_URL + "/plans");
          if (!plansRes.ok) throw new Error("Failed to fetch plans");
          plansData = await plansRes.json();
          setPlans(plansData);
          
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('plans_data', JSON.stringify({
              data: plansData,
              timestamp: Date.now()
            }));
          }
        }
      }
      
      const sortedCompanies = sortCompanies(data, plansData);
      setCompanies(sortedCompanies);
      setFilteredCompanies(sortedCompanies);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCompanies(companies);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(query) ||
      company.description?.toLowerCase().includes(query) ||
      company.headquarters?.toLowerCase().includes(query) ||
      company.website?.toLowerCase().includes(query)
    );
    setFilteredCompanies(filtered);
  }, [searchQuery, companies]);

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
            <div className="mb-6">
              <div className="flex flex-col gap-4">
                {/* Title and Button Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold leading-none tracking-tight">Companies</h2>
                    <p className="text-sm text-muted-foreground">{isEditor ? 'Manage' : 'View'} home building companies</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
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
                </div>
                {/* Results Counter */}
                {searchQuery && (
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredCompanies.length} of {companies.length} companies
                  </div>
                )}
              </div>
            </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Companies List */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => {
            // Calculate home count for this company
            const homeCount = plans.filter(plan => {
              const companyName = typeof plan.company === 'string' 
                ? plan.company 
                : plan.company?.name || '';
              return companyName === company.name;
            }).length;
            
            return (
              <Card key={company._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="shrink-0 w-4 h-4 rounded-full border-2 border-border"
                        style={{
                          backgroundColor: getCompanyColor(company),
                          borderColor: getCompanyColor(company),
                        }}
                        title="Chart color"
                      />
                      <CardTitle className="text-lg truncate">{company.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                          title="Website"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {isEditor && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditCompanyTarget(company);
                              setEditCompanyOpen(true);
                            }}
                            className="h-8 w-8"
                            title="Edit company"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCompany(company._id, company.name)}
                            disabled={deletingCompanyId === company._id}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete company"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
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
            );
          })}
        </div>

        {filteredCompanies.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  {searchQuery.trim() 
                    ? `No companies found matching "${searchQuery}"`
                    : "No companies found. Add one to get started!"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {editCompanyTarget && (
          <EditCompanyModal
            open={editCompanyOpen}
            onOpenChange={(open) => {
              setEditCompanyOpen(open);
              if (!open) setEditCompanyTarget(null);
            }}
            companyId={editCompanyTarget._id}
            initialCompany={{
              name: editCompanyTarget.name,
              description: editCompanyTarget.description ?? undefined,
              website: editCompanyTarget.website ?? undefined,
              headquarters: editCompanyTarget.headquarters ?? undefined,
              founded: editCompanyTarget.founded ?? undefined,
              color: editCompanyTarget.color ?? undefined,
            }}
            onSuccess={() => fetchCompanies()}
          />
        )}
          </>
        )}
      </div>
    </div>
  );
}
````

## app/admin/dashboard/page.tsx

Path: `app/admin/dashboard/page.tsx`

````tsx
"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import Loader from "@/app/components/Loader"
import { Users, CheckCircle2, Clock, XCircle, Shield } from "lucide-react"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    rejectedUsers: 0,
    pendingPermissionRequests: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [usersResponse, requestsResponse] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/permission-requests"),
      ]);

      if (!usersResponse.ok) throw new Error("Failed to fetch users");
      
      const usersData = await usersResponse.json();
      const users = usersData.users || [];

      let pendingRequests = 0;
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        pendingRequests = requestsData.requests?.filter((r: any) => r.status === 'pending').length || 0;
      }

      setStats({
        totalUsers: users.length,
        pendingUsers: users.filter((u: any) => u.status === "pending").length,
        approvedUsers: users.filter((u: any) => u.status === "approved").length,
        rejectedUsers: users.filter((u: any) => u.status === "rejected").length,
        pendingPermissionRequests: pendingRequests,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">Overview of user management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-amber-600">{stats.pendingUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Permission Requests</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.pendingPermissionRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Approved Users</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-emerald-600">{stats.approvedUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Manage users and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => window.location.href = '/admin/users'}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Users className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold text-sm md:text-base">Manage User Approvals</div>
                    <div className="text-xs text-muted-foreground hidden sm:block">Review and approve user registrations</div>
                  </div>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => window.location.href = '/admin/permission-requests'}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-sm md:text-base flex items-center gap-2">
                      Review Permission Requests
                      {stats.pendingPermissionRequests > 0 && (
                        <Badge className="bg-amber-500 text-xs">{stats.pendingPermissionRequests}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground hidden sm:block">Handle permission upgrade requests</div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
````

## app/api/scrape/route.ts

Path: `app/api/scrape/route.ts`

````ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongodb';
import Plan from '@/app/models/Plan';
import PriceHistory from '@/app/models/PriceHistory';
import Company from '@/app/models/Company';
import Community from '@/app/models/Community';
import ProductSegment from '@/app/models/ProductSegment';
import { identifyForScrape } from '@/app/lib/identify';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PlanData {
  plan_name: string;
  price: number;
  sqft?: number;
  stories?: string;
  price_per_sqft?: number;
  beds?: string;
  baths?: string;
  address?: string;
  design_number?: string;
  type: 'plan' | 'now';
}

interface ErrorDetail {
  plan: string;
  error: string;
}

interface ScrapeResult {
  saved: (typeof Plan.prototype)[];
  errors: ErrorDetail[];
}

async function scrapePlansForType(
  company: string,
  community: string,
  type: 'now' | 'plan',
  openai: OpenAI,
  segmentRef?: { _id: mongoose.Types.ObjectId; name: string; label: string },
  /** If set, use this in the AI prompt instead of `community` (e.g. company-specific alias). */
  communityNameForPrompt?: string
): Promise<ScrapeResult> {
  // Use AI web search for all requests
  const typeDescription = type === 'now' ? 'quick move-ins' : 'floor plans';
  const communityInPrompt = communityNameForPrompt?.trim() || community;

  const prompt = `Web search for getting the list of the ${typeDescription} from ${company}, for ${communityInPrompt} community. Give me that as the json structure of list. Give me most current and kind of accurate list of it.

Return a JSON object with a "plans" array. Each plan object should have:
- plan_name (string, required): The name/model of the plan or address for quick move-ins
- price (number, required): The price in USD
- sqft (number, optional): Square footage
- stories (string, optional): Number of stories
- beds (string or number, optional): Number of bedrooms
- baths (string or number, optional): Number of bathrooms
- address (string, optional): Full address (for quick move-ins)
- design_number (string, optional): Design/model number

Return ONLY valid JSON, no additional text.`;

  // Call OpenAI API with gpt-4o-search-preview model for AI web scraping

  console.log('Prompt:', prompt);
  const completion = await openai.responses.create({
    model: 'o4-mini',
    tools: [
      { type: "web_search" },
    ],
    input: [
      {
        role: 'system',
        content: 'You are a helpful assistant that provides accurate, current information about home building communities. Always return ONLY valid JSON with accurate, up-to-date data. Do not include any text before or after the JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const aiResponse = completion.output_text;
  
  // Validate that we got a response
  if (!aiResponse) {
    throw new Error('No response from OpenAI API');
  }

  // console.log('AI Response:\n', aiResponse);

  // Parse the JSON response with proper validation
  let plansData: { plans?: PlanData[]; data?: PlanData[]; [key: string]: unknown };
  try {
    // Trim any whitespace
    let cleanedResponse = aiResponse.trim();
    
    // Remove markdown code block formatting if present
    // Pattern: ```json\n{...}\n``` or ```\n{...}\n```
    const markdownCodeBlockPattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
    const match = cleanedResponse.match(markdownCodeBlockPattern);
    
    if (match && match[1]) {
      cleanedResponse = match[1].trim();
      console.log('Extracted JSON from markdown code block');
    }
    
    // Ensure response is valid JSON string
    if (!cleanedResponse.startsWith('{') && !cleanedResponse.startsWith('[')) {
      throw new Error('Response does not start with valid JSON');
    }
    
    plansData = JSON.parse(cleanedResponse);
    
    // Verify plansData is an object
    if (typeof plansData !== 'object' || plansData === null) {
      throw new Error('Parsed response is not a valid object');
    }
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
    console.error('JSON Parse Error:', errorMessage);
    console.error('AI Response (first 500 chars):', aiResponse.substring(0, 500));
    throw new Error(`Failed to parse AI response as JSON: ${errorMessage}`);
  }

  // Extract plans array with validation
  const plans: PlanData[] = plansData.plans || plansData.data || [];
  
  if (!Array.isArray(plans)) {
    console.error('Invalid plans format:', plansData);
    throw new Error('Response does not contain a valid plans array');
  }
  
  if (plans.length === 0) {
    console.warn('AI returned empty plans array for', company, community, type);
  }

  // Process and save plans to MongoDB
  const savedPlans = [];
  const errors = [];

  for (const planData of plans) {
    try {
      // Validate required fields
      if (!planData.plan_name || !planData.price) {
        errors.push({
          plan: planData.plan_name || 'Unknown',
          error: 'Missing required fields (plan_name or price)',
        });
        continue;
      }

      // Calculate price_per_sqft if not provided
      let price_per_sqft = planData.price_per_sqft;
      if (!price_per_sqft && planData.sqft && planData.price) {
        price_per_sqft = Math.round((planData.price / planData.sqft) * 100) / 100;
      }

      // Find or create Company
      let companyDoc = await Company.findOne({ name: company.trim() });
      if (!companyDoc) {
        companyDoc = new Company({ name: company.trim() });
        await companyDoc.save();
      }

      // Find or create Community
      let communityDoc = await Community.findOne({ name: community.trim() });
      if (!communityDoc) {
        communityDoc = new Community({ name: community.trim() });
        await communityDoc.save();
      }

      // Prepare embedded company and community objects
      const companyRef = {
        _id: companyDoc._id,
        name: companyDoc.name,
      };

      const communityRef = {
        _id: communityDoc._id,
        name: communityDoc.name,
        location: communityDoc.location,
      };

      // Find existing plan using embedded structure (scoped by segment if provided)
      const planQuery: any = {
        plan_name: planData.plan_name,
        'company.name': company.trim(),
        'community.name': community.trim(),
        type: type,
      };

      if (segmentRef) {
        planQuery['segment._id'] = segmentRef._id;
      } else {
        // Plans without segment should not accidentally collide with segmented ones
        planQuery['segment._id'] = { $exists: false };
      }

      const existingPlan = await Plan.findOne(planQuery);

      if (existingPlan) {
        // Check if price changed
        if (existingPlan.price !== planData.price) {
          // Record price history
          const priceHistory = new PriceHistory({
            plan_id: existingPlan._id,
            old_price: existingPlan.price,
            new_price: planData.price,
            changed_at: new Date(),
          });
          await priceHistory.save();

          // Update plan
          existingPlan.price = planData.price;
          existingPlan.last_updated = new Date();
          existingPlan.price_changed_recently = true;
        }

        // Update other fields
        if (planData.sqft !== undefined) existingPlan.sqft = planData.sqft;
        if (planData.stories !== undefined) existingPlan.stories = planData.stories;
        if (price_per_sqft !== undefined) existingPlan.price_per_sqft = price_per_sqft;
        if (planData.beds !== undefined) existingPlan.beds = planData.beds.toString();
        if (planData.baths !== undefined) existingPlan.baths = planData.baths.toString();
        if (planData.address !== undefined) existingPlan.address = planData.address;
        if (planData.design_number !== undefined) existingPlan.design_number = planData.design_number;

        // Update embedded references in case company/community metadata changed
        existingPlan.company = companyRef;
        existingPlan.community = communityRef;
        if (segmentRef) {
          existingPlan.segment = {
            _id: segmentRef._id,
            name: segmentRef.name,
            label: segmentRef.label,
          } as any;
        }

        await existingPlan.save();
        savedPlans.push(existingPlan);
      } else {
        // Create new plan with embedded structure
        const newPlan = new Plan({
          plan_name: planData.plan_name,
          price: planData.price,
          sqft: planData.sqft,
          stories: planData.stories,
          price_per_sqft: price_per_sqft,
          company: companyRef,
          community: communityRef,
          segment: segmentRef
            ? {
                _id: segmentRef._id,
                name: segmentRef.name,
                label: segmentRef.label,
              }
            : undefined,
          type: type,
          beds: planData.beds?.toString(),
          baths: planData.baths?.toString(),
          address: planData.address,
          design_number: planData.design_number,
          last_updated: new Date(),
        });

        await newPlan.save();
        savedPlans.push(newPlan);
      }
    } catch (planError) {
      const errorMessage = planError instanceof Error ? planError.message : 'Failed to save plan';
      errors.push({
        plan: planData.plan_name || 'Unknown',
        error: errorMessage,
      });
    }
  }

  return { saved: savedPlans, errors };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    await connectDB();
    const body = await request.json();
    const { company, community, segmentId } = body;

    if (!company || !community) {
      return NextResponse.json(
        { error: 'Company and community are required' },
        { status: 400 }
      );
    }

    // Resolve alias: name this company uses for this community (for AI prompt)
    const resolved = await identifyForScrape({
      companyName: company,
      communityName: community,
      segmentId,
    });
    const companyForDb = resolved?.companyName ?? company.trim();
    const communityForDb = resolved?.communityName ?? community.trim();
    const communityNameForPrompt = resolved?.communityNameForScrape || communityForDb;

    // Optional: resolve product segment (lot-size line) if provided
    let segmentRef:
      | { _id: mongoose.Types.ObjectId; name: string; label: string }
      | undefined;

    if (segmentId && mongoose.Types.ObjectId.isValid(segmentId)) {
      const segmentDoc = await ProductSegment.findById(segmentId);
      if (segmentDoc) {
        segmentRef = {
          _id: segmentDoc._id,
          name: segmentDoc.name,
          label: segmentDoc.label,
        };
      }
    }

    // Remove all existing plans for this company+community (and segment if scoped) BEFORE syncing
    const communityDoc = await Community.findOne({ name: communityForDb }).select('_id').lean();
    const companyDoc = await Company.findOne({ name: companyForDb }).select('_id').lean();
    const communityId = communityDoc && '_id' in communityDoc ? (communityDoc as { _id: mongoose.Types.ObjectId })._id : null;
    const companyId = companyDoc && '_id' in companyDoc ? (companyDoc as { _id: mongoose.Types.ObjectId })._id : null;
    if (communityId && companyId) {
      const deleteFilter: Record<string, unknown> = {
        'community._id': communityId,
        'company._id': companyId,
      };
      // When syncing a specific segment, only remove plans in that segment; otherwise remove all plans for this company+community
      if (segmentRef) {
        deleteFilter['segment._id'] = segmentRef._id;
      }
      const existingPlanIds = await Plan.find(deleteFilter).distinct('_id');
      if (existingPlanIds.length > 0) {
        await PriceHistory.deleteMany({ plan_id: { $in: existingPlanIds } });
        await Plan.deleteMany({ _id: { $in: existingPlanIds } });
      }
    }

    // Get data for both types in parallel (static or AI-powered)
    const [nowResults, planResults] = await Promise.allSettled([
      scrapePlansForType(companyForDb, communityForDb, 'now', openai, segmentRef, communityNameForPrompt),
      scrapePlansForType(companyForDb, communityForDb, 'plan', openai, segmentRef, communityNameForPrompt),
    ]);

    // Combine results
    const allSavedPlans = [];
    const allErrors = [];
    let nowSaved = 0;
    let planSaved = 0;
    let nowErrors = 0;
    let planErrors = 0;

    if (nowResults.status === 'fulfilled') {
      allSavedPlans.push(...nowResults.value.saved);
      allErrors.push(...nowResults.value.errors);
      nowSaved = nowResults.value.saved.length;
      nowErrors = nowResults.value.errors.length;
    } else {
      allErrors.push({
        plan: 'now',
        error: nowResults.reason?.message || 'Failed to scrape quick move-ins',
      });
    }

    if (planResults.status === 'fulfilled') {
      allSavedPlans.push(...planResults.value.saved);
      allErrors.push(...planResults.value.errors);
      planSaved = planResults.value.saved.length;
      planErrors = planResults.value.errors.length;
    } else {
      allErrors.push({
        plan: 'plan',
        error: planResults.reason?.message || 'Failed to scrape home plans',
      });
    }

    const totalSaved = allSavedPlans.length;
    const totalErrors = allErrors.length;

    return NextResponse.json({
      success: true,
      message: `Processed ${totalSaved} plans (${nowSaved} quick move-ins, ${planSaved} home plans)`,
      saved: totalSaved,
      errors: totalErrors,
      errorDetails: totalErrors > 0 ? allErrors : undefined,
      breakdown: {
        now: { saved: nowSaved, errors: nowErrors },
        plan: { saved: planSaved, errors: planErrors },
      },
      plans: allSavedPlans.map((p) => ({
        id: p._id,
        plan_name: p.plan_name,
        price: p.price,
        company: typeof p.company === 'object' ? p.company.name : p.company,
        community: typeof p.community === 'object' ? p.community.name : p.community,
        type: p.type,
      })),
    });
  } catch (error) {
    // Handle OpenAI API errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response?: { data?: { error?: { message?: string } } } };
      return NextResponse.json(
        {
          error: 'OpenAI API error',
          message: apiError.response?.data?.error?.message || errorMessage,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve plans', message: errorMessage },
      { status: 500 }
    );
  }
}
````

## app/api/user/permission-request-status/route.ts

Path: `app/api/user/permission-request-status/route.ts`

````ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import PermissionRequest from '@/app/models/PermissionRequest';
import { getCurrentUserFromRequest } from '@/app/lib/auth';
import { RequestStatus } from '@/app/models/PermissionRequest';

export async function GET(request: NextRequest) {
  try {
    const tokenPayload = getCurrentUserFromRequest(request);
    
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Find pending request for this user
    const pendingRequest = await PermissionRequest.findOne({
      userId: tokenPayload.userId,
      status: RequestStatus.PENDING,
    }).sort({ requestedAt: -1 });

    if (!pendingRequest) {
      return NextResponse.json({
        hasPendingRequest: false,
        request: null,
      });
    }

    return NextResponse.json({
      hasPendingRequest: true,
      request: {
        id: pendingRequest._id.toString(),
        currentPermission: pendingRequest.currentPermission,
        requestedPermission: pendingRequest.requestedPermission,
        status: pendingRequest.status,
        requestedAt: pendingRequest.requestedAt,
      },
    });
  } catch (error: any) {
    console.error('Get permission request status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request status', message: error.message },
      { status: 500 }
    );
  }
}
````

## app/lib/auth.ts

Path: `app/lib/auth.ts`

````ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current user from the request
 */
export function getCurrentUserFromRequest(request: NextRequest): TokenPayload | null {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return verifyToken(token);
    }

    // Try to get token from cookies
    const cookieToken = request.cookies.get('auth-token')?.value;
    if (cookieToken) {
      return verifyToken(cookieToken);
    }

    return null;
  } catch (error) {
    return null;
  }
}
````

## app/lib/mongodb.ts

Path: `app/lib/mongodb.ts`

````ts
import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured. Please check your environment variables.');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,  
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully');
      return mongoose;
    }).catch((error) => {
      console.error('MongoDB connection error:', {
        message: error.message,
        name: error.name,
        readyState: mongoose.connection.readyState,
      });
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
````

## scripts/run-migrations.ts

Path: `scripts/run-migrations.ts`

````ts
/**
 * Run pending migrations from scripts/migrations/.
 * Usage: npx tsx scripts/run-migrations.ts
 * Requires: MONGODB_URI in .env (or environment)
 */

import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseEnvContent(env: string) {
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function loadEnv() {
  const root = process.cwd();
  const rootAlt = join(__dirname, '..');
  // Load all that exist; later files override (so .env.local wins)
  const names = ['.env', '.env.local', '.env.development', '.env.development.local'];
  for (const name of names) {
    for (const base of [root, rootAlt]) {
      const envPath = join(base, name);
      if (existsSync(envPath)) {
        const env = await readFile(envPath, 'utf-8');
        parseEnvContent(env);
      }
    }
  }
}

const MIGRATIONS_COLLECTION = 'migrations';

async function getDb() {
  const mongoose = await import('mongoose');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const tried = [join(process.cwd(), '.env'), join(__dirname, '..', '.env')];
    throw new Error(
      'MONGODB_URI is not set. Add MONGODB_URI=... to .env in the project root (e.g. ' +
        process.cwd() +
        ') or set the environment variable. Looked for .env at: ' +
        tried.join(', ')
    );
  }
  const mongooseInstance = mongoose.default;
  if (mongooseInstance.connection.readyState !== 1) {
    await mongooseInstance.connect(uri);
  }
  return mongooseInstance.connection.db!;
}

async function getRunMigrations(db: import('mongodb').Db): Promise<string[]> {
  const col = db.collection(MIGRATIONS_COLLECTION);
  const docs = await col.find({}).project({ id: 1 }).toArray();
  return docs.map((d) => (d as { id: string }).id);
}

async function recordMigration(db: import('mongodb').Db, id: string) {
  await db.collection(MIGRATIONS_COLLECTION).insertOne({
    id,
    runAt: new Date(),
  });
}

async function main() {
  await loadEnv();

  const migrationsDir = join(__dirname, 'migrations');
  const files = await readdir(migrationsDir);
  const migrationFiles = files
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('No migration files found in scripts/migrations/');
    process.exit(0);
    return;
  }

  const db = await getDb();
  const runIds = await getRunMigrations(db);

  for (const file of migrationFiles) {
    const id = file.replace(/\.ts$/, '');
    if (runIds.includes(id)) {
      console.log('Skip (already run):', id);
      continue;
    }
    console.log('Run:', id);
    const path = join(migrationsDir, file);
    const mod = await import(pathToFileURL(path).href);
    const up = mod.up || mod.default;
    if (typeof up !== 'function') {
      console.error('Migration', id, 'must export up() or default function');
      process.exit(1);
    }
    await up();
    await recordMigration(db, id);
    console.log('Done:', id);
  }

  console.log('Migrations finished.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
````

## app/contexts/ScrapingProgressContext.tsx

Path: `app/contexts/ScrapingProgressContext.tsx`

````tsx
"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import API_URL from "../config";

export type ScrapingStatus = "idle" | "loading" | "success" | "error";

export interface ScrapingJob {
  companyName: string;
  communityName: string;
  subcommunities?: string[];
  status: ScrapingStatus;
  error?: string | null;
  onComplete?: () => void;
}

interface ScrapingProgressContextValue {
  job: ScrapingJob | null;
  startBackgroundScraping: (params: {
    companyName: string;
    communityName: string;
    subcommunities?: string[];
    onComplete?: () => void;
    onError?: (err: Error) => void;
    /** Run before starting the scrape (e.g. add company to community). Bar shows immediately; this runs after. */
    beforeScrape?: () => Promise<void>;
  }) => void;
}

const ScrapingProgressContext = createContext<ScrapingProgressContextValue | null>(null);

/** Throw from beforeScrape to hide the bar and skip the scrape (e.g. company already in community). */
export class SkipScrapeError extends Error {
  constructor(message = "Skip scrape") {
    super(message);
    this.name = "SkipScrapeError";
  }
}

async function runScrape(params: {
  companyName: string;
  communityName: string;
  subcommunities?: string[];
}): Promise<void> {
  const { companyName, communityName, subcommunities } = params;

  if (subcommunities && subcommunities.length > 0) {
    for (const subcommunity of subcommunities) {
      const res = await fetch(API_URL + "/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companyName, community: subcommunity }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Failed to scrape plans");
      }
    }
  } else {
    const res = await fetch(API_URL + "/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: companyName, community: communityName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to scrape plans");
    }
  }
}

export function ScrapingProgressProvider({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<ScrapingJob | null>(null);

  const startBackgroundScraping = useCallback(
    (params: {
      companyName: string;
      communityName: string;
      subcommunities?: string[];
      onComplete?: () => void;
      onError?: (err: Error) => void;
      beforeScrape?: () => Promise<void>;
    }) => {
      // Show "Scraping plans..." immediately so there's no delay after button press
      setJob({
        companyName: params.companyName,
        communityName: params.communityName,
        subcommunities: params.subcommunities,
        status: "loading",
        onComplete: params.onComplete,
      });

      const run = async () => {
        try {
          await params.beforeScrape?.();
          await runScrape({
            companyName: params.companyName,
            communityName: params.communityName,
            subcommunities: params.subcommunities,
          });
          setJob((prev) =>
            prev ? { ...prev, status: "success", error: null } : null
          );
          setTimeout(() => {
            setJob((prev) => {
              const onComplete = prev?.onComplete;
              if (onComplete) setTimeout(onComplete, 0);
              return null;
            });
          }, 2000);
        } catch (err) {
          if (err instanceof SkipScrapeError) {
            setJob(null);
            return;
          }
          const error = err instanceof Error ? err : new Error(String(err));
          setJob((prev) =>
            prev
              ? { ...prev, status: "error", error: error.message || "Scraping failed" }
              : null
          );
          params.onError?.(error);
          setTimeout(() => {
            setJob((prev) => {
              const onComplete = prev?.onComplete;
              if (onComplete) setTimeout(onComplete, 0);
              return null;
            });
          }, 5000);
        }
      };
      run();
    },
    []
  );

  return (
    <ScrapingProgressContext.Provider value={{ job, startBackgroundScraping }}>
      {children}
      <ScrapingProgressBar />
    </ScrapingProgressContext.Provider>
  );
}

function ScrapingProgressBar() {
  const ctx = useContext(ScrapingProgressContext);
  const job = ctx?.job ?? null;

  if (!job) return null;

  const label =
    job.subcommunities && job.subcommunities.length > 0
      ? `${job.companyName} – ${job.communityName} (${job.subcommunities.length} subcommunities)`
      : `${job.companyName} – ${job.communityName}`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-center gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {job.status === "loading" && (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          )}
          {job.status === "success" && (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          )}
          {job.status === "error" && (
            <XCircle className="h-5 w-5 shrink-0 text-destructive" />
          )}
          <span className="truncate text-sm font-medium">
            {job.status === "loading" && "Scraping plans..."}
            {job.status === "success" && "Scraping completed"}
            {job.status === "error" && "Scraping failed"}
          </span>
          <span className="truncate text-sm text-muted-foreground">{label}</span>
          {job.status === "error" && job.error && (
            <span className="truncate text-xs text-destructive">{job.error}</span>
          )}
        </div>
      </div>
      {/* Indeterminate progress bar when loading */}
      {job.status === "loading" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden bg-muted">
          <div className="h-full w-1/3 animate-shimmer rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
}

export function useScrapingProgress(): ScrapingProgressContextValue {
  const ctx = useContext(ScrapingProgressContext);
  return ctx ?? { job: null, startBackgroundScraping: () => {} };
}
````

## app/components/ui/toaster.tsx

Path: `app/components/ui/toaster.tsx`

````tsx
"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast"
import { useToast } from "./use-toast"
import { CheckCircle2, XCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const getIcon = () => {
          if (variant === "success") {
            return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          }
          if (variant === "destructive") {
            return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          }
          return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        }

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 flex-1">
              {getIcon()}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
````

## app/models/User.ts

Path: `app/models/User.ts`

````ts
import mongoose, { Schema, Document } from 'mongoose';

// User roles - extensible for future roles
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// User permissions for access control
export enum UserPermission {
  VIEWER = 'viewer',
  EDITOR = 'editor',
}

// User status for approval workflow
export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface IUser extends Document {
  email: string;
  password: string; // Hashed password
  name?: string;
  role: UserRole;
  permission: UserPermission;
  status: UserStatus;
  emailVerified: boolean; // Email verification status
  emailVerificationToken?: string; // Token for email verification
  emailVerificationExpires?: Date; // Expiration for verification token
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  resetPasswordCode?: string;
  resetPasswordCodeExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      index: true,
    },
    permission: {
      type: String,
      enum: Object.values(UserPermission),
      default: UserPermission.VIEWER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerificationToken: {
      type: String,
      index: true,
    },
    emailVerificationExpires: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      index: true,
    },
    resetPasswordExpires: {
      type: Date,
    },
    resetPasswordCode: {
      type: String,
      index: true,
    },
    resetPasswordCodeExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups (email already has unique index)

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
````

## app/models/Company.ts

Path: `app/models/Company.ts`

````ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  slug?: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  /** Hex color for charts/legends (e.g. #2563eb). Ensures distinct builder colors on graphs. */
  color?: string;
  totalCommunities?: number; // Aggregated stats (denormalized)
  totalPlans?: number; // Aggregated stats (denormalized)
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
    },
    website: {
      type: String,
    },
    headquarters: {
      type: String,
    },
    founded: {
      type: String,
    },
    color: {
      type: String,
      trim: true,
    },
    totalCommunities: {
      type: Number,
      default: 0,
    },
    totalPlans: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
````

## app/models/Community.ts

Path: `app/models/Community.ts`

````ts
import mongoose, { Schema, Document, Types } from 'mongoose';

/** 'standard' = UnionMain builds here; 'competitor' = competitor/side community */
export type CommunityType = 'standard' | 'competitor';

/** 'scraped' = homes/plans from scraper; 'manual' = homes added manually */
export type HomesSource = 'scraped' | 'manual';

export interface ICommunity extends Document {
  name: string;
  slug?: string;
  /** standard = UnionMain Homes builds here; competitor = competitor/side community */
  communityType?: CommunityType;
  /** Whether homes/plans for this community are added by scraping or manually */
  homesSource?: HomesSource;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  /** Data URL (base64) for custom community image (legacy) */
  imageData?: string;
  /** Path to uploaded image file; used for card and for header/banner on community page. */
  imagePath?: string;
  companies: Types.ObjectId[]; // Array of company ObjectIds (references)
  parentCommunityId?: Types.ObjectId; // Reference to parent UnionMain community
  totalPlans?: number; // Aggregated stats (denormalized)
  totalQuickMoveIns?: number; // Aggregated stats (denormalized)
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommunitySchema = new Schema<ICommunity>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    communityType: {
      type: String,
      enum: ['standard', 'competitor'],
      default: 'standard',
      index: true,
    },
    homesSource: {
      type: String,
      enum: ['scraped', 'manual'],
      default: 'scraped',
      index: true,
    },
    description: {
      type: String,
    },
    location: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    imageData: {
      type: String,
    },
    imagePath: {
      type: String,
    },
    companies: [{
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    }],
    parentCommunityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      index: true,
      default: null,
    },
    totalPlans: {
      type: Number,
      default: 0,
    },
    totalQuickMoveIns: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Community || mongoose.model<ICommunity>('Community', CommunitySchema);
````

## app/models/Plan.ts

Path: `app/models/Plan.ts`

````ts
import mongoose, { Schema, Document, Types } from 'mongoose';

// Embedded company reference
interface ICompanyReference {
  _id: Types.ObjectId;
  name: string;
}

// Embedded community reference
interface ICommunityReference {
  _id: Types.ObjectId;
  name: string;
  location?: string;
}

// Embedded product segment reference (lot-size / line inside a community)
interface IProductSegmentReference {
  _id: Types.ObjectId;
  name: string;   // internal segment name, e.g. "elevon_40s"
  label: string;  // display label, e.g. "40' Lots"
}

export interface IPlan extends Document {
  plan_name: string;
  price: number;
  sqft?: number;
  stories?: string;
  price_per_sqft?: number;
  last_updated: Date;
  company: ICompanyReference;
  community: ICommunityReference;
  segment?: IProductSegmentReference;  // Optional: product line / lot-size segment
  type: 'plan' | 'now';
  beds?: string;
  baths?: string;
  address?: string;
  design_number?: string;
  price_changed_recently?: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyReferenceSchema = new Schema<ICompanyReference>({
  _id: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
}, { _id: false });

const CommunityReferenceSchema = new Schema<ICommunityReference>({
  _id: {
    type: Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
  },
}, { _id: false });

const ProductSegmentReferenceSchema = new Schema<IProductSegmentReference>({
  _id: {
    type: Schema.Types.ObjectId,
    ref: 'ProductSegment',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const PlanSchema = new Schema<IPlan>(
  {
    plan_name: {
      type: String,
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    sqft: {
      type: Number,
    },
    stories: {
      type: String,
    },
    price_per_sqft: {
      type: Number,
    },
    last_updated: {
      type: Date,
      default: Date.now,
    },
    company: {
      type: CompanyReferenceSchema,
      required: true,
    },
    community: {
      type: CommunityReferenceSchema,
      required: true,
    },
    segment: {
      type: ProductSegmentReferenceSchema,
      required: false,
    },
    type: {
      type: String,
      enum: ['plan', 'now'],
      required: true,
      default: 'plan',
      index: true,
    },
    beds: {
      type: String,
    },
    baths: {
      type: String,
    },
    address: {
      type: String,
    },
    design_number: {
      type: String,
    },
    price_changed_recently: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
PlanSchema.index({ 'company._id': 1, 'community._id': 1, type: 1 });
PlanSchema.index({ 'segment._id': 1, type: 1 });
PlanSchema.index({ 'community._id': 1, 'segment._id': 1, type: 1 });
PlanSchema.index({ 'company.name': 1, type: 1 });
PlanSchema.index({ 'community.name': 1, type: 1 });
PlanSchema.index({ 'community._id': 1, type: 1 });
PlanSchema.index({ price: 1 });
PlanSchema.index({ last_updated: -1 });

// Compound index for uniqueness (using embedded names + segment where present)
PlanSchema.index(
  { plan_name: 1, 'company.name': 1, 'community.name': 1, 'segment.name': 1, type: 1 },
  { unique: true }
);

export default mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);
````

## app/models/PriceHistory.ts

Path: `app/models/PriceHistory.ts`

````ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPriceHistory extends Document {
  plan_id: Types.ObjectId;
  old_price: number;
  new_price: number;
  changed_at: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PriceHistorySchema = new Schema<IPriceHistory>(
  {
    plan_id: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    old_price: {
      type: Number,
      required: true,
    },
    new_price: {
      type: Number,
      required: true,
    },
    changed_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PriceHistory || mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
````

## app/models/ProductSegment.ts

Path: `app/models/ProductSegment.ts`

````ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export type SegmentRole = 'primary' | 'competitor' | 'cross_community_comp';

export interface IProductSegment extends Document {
  communityId: Types.ObjectId;        // Parent community
  companyId?: Types.ObjectId | null;  // Builder (company) this product line belongs to; null = legacy community-wide
  name: string;                       // Internal name, e.g. "elevon_40s"
  label: string;                      // Display label, e.g. "40' Lots"
  description?: string;               // Optional notes (e.g. "UM selling 30' product on 40' lots")
  isActive: boolean;
  displayOrder?: number;              // For ordering segments within a community
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSegmentSchema = new Schema<IProductSegment>(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Uniqueness: segment name per (community, builder). Sparse so multiple null companyId allowed per community.
ProductSegmentSchema.index(
  { communityId: 1, companyId: 1, name: 1 },
  { unique: true }
);

export default mongoose.models.ProductSegment || mongoose.model<IProductSegment>('ProductSegment', ProductSegmentSchema);
````

## app/models/CommunityCompany.ts

Path: `app/models/CommunityCompany.ts`

````ts
import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Links a company to a community and stores the optional "name this company uses"
 * for this community (e.g. "Elevon at Lavon" vs canonical "Elevon").
 * Used by scrape/identify to pass the right name to AI.
 */
export interface ICommunityCompany extends Document {
  communityId: Types.ObjectId;
  companyId: Types.ObjectId;
  /** Name this company uses when referring to this community (for scrape/AI prompts). */
  nameUsedByCompany?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommunityCompanySchema = new Schema<ICommunityCompany>(
  {
    communityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    nameUsedByCompany: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

CommunityCompanySchema.index({ communityId: 1, companyId: 1 }, { unique: true });

export default mongoose.models.CommunityCompany ||
  mongoose.model<ICommunityCompany>('CommunityCompany', CommunityCompanySchema);
````

## app/models/SegmentCompany.ts

Path: `app/models/SegmentCompany.ts`

````ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import { SegmentRole } from './ProductSegment';

export type KeyType = 'Plan_Names' | 'Series_Name';

export interface ISegmentCompany extends Document {
  segmentId: Types.ObjectId;          // ProductSegment
  companyId: Types.ObjectId;          // Company
  role: SegmentRole;                  // primary | competitor | cross_community_comp
  sourceCommunityId?: Types.ObjectId;  // For cross-community comps (e.g. Perry @ Avondale)
  notes?: string;
  /** How to match plans: by plan names list or by series name(s) */
  keyType: KeyType;                    // Plan_Names | Series_Name
  /** Plan names (when keyType=Plan_Names) or series name(s) (when keyType=Series_Name) */
  values: string[];
  /** When keyType=Series_Name, optional explicit plan names in that series */
  planNames?: string[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SegmentCompanySchema = new Schema<ISegmentCompany>(
  {
    segmentId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductSegment',
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['primary', 'competitor', 'cross_community_comp'],
      required: true,
      default: 'competitor',
      index: true,
    },
    sourceCommunityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
    },
    notes: {
      type: String,
    },
    keyType: {
      type: String,
      enum: ['Plan_Names', 'Series_Name'],
      default: 'Plan_Names',
    },
    values: {
      type: [String],
      default: [],
    },
    planNames: {
      type: [String],
      default: undefined,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// One config per company per segment
SegmentCompanySchema.index(
  { segmentId: 1, companyId: 1 },
  { unique: true }
);

export default mongoose.models.SegmentCompany || mongoose.model<ISegmentCompany>('SegmentCompany', SegmentCompanySchema);
````

## app/models/PermissionRequest.ts

Path: `app/models/PermissionRequest.ts`

````ts
import mongoose, { Schema, Document } from 'mongoose';

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface IPermissionRequest extends Document {
  userId: mongoose.Types.ObjectId;
  currentPermission: string;
  requestedPermission: string;
  status: RequestStatus;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionRequestSchema = new Schema<IPermissionRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    currentPermission: {
      type: String,
      required: true,
    },
    requestedPermission: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
PermissionRequestSchema.index({ userId: 1, status: 1 });

export default mongoose.models.PermissionRequest || 
  mongoose.model<IPermissionRequest>('PermissionRequest', PermissionRequestSchema);
````

## README.md

Path: `README.md`

````md
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
````

## ADMIN_SYSTEM_DOCUMENTATION.md

Path: `ADMIN_SYSTEM_DOCUMENTATION.md`

````md
# Admin & Authentication System Documentation

## ✅ Implementation Complete

A comprehensive authentication and admin system has been implemented with the following features:

## 📋 Features Implemented

### 1. User Registration & Email Verification ✅
- Users sign up with email/password
- Email verification token is generated and sent (logged to console in dev)
- After signup, users cannot fully access the application
- After email verification, user status is set to "pending"
- Pending users cannot fully access until approved by admin

### 2. Extended User Model ✅
The User model now includes:
- **role**: `"admin"` | `"user"` (extensible enum)
- **permission**: `"viewer"` | `"editor"` (controls home page access)
- **status**: `"pending"` | `"approved"` | `"rejected"` (approval workflow)
- **emailVerified**: boolean (email verification status)
- **emailVerificationToken**: string (for email verification)
- **emailVerificationExpires**: Date (token expiration)

### 3. Admin Assignment ✅
- **First registered user** automatically becomes:
  - `role = "admin"`
  - `status = "approved"`
- **All subsequent users** default to:
  - `role = "user"`
  - `status = "pending"`

### 4. Admin Navigation ✅
- Admin pages available at `/admin/*`
- **Admin button** appears in Navbar (top-right) **only for admin users**
- Non-admin users cannot see the admin button
- Backend strictly enforces role-based access

### 5. Admin Pages ✅
- **`/admin/dashboard`**: Overview with user statistics
- **`/admin/users`**: User management page
  - Lists all users with email, role, permission, status
  - Admin can approve/reject pending users
  - Admin can assign permissions (viewer/editor)

### 6. Permission-Based Access Control ✅
- **Home page** supports two permission modes:
  - **Viewer**: Read-only access (cannot add/edit communities)
  - **Editor**: Full edit access (can add/edit communities)
- Permission logic enforced **server-side** in API routes

### 7. Scalable Architecture ✅
- Role system uses enums (easy to extend)
- Permission system uses enums (easy to extend
- Admin utilities in `app/lib/admin.ts` (reusable)
- Modular API routes
- Easy to add new admin pages

### 8. Security ✅
- **Never trusts frontend** - all checks are server-side
- All admin APIs validate `role === "admin"` from database
- All protected APIs validate `status === "approved"` from database
- Permission checks query database for current user state
- No hardcoded admin emails or IDs

## 📁 File Structure

```
app/
├── models/
│   └── User.ts                    # Extended with role, permission, status
├── lib/
│   ├── auth.ts                    # Authentication utilities
│   └── admin.ts                   # Admin & permission utilities
├── api/
│   ├── auth/
│   │   ├── signup/route.ts        # Auto-assigns first user as admin
│   │   ├── signin/route.ts        # Checks email verification
│   │   ├── verify-email/route.ts  # Email verification endpoint
│   │   └── resend-verification/route.ts
│   └── admin/
│       └── users/
│           ├── route.ts           # List all users
│           ├── approve/route.ts   # Approve/reject users
│           └── update-permission/route.ts
├── admin/
│   ├── layout.tsx                 # Admin layout with navigation
│   ├── dashboard/page.tsx         # Admin dashboard
│   └── users/page.tsx             # User management
├── verify-email/
│   └── page.tsx                   # Email verification page
└── components/
    ├── AuthGuard.tsx              # Updated to check status
    ├── Navbar.tsx                 # Shows Admin button for admins
    └── PendingApprovalBanner.tsx  # Shows pending status
```

## 🔐 Security Implementation

### Server-Side Validation
All security checks query the database to ensure current user state:

```typescript
// app/lib/admin.ts
export async function requireAdmin(request: NextRequest) {
  // Always queries database - never trusts token alone
  const user = await User.findById(tokenPayload.userId);
  if (user.role !== UserRole.ADMIN) {
    return error response;
  }
}
```

### Protected API Routes
- **POST /api/communities** - Requires editor permission
- **DELETE /api/communities** - Requires editor permission
- **POST /api/companies** - Requires editor permission
- **DELETE /api/companies** - Requires editor permission
- **POST /api/plans** - Requires editor permission
- **GET /api/admin/users** - Requires admin role
- **POST /api/admin/users/approve** - Requires admin role
- **POST /api/admin/users/update-permission** - Requires admin role

## 🔄 User Flow

### New User Registration
1. User signs up → Account created with `status: "pending"`, `emailVerified: false`
2. Email verification link sent (logged to console in dev)
3. User clicks link → `emailVerified: true`, `status: "pending"`
4. User can sign in but sees "Pending Approval" banner
5. Admin approves user → `status: "approved"`
6. User gets full access based on permission

### First User (Admin)
1. First user signs up → Automatically `role: "admin"`, `status: "approved"`
2. Still needs email verification
3. After verification, has full admin access

## 🎯 Permission System

### Viewer Permission
- Can view all data
- Cannot create/edit/delete communities, companies, or plans
- "Add Community" button hidden

### Editor Permission
- Can view all data
- Can create/edit/delete communities, companies, and plans
- "Add Community" button visible

### Admin Role
- Has all editor permissions
- Can access admin pages
- Can approve/reject users
- Can assign permissions

## 📧 Email Verification

Currently, verification links are logged to console. For production:

1. Install email service (Resend, SendGrid, etc.)
2. Update `app/api/auth/signup/route.ts` to send email
3. Update `app/api/auth/forgot-password/route.ts` to send email

Example integration:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: user.email,
  subject: 'Verify your email',
  html: `<a href="${verificationUrl}">Verify Email</a>`
});
```

## 🚀 Testing the System

1. **Create First User (Admin)**:
   - Sign up → Check console for verification link
   - Verify email → Status becomes "pending" (but admin is auto-approved)
   - Sign in → Should see Admin button

2. **Create Second User**:
   - Sign up → Check console for verification link
   - Verify email → Status becomes "pending"
   - Sign in → Should see "Pending Approval" banner
   - Cannot add/edit communities (viewer permission)

3. **Admin Approves User**:
   - Admin logs in → Clicks "Admin" button
   - Goes to `/admin/users`
   - Approves pending user
   - Assigns "editor" permission

4. **User Gets Editor Access**:
   - User signs in → No longer sees pending banner
   - Can now add/edit communities

## 🔧 Configuration

### Environment Variables
```env
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Extending Roles
To add new roles, update `app/models/User.ts`:
```typescript
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator', // New role
}
```

### Extending Permissions
To add new permissions, update `app/models/User.ts`:
```typescript
export enum UserPermission {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  MANAGER = 'manager', // New permission
}
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in (checks email verification)
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user
- `GET /api/auth/verify-email?token=...` - Verify email
- `POST /api/auth/resend-verification` - Resend verification email

### Admin (Requires Admin Role)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/approve` - Approve/reject user
- `POST /api/admin/users/update-permission` - Update user permission

## ✅ Security Checklist

- [x] Server-side role validation (queries database)
- [x] Server-side permission validation (queries database)
- [x] Server-side status validation (queries database)
- [x] Admin routes protected
- [x] Editor routes protected
- [x] No hardcoded admin emails/IDs
- [x] Email verification required
- [x] Admin approval required
- [x] First user auto-assigned as admin

## 🎉 System Ready

The authentication and admin system is fully implemented and ready for use!
````

## TROUBLESHOOTING.md

Path: `TROUBLESHOOTING.md`

````md
# Troubleshooting Guide

## Signup Page Hangs / Stops After "Creating account..."

### Problem
When clicking "Sign Up", the button changes to "Creating account..." but the page hangs/stops.

### Most Common Causes

#### 1. MongoDB Not Running (Most Likely)
**Symptom**: Page hangs, no error message appears

**Solution**:
- **Windows**: Check if MongoDB is running
  ```powershell
  # Check MongoDB service
  Get-Service MongoDB
  
  # Start MongoDB if stopped
  Start-Service MongoDB
  ```
  
- **Or install/start MongoDB**:
  - Download from: https://www.mongodb.com/try/download/community
  - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

- **Update `.env.local`** with your MongoDB connection string:
  ```env
  MONGODB_URI=mongodb://localhost:27017/marketmap-homes
  # OR for MongoDB Atlas:
  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
  ```

#### 2. Database Connection Timeout
**Symptom**: Request times out after 30 seconds

**Solution**:
- Check your MongoDB connection string in `.env.local`
- Verify MongoDB is accessible
- For MongoDB Atlas, check network access settings

#### 3. Environment Variables Not Loaded
**Symptom**: Error about MONGODB_URI not configured

**Solution**:
- Ensure `.env.local` exists in project root
- Restart development server after creating/updating `.env.local`
- Check that `MONGODB_URI` is set correctly

### Quick Fix Steps

1. **Check MongoDB Status**:
   ```bash
   # Try to connect to MongoDB
   mongosh mongodb://localhost:27017
   ```

2. **Check Server Console**:
   - Look for error messages in the terminal where `npm run dev` is running
   - Check for "MongoDB connection error" messages

3. **Verify Environment Variables**:
   ```bash
   # Check .env.local exists and has MONGODB_URI
   cat .env.local
   ```

4. **Test Database Connection**:
   - Try accessing MongoDB directly
   - Or use MongoDB Compass to verify connection

### Error Messages to Look For

- **"Database connection failed"**: MongoDB not running or wrong connection string
- **"Request timed out"**: MongoDB connection timeout (check network/firewall)
- **"MONGODB_URI is not configured"**: `.env.local` missing or incorrect

### Alternative: Use MongoDB Atlas (Cloud)

If local MongoDB is problematic, use MongoDB Atlas:

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `.env.local`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   ```

### Still Having Issues?

1. Check browser console (F12) for client-side errors
2. Check server terminal for backend errors
3. Verify MongoDB is running and accessible
4. Ensure `.env.local` is in the project root (same level as `package.json`)
````

