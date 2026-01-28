"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import Loader from "@/app/components/Loader"
import { CheckCircle2, XCircle, Eye, Edit, RefreshCw, Clock, CheckCheck, ShieldCheck } from "lucide-react"

interface User {
  id: string
  email: string
  name?: string
  role: string
  permission: "viewer" | "editor"
  status: "pending" | "approved" | "rejected"
  emailVerified: boolean
  lastLogin?: string
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (!response.ok) {
        if (response.status === 403) {
          alert("Access denied. Admin role required.")
          return
        }
        throw new Error("Failed to fetch users")
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      alert("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string, status: "approved" | "rejected") => {
    setUpdating(userId)
    try {
      const response = await fetch("/api/admin/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update user")
      }

      // Refresh users list
      await fetchUsers()
    } catch (error: any) {
      console.error("Error updating user:", error)
      alert(error.message || "Failed to update user status")
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdatePermission = async (userId: string, permission: "viewer" | "editor") => {
    setUpdating(userId)
    try {
      const response = await fetch("/api/admin/users/update-permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permission }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update permission")
      }

      // Refresh users list
      await fetchUsers()
    } catch (error: any) {
      console.error("Error updating permission:", error)
      alert(error.message || "Failed to update permission")
    } finally {
      setUpdating(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 hover:border-slate-200 hover:text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-900/30 dark:hover:border-slate-700 dark:hover:text-slate-400 dark:hover:bg-slate-900/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30 dark:hover:border-amber-800 dark:hover:text-amber-300 dark:hover:bg-amber-950/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 hover:border-rose-200 hover:text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:bg-rose-950/30 dark:hover:border-rose-800 dark:hover:text-rose-300 dark:hover:bg-rose-950/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 hover:border-purple-200 hover:text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/30 dark:hover:border-purple-800 dark:hover:text-purple-300 dark:hover:bg-purple-950/30">
        <ShieldCheck className="w-3 h-3 mr-1" />
        Admin
      </Badge>
    ) : (
      <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 hover:border-slate-200 hover:text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-900/30 dark:hover:border-slate-700 dark:hover:text-slate-400 dark:hover:bg-slate-900/30">
        User
      </Badge>
    )
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-2">Manage user approvals and permissions</p>
          </div>
          <Button onClick={fetchUsers} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardDescription>Approve users and assign permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead>Email Verified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={user.permission === "viewer" ? "default" : "outline"}
                            onClick={() => handleUpdatePermission(user.id, "viewer")}
                            disabled={updating === user.id || user.role === "admin"}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Viewer
                          </Button>
                          <Button
                            size="sm"
                            variant={user.permission === "editor" ? "default" : "outline"}
                            onClick={() => handleUpdatePermission(user.id, "editor")}
                            disabled={updating === user.id || user.role === "admin"}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editor
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.emailVerified ? (
                          <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 hover:border-blue-200 hover:text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30 dark:hover:border-blue-800 dark:hover:text-blue-300 dark:hover:bg-blue-950/30">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-200 text-gray-600 bg-gray-50 hover:border-gray-200 hover:text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30 dark:hover:border-gray-700 dark:hover:text-gray-400 dark:hover:bg-gray-900/30">
                            Not Verified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(user.id, "approved")}
                                disabled={updating === user.id}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApprove(user.id, "rejected")}
                                disabled={updating === user.id}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {user.status === "approved" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApprove(user.id, "rejected")}
                              disabled={updating === user.id}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          )}
                          {user.status === "rejected" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(user.id, "approved")}
                              disabled={updating === user.id}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
