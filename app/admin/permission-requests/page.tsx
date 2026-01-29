"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import Loader from "@/app/components/Loader";
import { CheckCircle2, XCircle, Eye, Edit, RefreshCw, Clock, Shield } from "lucide-react";

interface PermissionRequest {
  id: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
  currentPermission: string;
  requestedPermission: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  processedAt?: string;
}

export default function PermissionRequestsPage() {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/admin/permission-requests");
      if (!response.ok) {
        if (response.status === 403) {
          alert("Access denied. Admin role required.");
          return;
        }
        throw new Error("Failed to fetch requests");
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      alert("Failed to load permission requests");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (requestId: string, status: "approved" | "rejected") => {
    setProcessing(requestId);
    try {
      const response = await fetch("/api/admin/permission-requests/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process request");
      }

      alert(`Permission request ${status} successfully`);
      await fetchRequests();
    } catch (error: any) {
      console.error("Error processing request:", error);
      alert(error.message || "Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 hover:border-slate-200 hover:text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-900/30 dark:hover:border-slate-700 dark:hover:text-slate-400 dark:hover:bg-slate-900/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30 dark:hover:border-amber-800 dark:hover:text-amber-300 dark:hover:bg-amber-950/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 hover:border-rose-200 hover:text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:bg-rose-950/30 dark:hover:border-rose-800 dark:hover:text-rose-300 dark:hover:bg-rose-950/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPermissionBadge = (permission: string) => {
    return permission === "viewer" ? (
      <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50">
        <Eye className="w-3 h-3 mr-1" />
        Viewer
      </Badge>
    ) : (
      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
        <Edit className="w-3 h-3 mr-1" />
        Editor
      </Badge>
    );
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Permission Requests</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
              Manage user permission upgrade requests
            </p>
          </div>
          <Button onClick={fetchRequests} variant="outline" size="sm" className="self-start sm:self-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="mb-4 md:mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base md:text-lg font-semibold">Pending Requests</h3>
                  <CardDescription className="text-xs md:text-sm">Requests awaiting approval</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[800px]">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.user?.name || "-"}
                        </TableCell>
                        <TableCell>{req.user?.email}</TableCell>
                        <TableCell>{getPermissionBadge(req.currentPermission)}</TableCell>
                        <TableCell>{getPermissionBadge(req.requestedPermission)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleProcess(req.id, "approved")}
                              disabled={processing === req.id}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleProcess(req.id, "rejected")}
                              disabled={processing === req.id}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processed Requests */}
        {processedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <div>
                <h3 className="text-base md:text-lg font-semibold">Request History</h3>
                <CardDescription className="text-xs md:text-sm">Previously processed requests</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[800px]">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Processed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.user?.name || "-"}
                        </TableCell>
                        <TableCell>{req.user?.email}</TableCell>
                        <TableCell>{getPermissionBadge(req.currentPermission)}</TableCell>
                        <TableCell>{getPermissionBadge(req.requestedPermission)}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {req.processedAt ? new Date(req.processedAt).toLocaleDateString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {requests.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No permission requests yet</p>
                <p className="text-sm mt-2">
                  Permission requests from users will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
