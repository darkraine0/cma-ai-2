"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/app/components/ui/sheet"
import Loader from "@/app/components/Loader"
import { useAuth } from "@/app/contexts/AuthContext"
import { Shield, LayoutDashboard, Users, Menu } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role !== "admin") router.replace("/")
  }, [user, router])

  if (!user || user.role !== "admin") {
    return <Loader />
  }

  const SidebarContent = () => (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-8">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Admin Panel</h2>
      </div>
      
      <nav className="space-y-2">
        <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)}>
          <Button
            variant={pathname === "/admin/dashboard" ? "default" : "ghost"}
            className={`w-full justify-start ${pathname === "/admin/dashboard" ? "" : "hover:bg-muted"}`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <Link href="/admin/users" onClick={() => setMobileMenuOpen(false)}>
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
  )

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Mobile Header with Menu Button */}
      <div className="lg:hidden sticky top-0 z-40 bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden lg:block w-64 bg-card border-r border-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
