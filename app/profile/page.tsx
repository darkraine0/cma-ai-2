"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { PasswordInput } from "../components/ui/password-input";
import Loader from "../components/Loader";
import { User, Lock, Shield, Eye, Edit, CheckCircle2, Clock } from "lucide-react";

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
      alert("Failed to load profile");
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

      alert(data.message);
      await fetchUser();
    } catch (error: any) {
      alert(error.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match");
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

      alert(data.message);
      
      // Clear password fields
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      alert(error.message || "Failed to change password");
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

      alert(data.message);
      
      // Refresh to show pending request
      await checkPendingRequest();
    } catch (error: any) {
      alert(error.message || "Failed to submit permission request");
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">User Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your account settings</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
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
                <Lock className="w-5 h-5 text-primary" />
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
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Permission & Access</CardTitle>
              </div>
              <CardDescription>Your current access level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border-2 border-border rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Current Permission</p>
                  <div className="flex items-center gap-2">
                    {user.permission === 'viewer' ? (
                      <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">
                        <Eye className="w-3 h-3 mr-1" />
                        Viewer
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                        <Edit className="w-3 h-3 mr-1" />
                        Editor
                      </Badge>
                    )}
                  </div>
                </div>
                
                {user.permission === 'viewer' && user.role !== 'admin' && (
                  <div>
                    {pendingRequest ? (
                      <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                        <Clock className="w-3 h-3 mr-1" />
                        Request Pending
                      </Badge>
                    ) : (
                      <Button
                        onClick={handleRequestPermission}
                        disabled={requestLoading}
                        size="sm"
                      >
                        {requestLoading ? "Submitting..." : "Request Editor Access"}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {user.permission === 'viewer' && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Permission Levels:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Viewer: Can view data and export reports</li>
                    <li>• Editor: Can add, edit, and delete data</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
