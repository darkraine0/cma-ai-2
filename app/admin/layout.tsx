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
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <h2 className="text-xl font-bold text-foreground">Admin Panel</h2>
          </div>
          
          <nav className="space-y-2">
            <Link href="/admin/dashboard">
              <Button
                variant={pathname === "/admin/dashboard" ? "default" : "ghost"}
                className={`w-full justify-start ${pathname === "/admin/dashboard" ? "" : "hover:bg-muted"}`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button
                variant={pathname === "/admin/users" ? "default" : "ghost"}
                className={`w-full justify-start ${pathname === "/admin/users" ? "" : "hover:bg-muted"}`}
              >
                <Users className="w-4 h-4 mr-2" />
                Users
              </Button>
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
