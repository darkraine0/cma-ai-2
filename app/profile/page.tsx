"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { PasswordInput } from "../components/ui/password-input";
import { useToast } from "../components/ui/use-toast";
import Loader from "../components/Loader";
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Profile form state
  const [name, setName] = useState("");
  
  // Password form state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Permission request state
  const [pendingRequest, setPendingRequest] = useState<PermissionRequest | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user?.id) {
      checkPendingRequest();
    }
  }, [user?.id]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("Failed to fetch user");
      
      const data = await response.json();
      setUser(data.user);
      setName(data.user.name || "");
    } catch (error) {
      console.error("Error fetching user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

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
      await fetchUser();
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
