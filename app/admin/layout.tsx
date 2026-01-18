"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import Loader from "@/app/components/Loader"
import { Shield, LayoutDashboard, Users } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        if (data.user?.role === "admin") {
          setUser(data.user)
        } else {
          // Not admin, redirect
          router.replace("/")
          return
        }
      } else {
        // Not authenticated
        router.replace("/signin")
        return
      }
    } catch (error) {
      router.replace("/signin")
      return
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loader />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="flex gap-4 mb-6">
          <Link href="/admin/dashboard">
            <Button
              variant={pathname === "/admin/dashboard" ? "default" : "outline"}
              size="sm"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button
              variant={pathname === "/admin/users" ? "default" : "outline"}
              size="sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Users
            </Button>
          </Link>
        </div>

        {children}
      </div>
    </div>
  )
}
