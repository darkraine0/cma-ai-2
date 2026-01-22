"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import Loader from "@/app/components/Loader"
import { CheckCircle2, XCircle, Eye, Edit, RefreshCw } from "lucide-react"

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
        return <Badge className="bg-green-500">Approved</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge variant="destructive">Admin</Badge>
    ) : (
      <Badge variant="secondary">User</Badge>
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
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Role</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Permission</th>
                    <th className="text-left p-4">Email Verified</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">{user.name || "-"}</td>
                      <td className="p-4">{getRoleBadge(user.role)}</td>
                      <td className="p-4">{getStatusBadge(user.status)}</td>
                      <td className="p-4">
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
                      </td>
                      <td className="p-4">
                        {user.emailVerified ? (
                          <Badge className="bg-green-500">Verified</Badge>
                        ) : (
                          <Badge variant="outline">Not Verified</Badge>
                        )}
                      </td>
                      <td className="p-4">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
