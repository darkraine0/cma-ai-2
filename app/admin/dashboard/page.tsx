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
