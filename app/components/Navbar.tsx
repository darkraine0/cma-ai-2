"use client"

import Link from "next/link";
import Image from "next/image";
import { Fragment, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { cn } from "@/app/utils/utils";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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

  if (publicRoutes.includes(pathname)) {
    return null;
  }

  if (user?.status === "pending") {
    return null;
  }

  return (
    <Fragment>
      <div className="bg-card border-b border-border shadow-card sticky top-0 z-50">
        <nav className="container mx-auto py-3 px-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Logo - Always visible */}
            <Link href="/" className="flex items-center gap-2 md:gap-3 text-lg md:text-2xl font-bold text-foreground tracking-tight select-none cursor-pointer">
              <Image 
                src="/logo2.png" 
                alt="MarketMap Homes Logo" 
                width={0}
                height={0}
                sizes="100vw"
                className="h-8 md:h-10 w-auto object-contain"
              />
              <span className="hidden sm:inline">MarketMap Homes</span>
              <span className="sm:hidden">MMH</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex gap-2 items-center">
              {user?.status !== "pending" && (
                <>
                  <Link href="/communities">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "font-semibold",
                        pathname === "/communities" || pathname.startsWith("/community/")
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
                          : "bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground"
                      )}
                    >
                      Communities
                    </Button>
                  </Link>
                  <Link href="/companies">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "font-semibold",
                        pathname === "/companies"
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
                          : "bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground"
                      )}
                    >
                      Companies
                    </Button>
                  </Link>
                  <Link href="/manage">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "font-semibold",
                        pathname === "/manage"
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
                          : "bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground"
                      )}
                    >
                      Manage
                    </Button>
                  </Link>
                </>
              )}
              {user && (
                <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border">
                  {/* Profile Avatar Button */}
                  <Link href="/profile" title="Profile">
                    <div className="flex items-center gap-2 cursor-pointer group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold text-xs shadow-md transition-all group-hover:shadow-lg group-hover:scale-105">
                        {getInitials(user.name || user.email)}
                      </div>
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {user.name || user.email}
                      </span>
                    </div>
                  </Link>
                  {user.role === "admin" && (
                    <Link href="/admin/dashboard">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "font-semibold",
                          pathname?.startsWith("/admin")
                            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
                            : "bg-card text-card-foreground border-border hover:bg-muted hover:text-muted-foreground"
                        )}
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

            {/* Mobile Menu Button + Theme Toggle */}
            <div className="flex lg:hidden items-center gap-2">
              <ThemeToggle />
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="flex flex-col h-full">
                    {/* User Profile Section */}
                    {user && (
                      <div className="pb-6 border-b border-border">
                        <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                              {getInitials(user.name || user.email)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {user.name || user.email}
                              </p>
                              <p className="text-xs text-muted-foreground">View Profile</p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    )}

                    {/* Navigation Links */}
                    {user?.status !== "pending" && (
                      <nav className="flex flex-col gap-2 py-6">
                        <Link href="/communities" onClick={() => setMobileMenuOpen(false)}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start text-base font-semibold",
                              (pathname === "/communities" || pathname?.startsWith("/community/")) && "bg-primary/10 text-primary"
                            )}
                          >
                            Communities
                          </Button>
                        </Link>
                        <Link href="/companies" onClick={() => setMobileMenuOpen(false)}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start text-base font-semibold",
                              pathname === "/companies" && "bg-primary/10 text-primary"
                            )}
                          >
                            Companies
                          </Button>
                        </Link>
                        <Link href="/manage" onClick={() => setMobileMenuOpen(false)}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start text-base font-semibold",
                              pathname === "/manage" && "bg-primary/10 text-primary"
                            )}
                          >
                            Manage
                          </Button>
                        </Link>
                        {user?.role === "admin" && (
                          <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start text-base font-semibold",
                                pathname?.startsWith("/admin") && "bg-primary/10 text-primary"
                              )}
                            >
                              Admin Dashboard
                            </Button>
                          </Link>
                        )}
                      </nav>
                    )}

                    {/* Sign Out Button */}
                    {user && (
                      <div className="mt-auto pt-6 border-t border-border">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            handleSignOut();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </div>
    </Fragment>
  );
};

export default Navbar;

