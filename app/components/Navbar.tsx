"use client"

import Link from "next/link";
import Image from "next/image";
import { Fragment, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { LogOut, User as UserIcon } from "lucide-react";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const publicRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

  useEffect(() => {
    if (!publicRoutes.includes(pathname)) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [pathname]);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      // User not authenticated
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/signin");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Don't show navbar on auth pages
  if (publicRoutes.includes(pathname)) {
    return null;
  }

  if (loading) {
    return null;
  }

  // Don't show navbar if user is pending (they'll see a special pending page)
  if (user?.status === "pending") {
    return null;
  }

  return (
    <Fragment>
      <div className="bg-card border-b border-border shadow-card">
        <nav className="container mx-auto py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 text-2xl font-bold text-foreground tracking-tight select-none cursor-pointer">
              <Image 
                src="/logo2.png" 
                alt="MarketMap Homes Logo" 
                width={0}
                height={0}
                sizes="100vw"
                className="h-[2.5em] w-auto object-contain"
              />
              MarketMap Homes
            </Link>
          </div>
          <div className="flex gap-2 items-center">
            {/* Hide Communities, Companies, Manage buttons if user is pending */}
            {user?.status !== "pending" && (
              <>
                <Link href="/communities">
                  <Button
                    variant="outline"
                    className="bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground font-semibold"
                  >
                    Communities
                  </Button>
                </Link>
                <Link href="/companies">
                  <Button 
                    variant="outline"
                    className="bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground font-semibold"
                  >
                    Companies
                  </Button>
                </Link>
                <Link href="/manage">
                  <Button 
                    variant="outline"
                    className="bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground font-semibold"
                  >
                    Manage
                  </Button>
                </Link>
              </>
            )}
            {user && (
              <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.name || user.email}
                </span>
                {/* Profile button */}
                <Link href="/profile">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted"
                    title="Profile"
                  >
                    <UserIcon className="w-4 h-4" />
                  </Button>
                </Link>
                {/* Show Admin button only for admin users */}
                {user.role === "admin" && (
                  <Link href="/admin/dashboard">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground font-semibold"
                    >
                      Admin
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="hover:bg-muted"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </Fragment>
  );
};

export default Navbar;

